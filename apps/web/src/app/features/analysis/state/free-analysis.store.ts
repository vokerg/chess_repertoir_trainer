import { computed, inject, Injectable, OnDestroy, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Chess } from 'chess.js';
import { firstValueFrom } from 'rxjs';
import { ImportedGameFacetsResponse } from '../../../shared/games/game.models';
import { defaultGameFilters, GameFilters } from '../../../shared/games/filters/game-filter.model';
import { PositionGameMovesApiService } from '../../../shared/games/position-moves/position-game-moves-api.service';
import { buildOpeningAnalysisQuery } from '../../../shared/games/position-moves/position-game-moves.helpers';
import { OpeningAnalysisResponse } from '../../../shared/games/position-moves/position-game-moves.models';
import {
  PositionAnalysisCacheService,
} from '../../../shared/chess/engine/position-analysis-cache.service';
import { EngineAnalysis } from '../../../shared/chess/engine/stockfish-analysis.service';
import { FreeAnalysisApiService } from '../data-access/free-analysis-api.service';
import {
  appendFreeAnalysisChild,
  buildFreeAnalysisGameTree,
  buildFreeAnalysisLineTree,
  buildFreeAnalysisRoot,
  findFreeAnalysisNode,
  findFreeAnalysisParent,
  removeFreeAnalysisSubtree,
} from '../helpers/free-analysis-tree.helpers';
import {
  FreeAnalysisTree,
  FreeAnalysisTreeNode,
} from '../helpers/free-analysis-tree.models';

const EMPTY_ENGINE_ANALYSIS: EngineAnalysis = {
  fen: '',
  running: false,
  ready: false,
  error: null,
  bestMove: null,
  lines: [],
};

@Injectable()
export class FreeAnalysisStore implements OnDestroy {
  private readonly positionAnalysis = inject(PositionAnalysisCacheService);
  private readonly api = inject(FreeAnalysisApiService);
  private readonly positionGamesApi = inject(PositionGameMovesApiService);

  readonly tree = signal<FreeAnalysisTree | null>(null);
  readonly selectedNodeId = signal(0);
  readonly boardPositionVersion = signal(0);
  readonly error = signal<string | null>(null);
  readonly loading = signal(false);
  readonly loadedFromGame = signal(false);
  readonly boardSide = signal<'WHITE' | 'BLACK'>('WHITE');
  readonly myGamesOpen = signal(false);
  readonly myGamesFilters = signal<GameFilters>(defaultGameFilters());
  readonly myGamesFacets = signal<ImportedGameFacetsResponse>({});
  readonly myGamesAnalysis = signal<OpeningAnalysisResponse | null>(null);
  readonly myGamesLoading = signal(false);
  readonly myGamesError = signal<string | null>(null);
  readonly startingFen = signal(new Chess().fen());
  readonly engineAnalysis = toSignal(this.positionAnalysis.state$, {
    initialValue: EMPTY_ENGINE_ANALYSIS,
  });

  private nextLocalNodeId = 1_000_000;
  private analysisTimer?: ReturnType<typeof setTimeout>;
  private requestVersion = 0;
  private myGamesRequestVersion = 0;
  private myGamesFacetsLoaded = false;

  readonly selectedNode = computed(() =>
    findFreeAnalysisNode(this.selectedNodeId(), this.tree()?.root),
  );
  readonly currentFen = computed(() => this.selectedNode()?.node.fenAfter || this.startingFen());
  readonly lastMove = computed(() => {
    const move = this.selectedNode()?.node.moveUci;
    return move ? { from: move.substring(0, 2), to: move.substring(2, 4) } : null;
  });
  readonly blackPerspective = computed(() => this.boardSide() === 'BLACK');
  readonly canGoBackward = computed(() => this.selectedNodeId() !== 0);
  readonly canGoForward = computed(() => Boolean(this.selectedNode()?.children.length));
  readonly analysisArrows = computed<Array<{ from: string; to: string; brush?: string }>>(() => {
    const analysis = this.engineAnalysis();
    const move = analysis.bestMove;
    if (!move || analysis.fen !== this.currentFen() || move === '(none)') return [];
    return [{ from: move.substring(0, 2), to: move.substring(2, 4), brush: 'green' }];
  });
  readonly canDeleteSelectedSubtree = computed(() =>
    Boolean(
      this.selectedNode() &&
        this.selectedNodeId() !== 0 &&
        this.selectedNode()?.node.source === 'LOCAL',
    ),
  );
  readonly deleteConfirmationText = computed(() => {
    const node = this.selectedNode();
    if (!node || node.node.id === 0) return null;
    if (node.node.source !== 'LOCAL') {
      return 'Imported game moves cannot be deleted. Select a local variation instead.';
    }
    const label = node.node.moveSan || node.node.moveUci || 'this move';
    return `Delete ${label} and every local continuation below it?`;
  });

