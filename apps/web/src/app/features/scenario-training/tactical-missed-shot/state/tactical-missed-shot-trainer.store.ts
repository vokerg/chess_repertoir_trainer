import { Injectable, OnDestroy, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Chess } from 'chess.js';
import { firstValueFrom } from 'rxjs';
import { TrainerEngineResult, TrainerEngineService } from '../../shared/trainer-engine.service';
import { ScenarioTrainingApiService } from '../data-access/scenario-training-api.service';
import {
  ScenarioMode,
  ScenarioTrainingAttempt,
  ScenarioTrainingSession,
} from '../data-access/scenario-training.models';

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

const INTRO_REPLAY_MS = 650;

@Injectable()
export class TacticalMissedShotTrainerStore implements OnDestroy {
  private readonly api = inject(ScenarioTrainingApiService);
  private readonly engine = inject(TrainerEngineService);
  private readonly router = inject(Router);

  readonly session = signal<ScenarioTrainingSession | null>(null);
  readonly mode = signal<ScenarioMode>('context');
  readonly selectedContextPly = signal<number | null>(null);
  readonly loading = signal(false);
  readonly evaluating = signal(false);
  readonly completing = signal(false);
  readonly error = signal<string | null>(null);
  readonly baselineAnalysis = signal<TrainerEngineResult | null>(null);
  readonly attemptedMoveFen = signal<string | null>(null);
  readonly boardPositionVersion = signal(0);
  readonly revealBestMove = signal(false);
  readonly revealOriginalReply = signal(false);
  private introTimer: ReturnType<typeof setTimeout> | null = null;

  readonly attempts = computed(() => this.session()?.attempts ?? []);
  readonly latestAttempt = computed<ScenarioTrainingAttempt | null>(() => this.attempts().at(-1) ?? null);
  readonly boardDisabled = computed(() => this.loading() || this.evaluating() || this.mode() !== 'challenge');
  readonly currentFen = computed(() => {
    const session = this.session();
    if (!session) return 'startpos';
    if (this.mode() === 'intro') return session.previousFen ?? session.startFen;
    if (this.mode() === 'challenge') return session.startFen;
    if (this.mode() === 'result') return this.attemptedMoveFen() ?? this.latestAttempt()?.fenAfter ?? session.startFen;
    const selected = this.selectedContextPly();
    if (selected === null) return session.contextPlies[0]?.fenBefore ?? session.previousFen ?? session.startFen;
    return session.contextPlies.find((ply) => ply.plyNumber === selected)?.fenAfter ?? session.startFen;
  });
  readonly lastMove = computed(() => {
    const session = this.session();
    if (!session) return null;
    if (this.mode() === 'intro') return null;
    if (this.mode() === 'result') return lastMoveFromUci(this.latestAttempt()?.playedMoveUci);
    if (this.mode() === 'challenge') return lastMoveFromUci(session.triggerMoveUci);
    const selected = this.selectedContextPly();
    if (selected === null) return null;
    return lastMoveFromUci(session.contextPlies.find((ply) => ply.plyNumber === selected)?.moveUci);
  });

  async startRandom(): Promise<void> {
    await this.start({});
  }

  ngOnDestroy(): void {
    this.clearIntroTimer();
  }

  async startFromDetection(detectionId: number): Promise<void> {
    await this.start({ detectionId, random: false });
  }

  async loadSession(sessionId: number): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.setSession(await firstValueFrom(this.api.getSession(sessionId)), { animateIntro: true });
    } catch {
      this.error.set('Could not load scenario.');
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
      const baseline = this.baselineAnalysis() ?? await this.analyzeBaseline(session);
      const after = await this.engine.analyze(fenAfter);
      const result = await firstValueFrom(this.api.submitAttempt(session.sessionId, {
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
      }));
      this.session.set(result.session);
      this.mode.set('result');
      this.bumpBoardPosition();
    } catch {
      this.error.set('Could not evaluate or save that attempt.');
      this.mode.set('challenge');
    } finally {
      this.evaluating.set(false);
    }
  }

  tryAgain(): void {
    this.revealBestMove.set(false);
    this.revealOriginalReply.set(false);
    this.goChallenge();
  }

  async nextScenario(): Promise<void> {
    const excludeDetectionId = this.session()?.sourceId;
    await this.start(excludeDetectionId ? { excludeDetectionId } : {});
  }

  async complete(): Promise<void> {
    const sessionId = this.session()?.sessionId;
    if (!sessionId) return;
    this.completing.set(true);
    try {
      this.session.set(await firstValueFrom(this.api.complete(sessionId)));
    } catch {
      this.error.set('Could not finish this scenario.');
    } finally {
      this.completing.set(false);
    }
  }

  toggleBestMove(): void {
    this.revealBestMove.update((value) => !value);
  }

  toggleOriginalReply(): void {
    this.revealOriginalReply.update((value) => !value);
  }

  handleKeyboard(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    const tag = target?.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable) {
      return;
    }

    const commands: Record<string, () => void> = {
      ArrowLeft: () => this.goPrevious(),
      ArrowRight: () => this.goNext(),
      Home: () => this.goStart(),
      End: () => this.goChallenge(),
    };
    const command = commands[event.key];
    if (!command) return;
    event.preventDefault();
    command();
  }

  private async start(request: { detectionId?: number; excludeDetectionId?: number; random?: boolean }): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const session = await firstValueFrom(this.api.startTacticalMissedShot({
        ...request,
        random: request.random ?? true,
        excludePassedRecently: true,
      }));
      this.setSession(session, { animateIntro: true });
      await this.router.navigate(['/scenario-training/tactical-missed-shot', session.sessionId], { replaceUrl: true });
    } catch {
      this.error.set('Could not start a missed-shot scenario.');
    } finally {
      this.loading.set(false);
    }
  }

  private setSession(session: ScenarioTrainingSession, options: { animateIntro?: boolean } = {}): void {
    this.clearIntroTimer();
    this.session.set(session);
    this.mode.set(session.status === 'IN_PROGRESS' ? 'challenge' : 'result');
    this.selectedContextPly.set(session.challengePlyNumber - 1);
    this.attemptedMoveFen.set(session.attempts.at(-1)?.fenAfter ?? null);
    this.revealBestMove.set(false);
    this.revealOriginalReply.set(false);
    this.bumpBoardPosition();
    if (options.animateIntro && session.status === 'IN_PROGRESS') {
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
    this.mode.set('challenge');
    this.selectedContextPly.set(this.session()?.challengePlyNumber ? this.session()!.challengePlyNumber - 1 : null);
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

  private async analyzeBaseline(session: ScenarioTrainingSession): Promise<TrainerEngineResult> {
    const existing = this.baselineAnalysis();
    if (existing?.raw.fen === session.startFen) return existing;
    const result = await this.engine.analyze(session.startFen);
    if (this.session()?.sessionId === session.sessionId) this.baselineAnalysis.set(result);
    return result;
  }
}
