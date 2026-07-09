import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, OnDestroy, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Chess } from 'chess.js';
import { firstValueFrom } from 'rxjs';
import {
  AnalysisTree,
  AnalysisTreeNodeData,
} from '../../../../shared/analysis/workbench/analysis-tree.models';
import { PositionAnalysisCacheService } from '../../../../shared/chess/engine/position-analysis-cache.service';
import { EngineAnalysis } from '../../../../shared/chess/engine/stockfish-analysis.service';
import { TrainerEngineResult, TrainerEngineService } from '../../shared/trainer-engine.service';
import { ScenarioTrainingApiService } from '../data-access/scenario-training-api.service';
import {
  ScenarioContextPly,
  ScenarioMode,
  ScenarioTrainingAttempt,
  ScenarioTrainingSession,
} from '../data-access/scenario-training.models';
import {
  TacticalScenarioTrainerConfig,
  tacticalScenarioTrainerConfig,
} from '../helpers/tactical-scenario-trainer.config';

function lastMoveFromUci(moveUci: string | null | undefined): { from: string; to: string } | null {
  if (!moveUci || moveUci.length < 4) return null;
  return { from: moveUci.slice(0, 2), to: moveUci.slice(2, 4) };
}

function applyUci(fen: string, moveUci: string): string {
  const chess = new Chess(fen);
  const move = chess.move({
    from: moveUci.slice(0, 2),
    to: moveUci.slice(2, 4),
    promotion: moveUci.slice(4, 5) || undefined,
  });
  if (!move) throw new Error('Illegal move');
  return chess.fen();
}

type ScenarioAnalysisNodeData = AnalysisTreeNodeData & {
  fenBefore: string;
  fenAfter: string;
};

interface ScenarioAnalysisTreeNode {
  node: ScenarioAnalysisNodeData;
  children: ScenarioAnalysisTreeNode[];
}

interface ScenarioAnalysisTree {
  root: ScenarioAnalysisTreeNode;
}

interface StoredEngineLineLike {
  pv?: unknown;
  pvUci?: unknown;
  moveUci?: unknown;
}

interface StoredEngineAnalysisLike {
  bestMove?: unknown;
  lines?: unknown;
}

interface StoredAttemptEngineJsonLike {
  baseline?: StoredEngineAnalysisLike | null;
  after?: StoredEngineAnalysisLike | null;
}

const EMPTY_ENGINE_ANALYSIS: EngineAnalysis = {
  fen: '',
  running: false,
  ready: false,
  error: null,
  bestMove: null,
  lines: [],
};

const INTRO_REPLAY_MS = 650;

@Injectable()
export class TacticalScenarioTrainerStore implements OnDestroy {
  private readonly api = inject(ScenarioTrainingApiService);
  private readonly engine = inject(TrainerEngineService);
  private readonly positionAnalysis = inject(PositionAnalysisCacheService);
  private readonly router = inject(Router);

  readonly config = signal<TacticalScenarioTrainerConfig>(
    tacticalScenarioTrainerConfig('missed-shot'),
  );
  readonly session = signal<ScenarioTrainingSession | null>(null);
  readonly mode = signal<ScenarioMode>('context');
  readonly selectedContextPly = signal<number | null>(null);
  readonly loading = signal(false);
  readonly evaluating = signal(false);
  readonly completing = signal(false);
  readonly disliking = signal(false);
  readonly error = signal<string | null>(null);
  readonly baselineAnalysis = signal<TrainerEngineResult | null>(null);
  readonly attemptedMoveFen = signal<string | null>(null);
  readonly boardPositionVersion = signal(0);
  readonly revealBestMove = signal(false);
  readonly revealOriginalMove = signal(false);
  private readonly localAnalysisTree = signal<ScenarioAnalysisTree | null>(null);
  readonly analysisTree = computed<AnalysisTree | null>(() => this.localAnalysisTree());
  readonly selectedAnalysisNodeId = signal<number | null>(null);
  readonly analysisBoardPositionVersion = signal(0);
  readonly nextAnalysisNodeId = signal(2);
  readonly engineAnalysis = toSignal(this.positionAnalysis.state$, {
    initialValue: EMPTY_ENGINE_ANALYSIS,
  });
  private readonly analysisTimer = signal<ReturnType<typeof setTimeout> | null>(null);
  private introTimer: ReturnType<typeof setTimeout> | null = null;

