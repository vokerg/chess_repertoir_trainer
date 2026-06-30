import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { GamesApiService } from '../data-access/games-api.service';
import { ImportedGameAnalysisService } from '../data-access/imported-game-analysis.service';
import {
  ImportedGameFacetsResponse,
  ImportedGameListItem,
  ImportedGamePageInfo,
  ImportedGamePlyIndexResult,
} from '../data-access/games.models';
import { defaultGameFilters, GameFilters } from '../../../shared/games/filters/game-filter.model';

@Injectable()
export class GamesExplorerStore {
  private readonly api = inject(GamesApiService);
  readonly importedGameAnalysis = inject(ImportedGameAnalysisService);

  readonly games = signal<ImportedGameListItem[]>([]);
  readonly facets = signal<ImportedGameFacetsResponse>({});
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
  readonly filters = signal<GameFilters>(defaultGameFilters());

  readonly filteredGames = computed(() => {
    const timeControl = this.normalizedTimeControlSearch(this.filters().timeControl);
    const games = this.games();
    if (!timeControl) return games;
    return games.filter((game) => {
      const labels = [
        this.displayTimeControl(game),
        game.timeControl?.raw || '',
        this.timeControlFromRaw(game.timeControl?.raw),
      ];
      return labels.some((label) => this.normalizedTimeControlSearch(label).includes(timeControl));
    });
  });

  readonly analysedCount = computed(
    () => this.filteredGames().filter((game) => game.analysis?.status === 'COMPLETED').length
  );

  readonly plyIndexedCount = computed(
    () => this.filteredGames().filter((game) => game.plyIndex?.status === 'INDEXED').length
  );

  readonly bulkIndexableGames = computed(() =>
    this.filteredGames().filter((game) => game.plyIndex?.status !== 'INDEXED')
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
      next: (data) => this.facets.set(data || {}),
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
    this.loading.set(true);
    this.error.set(null);
    this.api.searchGames(this.filters(), cursor).subscribe({
      next: (data) => {
        this.games.set(cursor ? [...this.games(), ...data.items] : data.items);
        this.pageInfo.set(data.pageInfo);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(readApiError(err, 'Could not load imported games.'));
        this.loading.set(false);
      },
    });
  }

  setFilters(filters: GameFilters): void {
    this.filters.set(filters);
  }

  resetFilters(): void {
    this.filters.set(defaultGameFilters());
    this.refresh();
  }

  analyse(game: ImportedGameListItem): void {
    this.runAnalysis(game);
  }

  forceReanalyse(game: ImportedGameListItem): void {
    this.runAnalysis(game, true);
  }

  indexPlies(game: ImportedGameListItem): void {
    if (game.plyIndex?.status === 'INDEXED') return;

    this.indexingPlyGameId.set(game.id);
    this.error.set(null);
    this.markGamePlyIndexing(game.id);
    const force = game.plyIndex?.status === 'FAILED';
    this.api.indexPlies(game.id, force).subscribe({
      next: (result) => {
        if (result.status === 'FAILED') {
          const message = result.error || 'Could not index game plies.';
          this.markGamePlyIndexFailed(game.id, message);
          this.error.set(message);
        } else {
          this.markGamePlyIndexed(game.id, result);
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
    const gameIds = this.filteredGames().map((game) => game.id);
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
          this.patchGameTags(response.importedGameId, response.tagCodes, response.tags);
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

  private async runAnalysis(game: ImportedGameListItem, force = false): Promise<void> {
    this.analysingGameId.set(game.id);
    this.error.set(null);
    this.markGameAnalysisRunning(game.id);
    try {
      await this.importedGameAnalysis.analyzeGame(game.id, force);
      this.markGameAnalysisCompleted(game.id);
      this.analysingGameId.set(null);
    } catch (err) {
      const message = readApiError(err, 'Could not analyse game.');
      this.markGameAnalysisFailed(game.id);
      this.error.set(message);
      this.analysingGameId.set(null);
    }
  }

  private async indexSingleGame(game: ImportedGameListItem): Promise<void> {
    this.indexingPlyGameId.set(game.id);
    this.markGamePlyIndexing(game.id);
    const force = game.plyIndex?.status === 'FAILED';
    try {
      const result = await firstValueFrom(this.api.indexPlies(game.id, force));
      if (result.status === 'FAILED') {
        const message = result.error || 'Could not index game plies.';
        this.markGamePlyIndexFailed(game.id, message);
        throw new Error(message);
      }
      this.markGamePlyIndexed(game.id, result);
    } catch (error) {
      const message = readApiError(error, `Could not index game #${game.id}.`);
      this.markGamePlyIndexFailed(game.id, message);
      throw error;
    }
  }

  private patchGameById(
    gameId: number,
    updater: (game: ImportedGameListItem) => ImportedGameListItem,
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
      plyIndex: { ...game.plyIndex, status: 'NOT_INDEXED', error: null },
    }));
  }

  private markGamePlyIndexed(gameId: number, result: ImportedGamePlyIndexResult): void {
    this.patchGameById(gameId, (game) => ({
      ...game,
      plyIndex: {
        ...game.plyIndex,
        status: 'INDEXED',
        indexedAt: result.plyIndexedAt ?? game.plyIndex?.indexedAt ?? null,
        error: null,
      },
    }));
  }

  private markGamePlyIndexFailed(gameId: number, error: string): void {
    this.patchGameById(gameId, (game) => ({
      ...game,
      plyIndex: { ...game.plyIndex, status: 'FAILED', error },
    }));
  }

  private patchGameTags(gameId: number, tagCodes: number[], tags: ImportedGameListItem['tags']): void {
    this.patchGameById(gameId, (game) => ({
      ...game,
      tagCodes,
      tags,
    }));
  }

  private gameTagCount(game: ImportedGameListItem): number {
    return game.tags?.length ?? game.tagCodes.length;
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

  private displayTimeControl(game: ImportedGameListItem): string {
    const fromParts = this.formatTimeControl(game.timeControl?.initial, game.timeControl?.increment);
    if (fromParts) return fromParts;
    return this.timeControlFromRaw(game.timeControl?.raw) || '—';
  }

  private timeControlFromRaw(raw?: string | null): string {
    if (!raw) return '';
    const match = raw.match(/^(\d+)\s*\+\s*(\d+)$/);
    if (!match) return raw;
    return this.formatTimeControl(Number(match[1]), Number(match[2])) || raw;
  }

  private formatTimeControl(initial?: number | null, increment?: number | null): string | null {
    if (typeof initial !== 'number' || typeof increment !== 'number') return null;
    return `${this.formatInitialMinutes(initial)}+${increment}`;
  }

  private formatInitialMinutes(initialSeconds: number): string {
    if (initialSeconds < 60) return `${initialSeconds}s`;
    const minutes = initialSeconds / 60;
    return Number.isInteger(minutes) ? String(minutes) : String(Number(minutes.toFixed(1)));
  }

  private normalizedTimeControlSearch(value?: string | null): string {
    return (value || '').toLowerCase().replace(/\s+/g, '').replace(/\+0$/, '+0');
  }
}

function readApiError(err: unknown, fallback: string): string {
  if (typeof err === 'object' && err !== null) {
    const maybeHttp = err as { error?: { message?: string; error?: string }; message?: string };
    return maybeHttp.error?.message || maybeHttp.error?.error || maybeHttp.message || fallback;
  }
  return fallback;
}
