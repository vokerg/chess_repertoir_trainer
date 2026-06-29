import { computed, inject, Injectable, OnDestroy, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Chess } from 'chess.js';
import { firstValueFrom } from 'rxjs';
import {
  DEFAULT_INTERACTIVE_MULTIPV,
  PositionAnalysisCacheService,
  RICH_INTERACTIVE_CACHE_MIN_DEPTH,
  RICH_INTERACTIVE_ANALYSIS_DEPTH,
} from '../../../shared/chess/engine/position-analysis-cache.service';
import { EngineAnalysis } from '../../../shared/chess/engine/stockfish-analysis.service';
import { ImportedGameAnalysisService } from '../data-access/imported-game-analysis.service';
import { GamesApiService } from '../data-access/games-api.service';
import {
  ImportedGameAnalysisMove,
  ImportedGameAnalysisRun,
  ImportedGameDetail,
  UserColor,
} from '../data-access/games.models';
import { BoardArrow, BoardLastMove, GameTree, GameTreeNode } from '../helpers/game-detail.models';
import { playerLabel } from '../helpers/game-detail-labels';
import {
  appendGameTreeChild,
  attachGameTreeAnalysis,
  buildGameTree,
  findGameTreeNode,
  findGameTreeParent,
  parseGamePgn,
  removeGameTreeSubtree,
} from '../helpers/game-tree.helpers';

const EMPTY_ENGINE_ANALYSIS: EngineAnalysis = {
  fen: '',
  running: false,
  ready: false,
  error: null,
  bestMove: null,
  lines: [],
};

@Injectable()
export class GameDetailStore implements OnDestroy {
  private readonly api = inject(GamesApiService);
  private readonly positionAnalysis = inject(PositionAnalysisCacheService);
  readonly importedGameAnalysis = inject(ImportedGameAnalysisService);

  private readonly gameId = signal<number | null>(null);
  readonly game = signal<ImportedGameDetail | null>(null);
  readonly analysisRun = signal<ImportedGameAnalysisRun | null>(null);
  readonly tree = signal<GameTree | null>(null);
  readonly selectedNodeId = signal(0);
  readonly boardPositionVersion = signal(0);
  readonly loading = signal(true);
  readonly refreshingTags = signal(false);
  readonly fullRefreshing = signal(false);
  readonly error = signal<string | null>(null);
  readonly engineAnalysis = toSignal(this.positionAnalysis.state$, {
    initialValue: EMPTY_ENGINE_ANALYSIS,
  });

  private nextLocalNodeId = 1_000_000;
  private analysisTimer?: ReturnType<typeof setTimeout>;

  readonly selectedNode = computed(() =>
    findGameTreeNode(this.selectedNodeId(), this.tree()?.root),
  );
  readonly currentFen = computed(() => this.selectedNode()?.node.fenAfter || new Chess().fen());
  readonly lastMove = computed<BoardLastMove | null>(() => {
    const move = this.selectedNode()?.node.moveUci;
    return move ? { from: move.substring(0, 2), to: move.substring(2, 4) } : null;
  });
  readonly boardSide = computed<UserColor>(() => this.game()?.userColor || 'WHITE');
  readonly blackPerspective = computed(() => this.boardSide() === 'BLACK');
  readonly canGoBackward = computed(() => this.selectedNodeId() !== 0);
  readonly canGoForward = computed(() => Boolean(this.selectedNode()?.children.length));
  readonly canDeleteSelectedSubtree = computed(() => {
    const node = this.selectedNode();
    return Boolean(node && node.node.id !== 0 && node.node.source === 'LOCAL');
  });
  readonly deleteConfirmationText = computed(() => {
    const node = this.selectedNode();
    if (!node || node.node.id === 0) return null;
    if (node.node.source !== 'LOCAL') {
      return 'Imported game moves cannot be deleted. Select a local variation instead.';
    }
    const label = node.node.moveSan || node.node.moveUci || 'this move';
    return `Delete ${label} and every local continuation below it?`;
  });
  readonly savedScoreCpWhite = computed(() => {
    const score = this.selectedNode()?.node.analysisMove?.playedScoreCpWhite;
    return typeof score === 'number' ? score : null;
  });
  readonly analysisArrows = computed<BoardArrow[]>(() => {
    const analysis = this.engineAnalysis();
    const move = analysis.bestMove;
    if (!move || analysis.fen !== this.currentFen() || move === '(none)') return [];
    return [{ from: move.substring(0, 2), to: move.substring(2, 4), brush: 'green' }];
  });
  readonly gameTitle = computed(() => {
    const game = this.game();
    return game ? `${playerLabel(game.white)} vs ${playerLabel(game.black)}` : 'Imported game';
  });
  readonly selectedLabel = computed(() => {
    const selected = this.selectedNode();
    if (!selected || selected.node.id === 0) return 'start';
    const side = selected.node.side === 'BLACK' ? '...' : '.';
    return `${selected.node.moveNumber}${side} ${selected.node.moveSan || selected.node.moveUci}`;
  });
  readonly analysisStatusLabel = computed(() => {
    if (this.analysisRun()?.status === 'COMPLETED' || this.game()?.analysis.status === 'COMPLETED')
      return 'Saved';
    if (this.game()?.analysis.status === 'RUNNING') return 'Running';
    if (this.game()?.analysis.status === 'FAILED') return 'Failed';
    return 'None';
  });
  readonly analysisSummaryLabel = computed(() => {
    const run = this.analysisRun();
    return run
      ? `${run.moves.length} analysed moves · ${run.criticalMoves.length} critical`
      : 'No saved analysis loaded';
  });