  readonly attempts = computed(() => this.session()?.attempts ?? []);
  readonly loadingMessage = computed(() =>
    this.session() ? this.config().loadingNextScenario : this.config().loadingScenario,
  );
  readonly latestAttempt = computed<ScenarioTrainingAttempt | null>(
    () => this.attempts().at(-1) ?? null,
  );
  readonly canDislikeScenario = computed(() =>
    Boolean(this.session() && this.attempts().length > 0),
  );
  readonly boardDisabled = computed(
    () => this.loading() || this.evaluating() || this.disliking() || this.mode() !== 'challenge',
  );
  readonly currentFen = computed(() => {
    const session = this.session();
    if (!session) return 'startpos';
    if (this.mode() === 'intro') return session.previousFen ?? session.startFen;
    if (this.mode() === 'challenge') return session.startFen;
    if (this.mode() === 'result' || this.mode() === 'analysis') {
      return this.attemptedMoveFen() ?? this.latestAttempt()?.fenAfter ?? session.startFen;
    }
    const selected = this.selectedContextPly();
    if (selected === null)
      return session.contextPlies[0]?.fenBefore ?? session.previousFen ?? session.startFen;
    return (
      session.contextPlies.find((ply) => ply.plyNumber === selected)?.fenAfter ?? session.startFen
    );
  });
  readonly lastMove = computed(() => {
    const session = this.session();
    if (!session) return null;
    if (this.mode() === 'intro') return null;
    if (this.mode() === 'result' || this.mode() === 'analysis')
      return lastMoveFromUci(this.latestAttempt()?.playedMoveUci);
    if (this.mode() === 'challenge') return lastMoveFromUci(session.triggerMoveUci);
    const selected = this.selectedContextPly();
    if (selected === null) return null;
    return lastMoveFromUci(session.contextPlies.find((ply) => ply.plyNumber === selected)?.moveUci);
  });
  readonly selectedAnalysisNode = computed(() =>
    findAnalysisNode(this.selectedAnalysisNodeId(), this.localAnalysisTree()?.root),
  );
  readonly currentAnalysisFen = computed(
    () =>
      this.selectedAnalysisNode()?.node.fenAfter ?? this.session()?.startFen ?? new Chess().fen(),
  );
  readonly analysisLastMove = computed(() =>
    lastMoveFromUci(this.selectedAnalysisNode()?.node.moveUci),
  );
  readonly analysisCanGoBackward = computed(
    () => this.selectedAnalysisNodeId() !== null && this.selectedAnalysisNodeId() !== 0,
  );
  readonly analysisCanGoForward = computed(() =>
    Boolean(this.selectedAnalysisNode()?.children.length),
  );
  readonly analysisEngineAnalysis = computed(() => this.engineAnalysis());
  readonly blackPerspective = computed(() => this.session()?.userColor === 'BLACK');

  configure(config: TacticalScenarioTrainerConfig): void {
    this.config.set(config);
  }

  async startRandom(): Promise<void> {
    await this.start({});
  }

  ngOnDestroy(): void {
    this.clearIntroTimer();
    this.clearAnalysisState();
  }

  async startFromDetection(detectionId: number): Promise<void> {
    await this.start({ detectionId, random: false });
  }