  initialize(input: {
    fen: string | null;
    gameId: number | null;
    ply: number | null;
    moves: readonly string[];
  }): void {
    if (input.gameId && Number.isFinite(input.gameId) && input.gameId > 0) {
      void this.initializeFromGame(input.gameId, input.ply, input.fen);
      return;
    }
    if (input.moves.length) {
      this.initializeFromMoves(input.moves);
      return;
    }
    this.initializeFromFen(input.fen);
  }

  initializeFromMoves(moves: readonly string[]): void {
    this.requestVersion += 1;
    this.error.set(null);
    this.loading.set(false);
    this.loadedFromGame.set(false);
    this.boardSide.set('WHITE');

    try {
      const root = buildFreeAnalysisLineTree(moves);
      this.startingFen.set(root.node.fenAfter);
      this.tree.set({ root });
      this.selectedNodeId.set(moves.length);
      this.nextLocalNodeId = 1_000_000;
      this.boardPositionVersion.update((version) => version + 1);
      this.scheduleAnalysis();
      this.refreshMyGamesIfOpen();
    } catch {
      this.initializeFromFen(null);
      this.error.set('Invalid analysis line. Loaded the normal start position instead.');
    }
  }

  initializeFromFen(fenParam: string | null): void {
    this.requestVersion += 1;
    const normalStart = new Chess().fen();
    let fen = normalStart;
    this.error.set(null);
    this.loading.set(false);
    this.loadedFromGame.set(false);
    this.boardSide.set('WHITE');

    const requestedFen = fenParam?.trim();
    if (requestedFen && requestedFen !== 'startpos') {
      try {
        fen = new Chess(requestedFen).fen();
      } catch {
        this.error.set('Invalid FEN. Loaded the normal start position instead.');
      }
    }

    this.startingFen.set(fen);
    this.tree.set({ root: buildFreeAnalysisRoot(fen) });
    this.selectedNodeId.set(0);
    this.nextLocalNodeId = 1_000_000;
    this.boardPositionVersion.update((version) => version + 1);
    this.scheduleAnalysis();
    this.refreshMyGamesIfOpen();
  }

  selectNode(nodeId: number): void {
    if (!findFreeAnalysisNode(nodeId, this.tree()?.root)) return;
    this.selectedNodeId.set(nodeId);
    this.scheduleAnalysis();
    this.refreshMyGamesIfOpen();
  }

  toggleMyGames(): void {
    const open = !this.myGamesOpen();
    this.myGamesOpen.set(open);
    if (!open) return;
    void this.loadMyGamesFacets();
    void this.refreshMyGames();
  }

  setMyGamesFilters(filters: GameFilters): void {
    this.myGamesFilters.set(filters);
  }

  resetMyGamesFilters(): void {
    this.myGamesFilters.set(defaultGameFilters());
    void this.refreshMyGames();
  }

