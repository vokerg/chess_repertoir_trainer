import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { GamesApiService } from '../data-access/games-api.service';
import { ImportedGameAnalysisService } from '../data-access/imported-game-analysis.service';
import {
  ImportedGameFacetsResponse,
  ImportedGameIndexWorkflowResult,
  ImportedGameSearchItem,
  ImportedGamePageInfo,
  ImportedGamePlyIndexResult,
} from '../data-access/games.models';
import type { GameFilters } from '../../../shared/games/filters/game-filter.model';
import { isStandardImportedGameSpeed } from '../../../shared/games/imported-game-workflow-eligibility';
import { emptyImportedGameFacets } from '../../../shared/games/game.models';
import type { ImportedGameSearchCriteria } from '../../../shared/games/filters/imported-game-search-query.codec';
import {
  defaultGamesExplorerQuery,
  patchGamesExplorerDraftQuery,
  projectGamesExplorerFilters,
  summarizeUnrepresentedGamesExplorerCriteria,
} from '../helpers/games-explorer-route-query.helpers';

@Injectable()
export class GamesExplorerStore {
  private readonly api = inject(GamesApiService);
  private searchRequestId = 0;
  readonly importedGameAnalysis = inject(ImportedGameAnalysisService);

  readonly games = signal<ImportedGameSearchItem[]>([]);
  readonly facets = signal<ImportedGameFacetsResponse>(emptyImportedGameFacets());
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly analysingGameId = signal<number | null>(null);
  readonly indexingPlyGameId = signal<number | null>(null);
  readonly bulkIndexing = signal(false);
  readonly bulkIndexCompleted = signal(0);
  readonly bulkIndexTotal = signal(0);
  readonly bulkRefreshingTags = signal(false);
  readonly bulkRefreshTagsCompleted = signal(0);
  readonly bulkRefreshTagsTotal = signal(0);
  readonly batchAnalysisEnabled = signal(false);
  readonly batchAnalysisSubmitting = signal(false);
  readonly pageInfo = signal<ImportedGamePageInfo>({ nextCursor: null, hasMore: false });
  readonly appliedQuery = signal<ImportedGameSearchCriteria>(defaultGamesExplorerQuery());
  readonly draftQuery = signal<ImportedGameSearchCriteria>(defaultGamesExplorerQuery());
  readonly filters = computed<GameFilters>(() => projectGamesExplorerFilters(this.draftQuery()));
  readonly unrepresentedCriteriaSummary = computed(() =>
    summarizeUnrepresentedGamesExplorerCriteria(this.appliedQuery()),
  );

  readonly filteredGames = computed(() => this.games());

  readonly analysedCount = computed(
    () => this.filteredGames().filter((game) => game.analysis?.status === 'COMPLETED').length
  );

  readonly plyIndexedCount = computed(
    () => this.filteredGames().filter((game) => game.plyIndex?.status === 'INDEXED').length
  );

  readonly bulkIndexableGames = computed(() =>
    this.filteredGames().filter((game) =>
      isStandardImportedGameSpeed(game.speedCategory) && game.plyIndex?.status !== 'INDEXED'
    )
  );

  readonly bulkIndexProgressLabel = computed(() => {
    if (!this.bulkIndexing()) return String(this.bulkIndexableGames().length);
    return `${this.bulkIndexCompleted()}/${this.bulkIndexTotal()}`;
  });

  readonly bulkRefreshTagsProgressLabel = computed(() => {
    if (!this.bulkRefreshingTags()) return String(this.filteredGames().length);
    return `${this.bulkRefreshTagsCompleted()}/${this.bulkRefreshTagsTotal()}`;
  });

  readonly batchAnalysisProgressLabel = computed(() => {
    if (this.batchAnalysisSubmitting()) return 'Starting...';
    return String(this.filteredGames().length);
  });