  async loadSession(sessionId: number): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.setSession(await firstValueFrom(this.api.getSession(sessionId)), { animateIntro: true });
    } catch (error) {
      this.error.set(this.errorMessage(error, 'Could not load scenario.'));
    } finally {
      this.loading.set(false);
    }
  }

  goStart(): void {
    this.clearIntroTimer();
    this.mode.set('context');
    this.selectedContextPly.set(null);
    this.bumpBoardPosition();
  }

  goPrevious(): void {
    const plies = this.session()?.contextPlies ?? [];
    this.clearIntroTimer();
    this.mode.set('context');
    const selected = this.selectedContextPly();
    if (selected === null) return;
    const index = plies.findIndex((ply) => ply.plyNumber === selected);
    this.selectedContextPly.set(index <= 0 ? null : plies[index - 1].plyNumber);
    this.bumpBoardPosition();
  }

  goNext(): void {
    const plies = this.session()?.contextPlies ?? [];
    this.clearIntroTimer();
    if (this.mode() !== 'context') return;
    this.mode.set('context');
    const selected = this.selectedContextPly();
    if (selected === null) {
      const firstPly = plies[0]?.plyNumber ?? null;
      if (firstPly !== null && this.isChallengePly(firstPly)) {
        this.enterChallenge();
        return;
      }
      this.selectedContextPly.set(firstPly);
      this.bumpBoardPosition();
      return;
    }
    const index = plies.findIndex((ply) => ply.plyNumber === selected);
    if (index >= 0 && index < plies.length - 2) {
      this.selectedContextPly.set(plies[index + 1].plyNumber);
    } else if (index >= 0) {
      this.enterChallenge();
      return;
    }
    this.bumpBoardPosition();
  }

  goChallenge(): void {
    this.clearIntroTimer();
    this.enterChallenge();
  }

  selectContextPly(plyNumber: number): void {
    this.clearIntroTimer();
    if (this.isChallengePly(plyNumber)) {
      this.enterChallenge();
      return;
    }
    this.mode.set('context');
    this.selectedContextPly.set(plyNumber);
    this.bumpBoardPosition();
  }

  replayOpponentMove(): void {
    this.startIntroReplay();
  }

  async playBoardMove(moveUci: string): Promise<void> {
    const session = this.session();
    if (!session || this.evaluating() || this.mode() !== 'challenge') return;
    this.evaluating.set(true);
    this.error.set(null);
    try {
      const fenAfter = applyUci(session.startFen, moveUci);
      this.attemptedMoveFen.set(fenAfter);
      const baseline = this.baselineAnalysis() ?? (await this.analyzeBaseline(session));
      const after = await this.engine.analyze(fenAfter);
      const result = await firstValueFrom(
        this.api.submitAttempt(session.sessionId, {
          moveUci,
          fenAfter,
          engineSource: 'CLIENT_STOCKFISH',
          engineName: after.engineName,
          engineDepth: after.depth,
          engineMultipv: after.multipv,
          baselineScoreCpWhite: baseline.scoreCpWhite,
          baselineMateWhite: baseline.mateWhite,
          afterScoreCpWhite: after.scoreCpWhite,
          afterMateWhite: after.mateWhite,
          rawEngineJson: { baseline: baseline.raw, after: after.raw },
        }),
      );
      this.session.set(result.session);
      const attempt = result.session.attempts.at(-1) ?? null;
      if (result.passed && attempt) {
        this.initializeAnalysisTree(result.session, attempt);
        this.mode.set('analysis');
        this.schedulePostPassAnalysis();
      } else {
        this.clearAnalysisState();
        this.mode.set('result');
      }
      this.bumpBoardPosition();
    } catch (error) {
      this.error.set(this.errorMessage(error, 'Could not evaluate or save that attempt.'));
      this.mode.set('challenge');
    } finally {
      this.evaluating.set(false);
    }
  }

  tryAgain(): void {
    this.clearAnalysisState();
    this.revealBestMove.set(false);
    this.revealOriginalMove.set(false);
    this.goChallenge();
  }

  async nextScenario(): Promise<void> {
    if (this.loading()) return;
    this.clearAnalysisState();
    const excludeDetectionId = this.session()?.sourceId;
    await this.start(excludeDetectionId ? { excludeDetectionId } : {});
  }

  async complete(): Promise<void> {
    const sessionId = this.session()?.sessionId;
    if (!sessionId) return;
    this.completing.set(true);
    try {
      this.session.set(await firstValueFrom(this.api.complete(sessionId)));
    } catch (error) {
      this.error.set(this.errorMessage(error, 'Could not finish this scenario.'));
    } finally {
      this.completing.set(false);
    }
  }

  async dislikeCurrentScenario(): Promise<void> {
    const session = this.session();
    if (
      !session ||
      !session.attempts.length ||
      this.loading() ||
      this.evaluating() ||
      this.disliking()
    )
      return;
    this.disliking.set(true);
    this.error.set(null);
    try {
      await firstValueFrom(this.api.dislike(session.sessionId));
      await this.nextScenario();
    } catch (error) {
      this.error.set(this.errorMessage(error, this.config().excludeError));
    } finally {
      this.disliking.set(false);
    }
  }

  toggleBestMove(): void {
    this.revealBestMove.update((value) => !value);
  }

  toggleOriginalMove(): void {
    this.revealOriginalMove.update((value) => !value);
  }

  handleKeyboard(event: KeyboardEvent): void {
    if (this.loading()) return;
    const target = event.target as HTMLElement | null;
    const tag = target?.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable) {
      return;
    }

    const commands: Record<string, () => void> = {
      ArrowLeft: () => (this.mode() === 'analysis' ? this.goAnalysisPrevious() : this.goPrevious()),
      ArrowRight: () => (this.mode() === 'analysis' ? this.goAnalysisNext() : this.goNext()),
      Home: () => (this.mode() === 'analysis' ? this.goAnalysisStart() : this.goStart()),
      End: () => (this.mode() === 'analysis' ? this.goAnalysisEnd() : this.goChallenge()),
    };
    const command = commands[event.key];
    if (!command) return;
    event.preventDefault();
    command();
  }

  playAnalysisBoardMove(uci: string): void {
    if (this.mode() !== 'analysis') return;
    const selected = this.selectedAnalysisNode();
    const tree = this.localAnalysisTree();
    if (!selected || !tree) return;

    const existing = selected.children.find((child) => child.node.moveUci === uci);
    if (existing) {
      this.selectAnalysisNode(existing.node.id);
      return;
    }

    try {
      const chess = new Chess(this.currentAnalysisFen());
      const beforeFen = chess.fen();
      const side = chess.turn() === 'b' ? 'BLACK' : 'WHITE';
      const move = chess.move({
        from: uci.substring(0, 2),
        to: uci.substring(2, 4),
        promotion: uci.substring(4, 5) || undefined,
      });
      if (!move) {
        this.bumpAnalysisBoardPosition();
        return;
      }

      const child: ScenarioAnalysisTreeNode = {
        node: {
          id: this.nextAnalysisNodeId(),
          moveNumber: Number(beforeFen.split(' ')[5]) || 1,
          side,
          moveSan: move.san,
          moveUci: uci,
          fenBefore: beforeFen,
          fenAfter: chess.fen(),
          isUserMove: side === this.session()?.userColor,
          moveMeta: 'Local analysis',
          classification: null,
          evalCpWhite: null,
        },
        children: [],
      };
      this.nextAnalysisNodeId.update((id) => id + 1);
      this.localAnalysisTree.set({ root: appendAnalysisChild(tree.root, selected.node.id, child) });
      this.selectAnalysisNode(child.node.id);
    } catch {
      this.bumpAnalysisBoardPosition();
    }
  }

  selectAnalysisNode(nodeId: number): void {
    if (this.mode() !== 'analysis') return;
    if (!findAnalysisNode(nodeId, this.localAnalysisTree()?.root)) return;
    this.selectedAnalysisNodeId.set(nodeId);
    this.schedulePostPassAnalysis();
  }

  goAnalysisStart(): void {
    if (this.mode() !== 'analysis') return;
    this.selectAnalysisNode(0);
  }

  goAnalysisPrevious(): void {
    if (this.mode() !== 'analysis') return;
    const parent = findAnalysisParent(
      this.selectedAnalysisNodeId(),
      this.localAnalysisTree()?.root,
    );
    if (parent) this.selectAnalysisNode(parent.node.id);
  }

  goAnalysisNext(): void {
    if (this.mode() !== 'analysis') return;
    const next = this.selectedAnalysisNode()?.children[0];
    if (next) this.selectAnalysisNode(next.node.id);
  }

  goAnalysisEnd(): void {
    if (this.mode() !== 'analysis') return;
    let node = this.selectedAnalysisNode();
    while (node?.children.length) node = node.children[0];
    if (node) this.selectAnalysisNode(node.node.id);
  }

  rerunPostPassAnalysis(): void {
    if (this.mode() !== 'analysis') return;
    this.positionAnalysis.analyzeInteractiveRichPosition(this.currentAnalysisFen());
  }

  private async start(request: {
    detectionId?: number;
    excludeDetectionId?: number;
    random?: boolean;
  }): Promise<void> {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set(null);
    try {
      const config = this.config();
      const session = await firstValueFrom(
        config.start(this.api, {
          ...request,
          random: request.random ?? true,
          excludePassedRecently: true,
        }),
      );
      this.setSession(session, { animateIntro: true });
      await this.router.navigate([config.routeBase, session.sessionId], { replaceUrl: true });
    } catch (error) {
      this.error.set(this.errorMessage(error, this.config().startError));
    } finally {
      this.loading.set(false);
    }
  }

  private setSession(
    session: ScenarioTrainingSession,
    options: { animateIntro?: boolean } = {},
  ): void {
    this.clearIntroTimer();
    this.clearAnalysisState();
    this.session.set(session);
    const latestAttempt = session.attempts.at(-1) ?? null;
    if (latestAttempt?.passed) {
      this.initializeAnalysisTree(session, latestAttempt);
      this.mode.set('analysis');
      this.schedulePostPassAnalysis();
    } else {
      this.mode.set(session.status === 'IN_PROGRESS' ? 'challenge' : 'result');
    }
    this.selectedContextPly.set(session.challengePlyNumber - 1);
    this.attemptedMoveFen.set(latestAttempt?.fenAfter ?? null);
    this.revealBestMove.set(false);
    this.revealOriginalMove.set(false);
    this.bumpBoardPosition();
    if (options.animateIntro && session.status === 'IN_PROGRESS' && !latestAttempt) {
      this.startIntroReplay();
    }
    void this.analyzeBaseline(session);
  }

  private startIntroReplay(): void {
    const session = this.session();
    if (!session || session.status !== 'IN_PROGRESS') return;
    this.clearIntroTimer();
    this.mode.set('intro');
    this.selectedContextPly.set(null);
    this.attemptedMoveFen.set(null);
    this.bumpBoardPosition();
    this.introTimer = setTimeout(() => {
      this.introTimer = null;
      this.enterChallenge();
    }, INTRO_REPLAY_MS);
  }

  private enterChallenge(): void {
    this.clearAnalysisState();
    this.mode.set('challenge');
    this.selectedContextPly.set(
      this.session()?.challengePlyNumber ? this.session()!.challengePlyNumber - 1 : null,
    );
    this.attemptedMoveFen.set(null);
    this.bumpBoardPosition();
  }

  private isChallengePly(plyNumber: number): boolean {
    return plyNumber === (this.session()?.challengePlyNumber ?? 0) - 1;
  }

  private bumpBoardPosition(): void {
    this.boardPositionVersion.update((version) => version + 1);
  }

  private clearIntroTimer(): void {
    if (!this.introTimer) return;
    clearTimeout(this.introTimer);
    this.introTimer = null;
  }

  private initializeAnalysisTree(
    session: ScenarioTrainingSession,
    attempt: ScenarioTrainingAttempt,
  ): void {
    this.clearAnalysisTimer();
    const tree = buildInitialAnalysisTree(session, attempt);
    this.localAnalysisTree.set({ root: tree.root });
    this.selectedAnalysisNodeId.set(tree.selectedNodeId);
    this.nextAnalysisNodeId.set(tree.nextNodeId);
    this.bumpAnalysisBoardPosition();
  }

  private schedulePostPassAnalysis(): void {
    this.clearAnalysisTimer();
    const timer = setTimeout(() => {
      this.analysisTimer.set(null);
      this.rerunPostPassAnalysis();
    }, 250);
    this.analysisTimer.set(timer);
  }

  private clearAnalysisState(): void {
    this.clearAnalysisTimer();
    this.localAnalysisTree.set(null);
    this.selectedAnalysisNodeId.set(null);
    this.nextAnalysisNodeId.set(2);
    this.positionAnalysis.stop();
  }

  private clearAnalysisTimer(): void {
    const timer = this.analysisTimer();
    if (!timer) return;
    clearTimeout(timer);
    this.analysisTimer.set(null);
  }

  private bumpAnalysisBoardPosition(): void {
    this.analysisBoardPositionVersion.update((version) => version + 1);
  }

  private errorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      const detail = typeof error.error?.error === 'string' ? error.error.error : error.message;
      return detail ? `${fallback} ${detail}` : fallback;
    }
    return fallback;
  }

  private async analyzeBaseline(session: ScenarioTrainingSession): Promise<TrainerEngineResult> {
    const existing = this.baselineAnalysis();
    if (existing?.raw.fen === session.startFen) return existing;
    const result = await this.engine.analyze(session.startFen);
    if (this.session()?.sessionId === session.sessionId) this.baselineAnalysis.set(result);
    return result;
  }
}

