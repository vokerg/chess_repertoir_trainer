import { computed, inject, Injectable, OnDestroy, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { ImportedGameFacetsResponse } from '../../../shared/games/game.models';
import {
  PositionAnalysisCacheService,
} from '../../../shared/chess/engine/position-analysis-cache.service';
import { EngineAnalysis } from '../../../shared/chess/engine/stockfish-analysis.service';
import { GameFilters } from '../../../shared/games/filters/game-filter.model';
import { PositionGameMovesApiService } from '../../../shared/games/position-moves/position-game-moves-api.service';
import { buildOpeningAnalysisQuery, defaultOpeningFilters } from '../../../shared/games/position-moves/position-game-moves.helpers';
import { OpeningAnalysisResponse } from '../../../shared/games/position-moves/position-game-moves.models';
import { LinesApiService, readLinesError } from '../data-access/lines-api.service';
import { LineDetail, LineTree, UpdateLineNodePayload } from '../data-access/lines.models';
import {
  countLineTreeDescendants,
  findLineTreeNode,
  findLineTreeParent,
  patchLineTreeNode,
} from '../helpers/line-tree.helpers';

const EMPTY_ENGINE_ANALYSIS: EngineAnalysis = {
  fen: '',
  running: false,
  ready: false,
  error: null,
  bestMove: null,
  lines: [],
};

@Injectable()
export class LineEditorStore implements OnDestroy {
  private readonly api = inject(LinesApiService);
  private readonly positionAnalysis = inject(PositionAnalysisCacheService);
  private readonly positionGameMovesApi = inject(PositionGameMovesApiService);

  private readonly lineId = signal<number | null>(null);
  private requestVersion = 0;
  private analysisTimer?: ReturnType<typeof setTimeout>;
  private gamesRequestSeq = 0;
  private gamesFacetsLoaded = false;

  readonly line = signal<LineDetail | null>(null);
  readonly tree = signal<LineTree | null>(null);
  readonly selectedNodeId = signal(0);
  readonly boardPositionVersion = signal(0);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly deleting = signal(false);
  readonly creatingMove = signal(false);
  readonly notesSaving = signal(false);
  readonly notesSaved = signal(false);
  readonly notesError = signal<string | null>(null);
  readonly gamesFacets = signal<ImportedGameFacetsResponse>({});
  readonly gamesFilters = signal<GameFilters>(defaultOpeningFilters());
  readonly gamesAnalysis = signal<OpeningAnalysisResponse | null>(null);
  readonly gamesLoading = signal(false);
  readonly gamesError = signal<string | null>(null);
  readonly engineAnalysis = toSignal(this.positionAnalysis.state$, {
    initialValue: EMPTY_ENGINE_ANALYSIS,
  });

  readonly selectedNode = computed(() =>
    findLineTreeNode(this.selectedNodeId(), this.tree()?.root),
  );
  readonly currentFen = computed(
    () => this.selectedNode()?.node.fenAfter || this.line()?.startingFen || 'startpos',
  );
  readonly lastMove = computed(() => {
    const move = this.selectedNode()?.node.moveUci;
    if (!move || this.selectedNodeId() === 0) return null;
    return { from: move.substring(0, 2), to: move.substring(2, 4) };
  });
  readonly blackPerspective = computed(() => this.line()?.sideToTrain === 'BLACK');
  readonly canGoBackward = computed(() => this.selectedNodeId() !== 0);
  readonly canGoForward = computed(() => Boolean(this.selectedNode()?.children.length));
  readonly selectedLabel = computed(() => {
    const selected = this.selectedNode();
    if (!selected || selected.node.id === 0) return 'start';
    return selected.node.moveSan || selected.node.moveUci;
  });
  readonly analysisArrows = computed(() => {
    const analysis = this.engineAnalysis();
    const move = analysis.bestMove;
    if (!move || analysis.fen !== this.currentFen() || move === '(none)') return [];
    return [{ from: move.substring(0, 2), to: move.substring(2, 4), brush: 'green' }];
  });
  readonly plannedTrainedMove = computed(() => {
    const selected = this.selectedNode();
    return selected?.children.find((child) => child.node.isUserMove && child.node.isCorrectUserMove)
      ?.node.moveUci;
  });
  readonly engineWarning = computed(() => {
    const analysis = this.engineAnalysis();
    const planned = this.plannedTrainedMove();
    if (
      analysis.fen !== this.currentFen() ||
      !analysis.bestMove ||
      analysis.bestMove === '(none)'
    ) {
      return null;
    }
    if (!planned || planned === analysis.bestMove) return null;
    return `Engine warning: your planned move is ${planned}, but Stockfish currently prefers ${analysis.bestMove}.`;
  });
  readonly breadcrumbLink = computed<readonly (string | number)[]>(() =>
    this.line()?.chapterId ? ['/chapters', this.line()!.chapterId, 'lines'] : ['/courses'],
  );
  readonly breadcrumbLabel = computed(() =>
    this.line()?.chapterId ? '<- Back to lines' : '<- Back to courses',
  );
  readonly deleteConfirmationText = computed(() => {
    const node = this.selectedNode();
    if (!node || node.node.id === 0) return null;
    const label = node.node.moveSan || node.node.moveUci;
    const descendantCount = countLineTreeDescendants(node);
    return `Delete ${label} and ${descendantCount} following move(s)? This cannot be undone.`;
  });

  initialize(lineId: number, selectNodeId?: number): void {
    if (!Number.isFinite(lineId) || lineId <= 0) {
      this.error.set('Invalid line id.');
      this.loading.set(false);
      return;
    }
    this.lineId.set(lineId);
    void this.loadGamesFacets();
    void this.loadLineAndTree(selectNodeId);
  }

  async loadLineAndTree(selectNodeId?: number): Promise<void> {
    const lineId = this.lineId();
    if (!lineId) return;

    const requestVersion = ++this.requestVersion;
    this.loading.set(true);
    this.error.set(null);
    this.notesSaved.set(false);
    this.notesError.set(null);

    try {
      const [line, tree] = await Promise.all([
        firstValueFrom(this.api.getLine(lineId)),
        firstValueFrom(this.api.getLineTree(lineId)),
      ]);
      if (requestVersion !== this.requestVersion) return;
      this.line.set(line);
      this.gamesFilters.update((filters) => ({ ...filters, userColor: line.sideToTrain }));
      this.applyTree(tree, selectNodeId ?? tree.root.node.id);
      this.loading.set(false);
    } catch (error) {
      if (requestVersion !== this.requestVersion) return;
      this.error.set(readLinesError(error, 'Could not load line.'));
      this.loading.set(false);
    }
  }

  selectNode(nodeId: number): void {
    if (!findLineTreeNode(nodeId, this.tree()?.root)) return;
    this.selectedNodeId.set(nodeId);
    this.notesSaved.set(false);
    this.notesError.set(null);
    this.scheduleAnalysis();
    void this.refreshGamesAnalysis();
  }

  setGamesFilters(filters: GameFilters): void {
    this.gamesFilters.set(filters);
  }

  resetGamesFilters(): void {
    this.gamesFilters.set({
      ...defaultOpeningFilters(),
      userColor: this.line()?.sideToTrain || 'WHITE',
    });
    void this.refreshGamesAnalysis();
  }

  async refreshGamesAnalysis(): Promise<void> {
    const fen = this.currentFen();
    if (!fen) return;

    const requestId = ++this.gamesRequestSeq;
    this.gamesLoading.set(true);
    this.gamesError.set(null);
    try {
      const query = buildOpeningAnalysisQuery(fen, this.gamesFilters());
      const analysis = await firstValueFrom(this.positionGameMovesApi.getAnalysis(query));
      if (requestId !== this.gamesRequestSeq) return;
      this.gamesAnalysis.set(analysis);
      this.gamesLoading.set(false);
    } catch (error) {
      if (requestId !== this.gamesRequestSeq) return;
      this.gamesError.set(readLinesError(error, 'Could not load moves from your games.'));
      this.gamesLoading.set(false);
    }
  }

  goToStart(): void {
    if (!this.tree()?.root) return;
    this.selectNode(0);
  }

  goToPrevious(): void {
    const parent = findLineTreeParent(this.selectedNodeId(), this.tree()?.root);
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

  async playBoardMove(uci: string): Promise<void> {
    const lineId = this.lineId();
    if (!lineId || this.creatingMove()) return;

    this.creatingMove.set(true);
    this.error.set(null);
    const parentId = this.selectedNodeId() === 0 ? null : this.selectedNodeId();

    try {
      const created = await firstValueFrom(
        this.api.createLineNode(lineId, { parentId, moveUci: uci }),
      );
      await this.refreshTree(created.id);
    } catch (error) {
      this.boardPositionVersion.update((version) => version + 1);
      this.error.set(
        readLinesError(
          error,
          'Could not add this move. It may be illegal or this position already has a trained-side move.',
        ),
      );
    } finally {
      this.creatingMove.set(false);
    }
  }

  async deleteSelectedSubtree(): Promise<void> {
    const selected = this.selectedNode();
    if (!selected || selected.node.id === 0 || this.deleting()) return;

    this.deleting.set(true);
    this.error.set(null);

    try {
      await firstValueFrom(this.api.deleteLineNodeSubtree(selected.node.id));
      const parentId = findLineTreeParent(selected.node.id, this.tree()?.root)?.node.id ?? 0;
      await this.refreshTree(parentId);
    } catch (error) {
      this.error.set(readLinesError(error, 'Could not delete this move.'));
    } finally {
      this.deleting.set(false);
    }
  }

  async saveNotes(payload: UpdateLineNodePayload): Promise<void> {
    const nodeId = this.selectedNode()?.node.id;
    const tree = this.tree();
    if (!nodeId || nodeId === 0 || !tree) return;

    this.notesSaving.set(true);
    this.notesSaved.set(false);
    this.notesError.set(null);

    try {
      const updated = await firstValueFrom(this.api.updateLineNode(nodeId, payload));
      this.tree.set({
        root: patchLineTreeNode(tree.root, nodeId, updated),
      });
      this.notesSaved.set(true);
    } catch (error) {
      this.notesError.set(readLinesError(error, 'Could not save notes.'));
    } finally {
      this.notesSaving.set(false);
    }
  }

  rerunAnalysis(): void {
    const fen = this.currentFen();
    if (!fen) return;
    this.positionAnalysis.analyzeInteractiveRichPosition(fen);
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
    this.gamesRequestSeq += 1;
    this.positionAnalysis.stop();
  }

  private async refreshTree(selectNodeId: number): Promise<void> {
    const lineId = this.lineId();
    if (!lineId) return;
    const tree = await firstValueFrom(this.api.getLineTree(lineId));
    this.applyTree(tree, selectNodeId);
  }

  private applyTree(tree: LineTree, requestedNodeId: number): void {
    const selectedNodeId = findLineTreeNode(requestedNodeId, tree.root)
      ? requestedNodeId
      : tree.root.node.id;
    this.tree.set(tree);
    this.selectedNodeId.set(selectedNodeId);
    this.boardPositionVersion.update((version) => version + 1);
    this.scheduleAnalysis();
    void this.refreshGamesAnalysis();
  }

  private scheduleAnalysis(): void {
    if (this.analysisTimer) clearTimeout(this.analysisTimer);
    this.analysisTimer = setTimeout(() => this.rerunAnalysis(), 250);
  }

  private async loadGamesFacets(): Promise<void> {
    if (this.gamesFacetsLoaded) return;
    this.gamesFacetsLoaded = true;
    try {
      this.gamesFacets.set((await firstValueFrom(this.positionGameMovesApi.getFacets())) || {});
    } catch {
      this.gamesFacets.set({});
    }
  }
}