  readonly tableSubtitle = computed(() => {
    const filteredGames = this.filteredGames();
    const games = this.games();
    const pageInfo = this.pageInfo();
    if (this.loading() && filteredGames.length === 0) return 'Loading matching games...';
    if (filteredGames.length === 0) return 'No games loaded';
    const totalNote = filteredGames.length === games.length ? '' : ` · ${games.length} fetched`;
    return `${filteredGames.length} games shown${totalNote}${pageInfo.hasMore ? ' · more available' : ''}`;
  });

  loadFacets(): void {
    this.api.getFacets().subscribe({
      next: (data) => this.facets.set(data),
    });
  }

  loadBatchAnalysisConfig(): void {
    this.api.getBatchAnalysisConfig().subscribe({
      next: (config) => this.batchAnalysisEnabled.set(config.enabled === true),
      error: () => {
        this.batchAnalysisEnabled.set(false);
      },
    });
  }

  refresh(): void {
    this.resetBulkIndexState();
    this.resetBulkRefreshTagsState();
    this.games.set([]);
    this.pageInfo.set({ nextCursor: null, hasMore: false });
    this.loadGames();
  }

  loadMore(): void {
    const nextCursor = this.pageInfo().nextCursor;
    if (!nextCursor || this.loading()) return;
    this.loadGames(nextCursor);
  }

  loadGames(cursor?: string | null): void {
    const requestId = ++this.searchRequestId;
    this.loading.set(true);
    this.error.set(null);
    this.api.searchGames(this.appliedQuery(), cursor).subscribe({
      next: (data) => {
        if (requestId !== this.searchRequestId) return;
        this.games.set(cursor ? [...this.games(), ...data.items] : data.items);
        this.pageInfo.set(data.pageInfo);
        this.loading.set(false);
      },
      error: (err) => {
        if (requestId !== this.searchRequestId) return;
        this.error.set(readApiError(err, 'Could not load imported games.'));
        this.loading.set(false);
      },
    });
  }

  setFilters(filters: GameFilters): void {
    const previousFilters = this.filters();
    this.draftQuery.update((query) =>
      patchGamesExplorerDraftQuery(query, previousFilters, filters),
    );
  }

  applyRouteQuery(query: ImportedGameSearchCriteria): void {
    this.appliedQuery.set(query);
    this.draftQuery.set(query);
    this.refresh();
  }

  analyse(game: ImportedGameSearchItem): void {
    this.runAnalysis(game);
  }

  forceReanalyse(game: ImportedGameSearchItem): void {
    this.runAnalysis(game, true);
  }

  indexPlies(game: ImportedGameSearchItem): void {
    if (game.plyIndex?.status === 'INDEXED') return;

    this.indexingPlyGameId.set(game.id);
    this.error.set(null);
    this.markGamePlyIndexing(game.id);
    const force = game.plyIndex?.status === 'FAILED';
    this.api.indexPlies(game.id, force).subscribe({
      next: (result) => {
        if (!result.eligible) {
          const message = 'Only blitz and rapid games are eligible for the standard indexing workflow.';
          this.error.set(message);
        } else if (result.plyIndex?.status === 'FAILED') {
          const message = result.plyIndex.error || 'Could not index game plies.';
          this.markGamePlyIndexFailed(game.id, message);
          this.error.set(message);
        } else {
          this.markGameIndexWorkflowCompleted(game.id, result);
        }
        this.indexingPlyGameId.set(null);
      },
      error: (err) => {
        const message = readApiError(err, 'Could not index game plies.');
        this.markGamePlyIndexFailed(game.id, message);
        this.error.set(message);
        this.indexingPlyGameId.set(null);
      },
    });
  }