function findAnalysisNode(
  id: number | null | undefined,
  node?: ScenarioAnalysisTreeNode | null,
): ScenarioAnalysisTreeNode | null {
  if (id === null || id === undefined || !node) return null;
  if (node.node.id === id) return node;
  for (const child of node.children) {
    const found = findAnalysisNode(id, child);
    if (found) return found;
  }
  return null;
}

function findAnalysisParent(
  id: number | null | undefined,
  node?: ScenarioAnalysisTreeNode | null,
  parent: ScenarioAnalysisTreeNode | null = null,
): ScenarioAnalysisTreeNode | null {
  if (id === null || id === undefined || !node) return null;
  if (node.node.id === id) return parent;
  for (const child of node.children) {
    const found = findAnalysisParent(id, child, node);
    if (found) return found;
  }
  return null;
}

function appendAnalysisChild(
  root: ScenarioAnalysisTreeNode,
  parentId: number,
  child: ScenarioAnalysisTreeNode,
): ScenarioAnalysisTreeNode {
  if (root.node.id === parentId) return { ...root, children: [...root.children, child] };
  return {
    ...root,
    children: root.children.map((current) => appendAnalysisChild(current, parentId, child)),
  };
}

function buildInitialAnalysisTree(
  session: ScenarioTrainingSession,
  attempt: ScenarioTrainingAttempt,
): { root: ScenarioAnalysisTreeNode; selectedNodeId: number; nextNodeId: number } {
  let nextNodeId = 1;
  const rootFen = session.contextPlies[0]?.fenBefore ?? session.previousFen ?? session.startFen;
  const root: ScenarioAnalysisTreeNode = {
    node: {
      id: 0,
      moveSan: null,
      moveUci: null,
      fenBefore: rootFen,
      fenAfter: rootFen,
      isUserMove: false,
      moveNumber: null,
      side: null,
      moveMeta: null,
      classification: null,
      evalCpWhite: null,
    },
    children: [],
  };

  let challengeParent = root;
  for (const ply of session.contextPlies) {
    const contextNode = analysisNodeFromContextPly(ply, nextNodeId++);
    challengeParent.children.push(contextNode);
    challengeParent = contextNode;
  }

  const passedNodeId = nextNodeId++;
  const continuation = buildAnalysisContinuation(attempt, session.userColor, nextNodeId);
  nextNodeId = continuation.nextNodeId;
  challengeParent.children.push(
    trainingAttemptNode(session, attempt, passedNodeId, continuation.nodes),
  );

  const originalMove = originalGameMoveNode(session, nextNodeId);
  if (originalMove && originalMove.node.moveUci !== attempt.playedMoveUci) {
    challengeParent.children.push(originalMove);
    nextNodeId += 1;
  }

  return { root, selectedNodeId: passedNodeId, nextNodeId };
}