  initialize(gameId: number): void {
    if (!Number.isFinite(gameId) || gameId <= 0) {
      this.error.set('Invalid imported game id.');
      this.loading.set(false);
      return;
    }
    this.gameId.set(gameId);
    void this.loadGame();
  }

  async loadGame(): Promise<void> {
    const gameId = this.gameId();
    if (!gameId) return;
    this.resetViewState();
    try {
      const game = await firstValueFrom(this.api.getGame(gameId));
      const moves = parseGamePgn(game.pgn || '');
      this.game.set(game);
      this.tree.set(buildGameTree(moves, game.userColor, {}));
      this.loading.set(false);
      this.boardPositionVersion.update((version) => version + 1);
      this.scheduleAnalysis();
      void this.loadSavedAnalysis();
    } catch (error) {
      this.error.set(readError(error, 'Could not load imported game.'));
      this.loading.set(false);
    }
  }

  selectNode(nodeId: number): void {
    if (!findGameTreeNode(nodeId, this.tree()?.root)) return;
    this.selectedNodeId.set(nodeId);
    this.scheduleAnalysis();
  }

  playBoardMove(uci: string): void {
    const selected = this.selectedNode();
    const tree = this.tree();
    if (!selected || !tree) return;

    const existing = selected.children.find((child) => child.node.moveUci === uci);
    if (existing) {
      this.selectNode(existing.node.id);
      return;
    }

    try {
      const chess = new Chess(this.currentFen());
      const beforeFen = chess.fen();
      const side: UserColor = chess.turn() === 'w' ? 'WHITE' : 'BLACK';
      const move = chess.move({
        from: uci.substring(0, 2),
        to: uci.substring(2, 4),
        promotion: uci.substring(4, 5) || undefined,
      });
      if (!move) return this.resetBoardPosition();

      const child: GameTreeNode = {
        node: {
          id: this.nextLocalNodeId++,
          plyNumber: null,
          moveNumber: Number(beforeFen.split(' ')[5]) || 1,
          side,
          moveSan: move.san,
          moveUci: uci,
          fenBefore: beforeFen,
          fenAfter: chess.fen(),
          isUserMove: side === this.game()?.userColor,
          source: 'LOCAL',
          analysisMove: null,
          classification: null,
          evalCpWhite: null,
        },
        children: [],
      };
      this.tree.set({ root: appendGameTreeChild(tree.root, selected.node.id, child) });
      this.selectNode(child.node.id);
    } catch {
      this.resetBoardPosition();
    }
  }

  goToStart(): void {
    this.selectNode(0);
  }

  goToPrevious(): void {
    const parent = findGameTreeParent(this.selectedNodeId(), this.tree()?.root);
    if (parent) this.selectNode(parent.node.id);
  }

  goToNext(): void {
    const next = this.selectedNode()?.children[0];
    if (next) this.selectNode(next.node.id);
  }

  goToEnd(): void {
    let node = this.selectedNode();
    while (node?.children.length) node = node.children[0];
    if (node) this.selectNode(node.node.id);
  }

  deleteSelectedSubtree(): void {
    const selected = this.selectedNode();
    const tree = this.tree();
    if (!selected || !tree || selected.node.id === 0 || selected.node.source !== 'LOCAL') return;

    const parentId = findGameTreeParent(selected.node.id, tree.root)?.node.id ?? 0;
    this.tree.set({ root: removeGameTreeSubtree(tree.root, selected.node.id) });
    this.selectedNodeId.set(parentId);
    this.boardPositionVersion.update((version) => version + 1);
    this.scheduleAnalysis();
  }