  async indexAllVisibleGames(): Promise<void> {
    const games = this.bulkIndexableGames();
    if (!games.length || this.bulkIndexing()) return;

    this.error.set(null);
    this.bulkIndexing.set(true);
    this.bulkIndexCompleted.set(0);
    this.bulkIndexTotal.set(games.length);

    const concurrency = 4;
    let nextIndex = 0;
    const failures: string[] = [];

    const runWorker = async () => {
      while (nextIndex < games.length) {
        const game = games[nextIndex];
        nextIndex += 1;
        try {
          await this.indexSingleGame(game);
        } catch (err: unknown) {
          failures.push(readApiError(err, `Could not index game #${game.id}.`));
        } finally {
          this.bulkIndexCompleted.update((completed) => completed + 1);
        }
      }
    };

    await Promise.all(Array.from({ length: Math.min(concurrency, games.length) }, () => runWorker()));

    this.bulkIndexing.set(false);
    this.indexingPlyGameId.set(null);
    if (failures.length) {
      this.error.set(failures[0]);
    }
  }

  batchAnalyzeVisibleGames(): void {
    const gameIds = this.filteredGames()
      .filter((game) => isStandardImportedGameSpeed(game.speedCategory))
      .map((game) => game.id);
    if (!gameIds.length || this.batchAnalysisSubmitting()) return;

    this.error.set(null);
    this.batchAnalysisSubmitting.set(true);
    this.api.startBatchAnalysis(gameIds).subscribe({
      next: (result) => {
        for (const gameId of result.gameIds) this.markGameAnalysisRunning(gameId);
        this.batchAnalysisSubmitting.set(false);
      },
      error: (err) => {
        this.error.set(readApiError(err, 'Could not start batch analysis.'));
        this.batchAnalysisSubmitting.set(false);
      },
    });
  }

  async refreshTagsForVisibleGames(): Promise<void> {
    const games = this.filteredGames();
    if (!games.length || this.bulkRefreshingTags()) return;

    this.error.set(null);
    this.bulkRefreshingTags.set(true);
    this.bulkRefreshTagsCompleted.set(0);
    this.bulkRefreshTagsTotal.set(games.length);

    const concurrency = 4;
    let nextIndex = 0;
    const failures: string[] = [];

    const runWorker = async () => {
      while (nextIndex < games.length) {
        const game = games[nextIndex];
        nextIndex += 1;
        try {
          if (this.gameTagCount(game) >= 3) continue;
          const response = await firstValueFrom(this.api.refreshGameTags(game.id));
          this.patchGameTagCount(response.importedGameId, response.tagCodes.length);
        } catch (err: unknown) {
          failures.push(readApiError(err, `Could not refresh tags for game #${game.id}.`));
        } finally {
          this.bulkRefreshTagsCompleted.update((completed) => completed + 1);
        }
      }
    };

    await Promise.all(Array.from({ length: Math.min(concurrency, games.length) }, () => runWorker()));

    this.bulkRefreshingTags.set(false);
    if (failures.length) {
      this.error.set(failures[0]);
    }
  }

  private async runAnalysis(game: ImportedGameSearchItem, force = false): Promise<void> {
    this.analysingGameId.set(game.id);
    this.error.set(null);
    this.markGameAnalysisRunning(game.id);
    try {
      await this.importedGameAnalysis.analyzeGame(game.id, force);
      this.markGameAnalysisCompleted(game.id);
      try {
        await this.reloadCurrentList();
      } catch (reloadError) {
        this.error.set(readApiError(reloadError, 'Analysis completed, but refreshed tags could not be loaded.'));
      }
      this.analysingGameId.set(null);
    } catch (err) {
      const message = readApiError(err, 'Could not analyse game.');
      this.markGameAnalysisFailed(game.id);
      this.error.set(message);
      this.analysingGameId.set(null);
    }
  }