  async refreshMyGames(): Promise<void> {
    if (!this.myGamesOpen()) return;
    const requestVersion = ++this.myGamesRequestVersion;
    this.myGamesLoading.set(true);
    this.myGamesError.set(null);
    try {
      const query = buildOpeningAnalysisQuery(this.currentFen(), this.myGamesFilters());
      const analysis = await firstValueFrom(this.positionGamesApi.getAnalysis(query));
      if (requestVersion !== this.myGamesRequestVersion) return;
      this.myGamesAnalysis.set(analysis);
    } catch (error) {
      if (requestVersion !== this.myGamesRequestVersion) return;
      this.myGamesError.set(readError(error, 'Could not load games for this position.'));
    } finally {
      if (requestVersion === this.myGamesRequestVersion) this.myGamesLoading.set(false);
    }
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
      const fenBefore = chess.fen();
      const side: 'WHITE' | 'BLACK' = chess.turn() === 'b' ? 'BLACK' : 'WHITE';
      const move = chess.move({
        from: uci.substring(0, 2),
        to: uci.substring(2, 4),
        promotion: uci.substring(4, 5) || undefined,
      });
      if (!move) {
        this.resetBoardPosition();
        return;
      }

      const child: FreeAnalysisTreeNode = {
        node: {
          id: this.nextLocalNodeId++,
          moveNumber: Number(fenBefore.split(' ')[5]) || 1,
          side,
          moveSan: move.san,
          moveUci: uci,
          fenBefore,
          fenAfter: chess.fen(),
          isUserMove: side === 'WHITE',
          moveMeta: side === 'WHITE' ? 'white' : 'black',
          source: 'LOCAL',
        },
        children: [],
      };
      this.tree.set({ root: appendFreeAnalysisChild(tree.root, selected.node.id, child) });
      this.selectNode(child.node.id);
    } catch {
      this.resetBoardPosition();
    }
  }

  goToStart(): void {
    this.selectNode(0);
  }

  goToPrevious(): void {
    const parent = findFreeAnalysisParent(this.selectedNodeId(), this.tree()?.root);
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

    const parentId = findFreeAnalysisParent(selected.node.id, tree.root)?.node.id ?? 0;
    this.tree.set({ root: removeFreeAnalysisSubtree(tree.root, selected.node.id) });
    this.selectedNodeId.set(parentId);
    this.boardPositionVersion.update((version) => version + 1);
    this.scheduleAnalysis();
  }

  rerunAnalysis(): void {
    this.positionAnalysis.analyzeInteractiveRichPosition(this.currentFen());
  }

  handleKeyboard(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    const tag = target?.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable) {
      return;
    }

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

  private scheduleAnalysis(): void {
    if (this.analysisTimer) clearTimeout(this.analysisTimer);
    this.analysisTimer = setTimeout(() => this.rerunAnalysis(), 250);
  }

  private refreshMyGamesIfOpen(): void {
    if (this.myGamesOpen()) void this.refreshMyGames();
  }

  private async loadMyGamesFacets(): Promise<void> {
    if (this.myGamesFacetsLoaded) return;
    try {
      this.myGamesFacets.set((await firstValueFrom(this.positionGamesApi.getFacets())) || {});
      this.myGamesFacetsLoaded = true;
    } catch {
      this.myGamesFacets.set({});
    }
  }

  private async initializeFromGame(
    gameId: number,
    selectedPly: number | null,
    fallbackFen: string | null,
  ): Promise<void> {
    const requestVersion = ++this.requestVersion;
    this.loading.set(true);
    this.error.set(null);

    try {
      const game = await firstValueFrom(this.api.getImportedGame(gameId));
      if (requestVersion !== this.requestVersion) return;
      if (!game.pgn?.trim()) throw new Error('The imported game has no PGN moves.');

      const root = buildFreeAnalysisGameTree(game.pgn, game.userColor, selectedPly);
      const requestedNodeId = selectedPly && selectedPly > 0 ? selectedPly : 0;
      const selectedNodeId = findFreeAnalysisNode(requestedNodeId, root)
        ? requestedNodeId
        : this.lastMainlineNodeId(root);

      this.startingFen.set(root.node.fenAfter);
      this.tree.set({ root });
      this.selectedNodeId.set(selectedNodeId);
      this.nextLocalNodeId = 1_000_000;
      this.loadedFromGame.set(true);
      this.boardSide.set(game.userColor === 'BLACK' ? 'BLACK' : 'WHITE');
      this.loading.set(false);
      this.boardPositionVersion.update((version) => version + 1);
      this.scheduleAnalysis();
      this.refreshMyGamesIfOpen();
    } catch (error) {
      if (requestVersion !== this.requestVersion) return;
      this.initializeFromFen(fallbackFen);
      const detail = error instanceof Error ? ` ${error.message}` : '';
      this.error.set(`Could not load the imported game.${detail}`.trim());
    }
  }

  private lastMainlineNodeId(root: FreeAnalysisTreeNode): number {
    let node = root;
    while (node.children.length) node = node.children[0];
    return node.node.id;
  }

  private resetBoardPosition(): void {
    this.boardPositionVersion.update((version) => version + 1);
  }
}

function readError(error: unknown, fallback: string): string {
  const response = error as { error?: { error?: string; message?: string }; message?: string };
  return response?.error?.error || response?.error?.message || response?.message || fallback;
}