  rerunAnalysis(): void {
    const fen = this.currentFen();
    this.positionAnalysis.analyze(fen, {
      depth: RICH_INTERACTIVE_ANALYSIS_DEPTH,
      multipv: DEFAULT_INTERACTIVE_MULTIPV,
      seedPosition: this.positionAnalysis.seedForFen(fen, this.game()?.plies ?? [], {
        requestedDepth: RICH_INTERACTIVE_CACHE_MIN_DEPTH,
      }),
    });
  }

  async analyzeImportedGame(force: boolean): Promise<void> {
    const gameId = this.gameId();
    if (!gameId || this.importedGameAnalysis.progress().running) return;
    this.error.set(null);
    try {
      await this.importedGameAnalysis.analyzeGame(gameId, force);
      await this.refreshTags();
      await this.loadGame();
    } catch (error) {
      this.error.set(readError(error, 'Could not analyse imported game.'));
    }
  }

  async refreshTags(): Promise<void> {
    const gameId = this.gameId();
    if (!gameId || this.refreshingTags()) return;
    this.error.set(null);
    this.refreshingTags.set(true);
    try {
      const response = await firstValueFrom(this.api.refreshGameTags(gameId));
      this.game.update((game) =>
        game
          ? { ...game, tagCodes: response.tagCodes, tags: response.tags }
          : game,
      );
    } catch (error) {
      this.error.set(readError(error, 'Could not refresh tags.'));
      throw error;
    } finally {
      this.refreshingTags.set(false);
    }
  }

  async fullRefreshGame(): Promise<void> {
    const gameId = this.gameId();
    if (
      !gameId ||
      this.fullRefreshing() ||
      this.refreshingTags() ||
      this.importedGameAnalysis.progress().running ||
      this.game()?.analysis.status === 'RUNNING'
    ) {
      return;
    }

    this.error.set(null);
    this.fullRefreshing.set(true);
    try {
      await firstValueFrom(this.api.fullRefreshGame(gameId));
    } catch (error) {
      this.error.set(readError(error, 'Could not start full refresh.'));
    } finally {
      this.fullRefreshing.set(false);
    }
  }

  handleKeyboard(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    const tag = target?.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable)
      return;
    const commands: Record<string, () => void> = {
      ArrowLeft: () => this.goToPrevious(),
      ArrowRight: () => this.goToNext(),
      Home: () => this.goToStart(),
      End: () => this.goToEnd(),
    };
    const command = commands[event.key];
    if (!command) return;
    event.preventDefault();
    command();
  }

  ngOnDestroy(): void {
    if (this.analysisTimer) clearTimeout(this.analysisTimer);
    this.positionAnalysis.stop();
  }

  private async loadSavedAnalysis(): Promise<void> {
    const gameId = this.gameId();
    const game = this.game();
    if (!gameId || !game) return;
    try {
      const response = await firstValueFrom(this.api.getAnalysis(gameId));
      const analysisByPly = Object.fromEntries(
        response.run.moves.map((move) => [move.plyNumber, move]),
      ) as Record<number, ImportedGameAnalysisMove>;
      this.analysisRun.set(response.run);
      this.tree.update((tree) =>
        tree ? { root: attachGameTreeAnalysis(tree.root, analysisByPly) } : tree,
      );
    } catch {
      this.analysisRun.set(null);
    }
  }

  private scheduleAnalysis(): void {
    if (this.analysisTimer) clearTimeout(this.analysisTimer);
    this.analysisTimer = setTimeout(() => this.rerunAnalysis(), 250);
  }

  private resetViewState(): void {
    if (this.analysisTimer) clearTimeout(this.analysisTimer);
    this.loading.set(true);
    this.refreshingTags.set(false);
    this.fullRefreshing.set(false);
    this.error.set(null);
    this.game.set(null);
    this.analysisRun.set(null);
    this.tree.set(null);
    this.selectedNodeId.set(0);
    this.nextLocalNodeId = 1_000_000;
  }

  private resetBoardPosition(): void {
    this.boardPositionVersion.update((version) => version + 1);
  }
}

function readError(error: unknown, fallback: string): string {
  if (typeof error !== 'object' || error === null) return fallback;
  const candidate = error as { error?: { message?: string; error?: string }; message?: string };
  return candidate.error?.message || candidate.error?.error || candidate.message || fallback;
}