  private async indexSingleGame(game: ImportedGameSearchItem): Promise<void> {
    this.indexingPlyGameId.set(game.id);
    this.markGamePlyIndexing(game.id);
    const force = game.plyIndex?.status === 'FAILED';
    try {
      const result = await firstValueFrom(this.api.runIndexWorkflow(game.id, force));
      if (!result.eligible) {
        const message = 'Only blitz and rapid games are eligible for the standard indexing workflow.';
        this.markGamePlyIndexFailed(game.id, message);
        throw new Error(message);
      }
      if (result.plyIndex?.status === 'FAILED') {
        const message = result.plyIndex.error || 'Could not index game plies.';
        this.markGamePlyIndexFailed(game.id, message);
        throw new Error(message);
      }
      this.markGameIndexWorkflowCompleted(game.id, result);
    } catch (error) {
      const message = readApiError(error, `Could not index game #${game.id}.`);
      this.markGamePlyIndexFailed(game.id, message);
      throw error;
    }
  }

  private patchGameById(
    gameId: number,
    updater: (game: ImportedGameSearchItem) => ImportedGameSearchItem,
  ): void {
    this.games.update((games) => games.map((game) => (game.id === gameId ? updater(game) : game)));
  }

  private markGameAnalysisRunning(gameId: number): void {
    this.patchGameById(gameId, (game) => ({
      ...game,
      analysis: { ...game.analysis, status: 'RUNNING' },
    }));
  }

  private markGameAnalysisCompleted(gameId: number): void {
    this.patchGameById(gameId, (game) => ({
      ...game,
      analysis: { ...game.analysis, status: 'COMPLETED' },
    }));
  }

  private markGameAnalysisFailed(gameId: number): void {
    this.patchGameById(gameId, (game) => ({
      ...game,
      analysis: { ...game.analysis, status: 'FAILED' },
    }));
  }

  private markGamePlyIndexing(gameId: number): void {
    this.patchGameById(gameId, (game) => ({
      ...game,
      plyIndex: { status: 'NOT_INDEXED' },
    }));
  }

  private markGamePlyIndexed(gameId: number, result: ImportedGamePlyIndexResult): void {
    this.patchGameById(gameId, (game) => ({
      ...game,
      plyIndex: { status: 'INDEXED' },
    }));
  }

  private markGamePlyIndexFailed(gameId: number, error: string): void {
    this.patchGameById(gameId, (game) => ({
      ...game,
      plyIndex: { status: 'FAILED' },
    }));
  }

  private markGameIndexWorkflowCompleted(gameId: number, result: ImportedGameIndexWorkflowResult): void {
    const plyIndex = result.plyIndex;
    if (plyIndex) this.markGamePlyIndexed(gameId, plyIndex);
    const openingAssignment = result.openingAssignment;
    if (!openingAssignment || openingAssignment.status === 'FAILED') return;

    this.patchGameById(gameId, (game) => ({
      ...game,
      opening: {
        ...game.opening,
        eco: openingAssignment.openingEco ?? game.opening?.eco ?? null,
        name: openingAssignment.openingName ?? game.opening?.name ?? null,
      },
    }));
  }

  private patchGameTagCount(gameId: number, tagCount: number): void {
    this.patchGameById(gameId, (game) => ({
      ...game,
      tagCount,
    }));
  }

  private async reloadCurrentList(): Promise<void> {
    const data = await firstValueFrom(this.api.searchGames(this.appliedQuery()));
    this.games.set(data.items);
    this.pageInfo.set(data.pageInfo);
  }

  private gameTagCount(game: ImportedGameSearchItem): number {
    return game.tagCount;
  }

  private resetBulkIndexState(): void {
    this.bulkIndexing.set(false);
    this.bulkIndexCompleted.set(0);
    this.bulkIndexTotal.set(0);
  }

  private resetBulkRefreshTagsState(): void {
    this.bulkRefreshingTags.set(false);
    this.bulkRefreshTagsCompleted.set(0);
    this.bulkRefreshTagsTotal.set(0);
  }

}

function readApiError(err: unknown, fallback: string): string {
  if (typeof err === 'object' && err !== null) {
    const maybeHttp = err as { error?: { message?: string; error?: string }; message?: string };
    return maybeHttp.error?.message || maybeHttp.error?.error || maybeHttp.message || fallback;
  }
  return fallback;
}