function analysisNodeFromContextPly(ply: ScenarioContextPly, id: number): ScenarioAnalysisTreeNode {
  return {
    node: {
      id,
      moveSan: ply.moveSan,
      moveUci: ply.moveUci,
      fenBefore: ply.fenBefore,
      fenAfter: ply.fenAfter,
      isUserMove: ply.isUserMove,
      moveNumber: ply.moveNumber,
      side: sideFromFen(ply.fenBefore),
      moveMeta: 'Game',
      classification: null,
      evalCpWhite: null,
    },
    children: [],
  };
}

function trainingAttemptNode(
  session: ScenarioTrainingSession,
  attempt: ScenarioTrainingAttempt,
  id: number,
  children: ScenarioAnalysisTreeNode[],
): ScenarioAnalysisTreeNode {
  const side = sideFromFen(attempt.fenBefore);
  return {
    node: {
      id,
      moveSan: attempt.playedMoveSan,
      moveUci: attempt.playedMoveUci,
      fenBefore: attempt.fenBefore,
      fenAfter: attempt.fenAfter,
      isUserMove: side === session.userColor,
      moveNumber: Number(attempt.fenBefore.split(' ')[5]) || 1,
      side,
      moveMeta: 'Training move',
      classification: attempt.passed ? 'Passed' : 'Good enough',
      evalCpWhite: attempt.afterUserEvalCp,
    },
    children,
  };
}

