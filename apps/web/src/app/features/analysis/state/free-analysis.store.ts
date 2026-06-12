import { computed, inject, Injectable, OnDestroy, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Chess } from 'chess.js';
import { firstValueFrom } from 'rxjs';
import { PositionAnalysisCacheService } from '../../../services/position-analysis-cache.service';
import { EngineAnalysis } from '../../../services/stockfish-analysis.service';
import { FreeAnalysisApiService } from '../data-access/free-analysis-api.service';
import {
  appendFreeAnalysisChild,
  buildFreeAnalysisGameTree,
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

  readonly tree = signal<FreeAnalysisTree | null>(null);
  readonly selectedNodeId = signal(0);
  readonly boardPositionVersion = signal(0);
  readonly error = signal<string | null>(null);
  readonly loading = signal(false);
  readonly loadedFromGame = signal(false);
  readonly boardSide = signal<'WHITE' | 'BLACK'>('WHITE');
  readonly startingFen = signal(new Chess().fen());
  readonly engineAnalysis = toSignal(this.positionAnalysis.state$, {
    initialValue: EMPTY_ENGINE_ANALYSIS,
  });

  private nextLocalNodeId = 1_000_000;
  private analysisTimer?: ReturnType<typeof setTimeout>;
  private requestVersion = 0;

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

  initialize(input: { fen: string | null; gameId: number | null; ply: number | null }): void {
    if (input.gameId && Number.isFinite(input.gameId) && input.gameId > 0) {
      void this.initializeFromGame(input.gameId, input.ply, input.fen);
      return;
    }
    this.initializeFromFen(input.fen);
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
  }

  selectNode(nodeId: number): void {
    if (!findFreeAnalysisNode(nodeId, this.tree()?.root)) return;
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
    this.positionAnalysis.analyze(this.currentFen(), { depth: 12, multipv: 3 });
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