function originalGameMoveNode(
  session: ScenarioTrainingSession,
  id: number,
): ScenarioAnalysisTreeNode | null {
  if (!session.originalUserMoveUci) return null;
  const chess = new Chess(session.startFen);
  const side = sideFromFen(chess.fen());
  const move = chess.move({
    from: session.originalUserMoveUci.slice(0, 2),
    to: session.originalUserMoveUci.slice(2, 4),
    promotion: session.originalUserMoveUci.slice(4, 5) || undefined,
  });
  if (!move) return null;
  return {
    node: {
      id,
      moveNumber: Number(session.startFen.split(' ')[5]) || 1,
      side,
      moveSan: session.originalUserMoveSan ?? move.san,
      moveUci: session.originalUserMoveUci,
      fenBefore: session.startFen,
      fenAfter: chess.fen(),
      isUserMove: side === session.userColor,
      moveMeta: 'Game move',
      classification: null,
      evalCpWhite: null,
    },
    children: [],
  };
}

function sideFromFen(fen: string): 'WHITE' | 'BLACK' {
  return fen.split(/\s+/)[1] === 'b' ? 'BLACK' : 'WHITE';
}

function buildAnalysisContinuation(
  attempt: ScenarioTrainingAttempt,
  userColor: ScenarioTrainingSession['userColor'],
  startNodeId: number,
): { nodes: ScenarioAnalysisTreeNode[]; nextNodeId: number } {
  const pv = continuationPvForAttempt(attempt);
  const chess = new Chess(attempt.fenAfter);
  let nextNodeId = startNodeId;
  let children: ScenarioAnalysisTreeNode[] = [];
  let cursor = children;

  for (const moveUci of pv) {
    const beforeFen = chess.fen();
    const side = sideFromFen(beforeFen);
    const move = chess.move({
      from: moveUci.slice(0, 2),
      to: moveUci.slice(2, 4),
      promotion: moveUci.slice(4, 5) || undefined,
    });
    if (!move) break;

    const node: ScenarioAnalysisTreeNode = {
      node: {
        id: nextNodeId++,
        moveNumber: Number(beforeFen.split(' ')[5]) || 1,
        side,
        moveSan: move.san,
        moveUci,
        fenBefore: beforeFen,
        fenAfter: chess.fen(),
        isUserMove: side === userColor,
        moveMeta: 'Engine line',
        classification: null,
        evalCpWhite: null,
      },
      children: [],
    };
    cursor.push(node);
    cursor = node.children;
  }

  return { nodes: children, nextNodeId };
}

function continuationPvForAttempt(attempt: ScenarioTrainingAttempt): string[] {
  const raw = attempt.rawEngineJson as StoredAttemptEngineJsonLike | null | undefined;
  const afterPv = firstEnginePv(raw?.after);
  if (afterPv.length) return afterPv;

  const baselinePv = firstEnginePv(raw?.baseline);
  if (baselinePv[0] === attempt.playedMoveUci) return baselinePv.slice(1);
  return [];
}

function firstEnginePv(analysis: StoredEngineAnalysisLike | null | undefined): string[] {
  const lines = Array.isArray(analysis?.lines) ? analysis.lines : [];
  for (const line of lines) {
    const pv = engineLinePv(line);
    if (pv.length) return pv;
  }
  return typeof analysis?.bestMove === 'string' ? [analysis.bestMove] : [];
}

function engineLinePv(line: unknown): string[] {
  const candidate = line as StoredEngineLineLike | null;
  const pv = Array.isArray(candidate?.pv)
    ? candidate.pv
    : Array.isArray(candidate?.pvUci)
      ? candidate.pvUci
      : [];
  const moves = pv.filter((move): move is string => typeof move === 'string' && move.length >= 4);
  if (moves.length) return moves;
  return typeof candidate?.moveUci === 'string' ? [candidate.moveUci] : [];
}
