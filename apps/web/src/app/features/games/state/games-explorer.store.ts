import { computed, inject, Injectable, OnDestroy, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { GamesApiService } from '../data-access/games-api.service';
import {
  ImportedGameFacetsResponse,
  ImportedGameAnalysisRun,
  ImportedGameListItem,
  ImportedGamePageInfo,
  ImportedGamePlyIndexResult,
} from '../data-access/games.models';
import { defaultGameFilters, GameFilters } from '../filters/game-filter.model';

@Injectable()
export class GamesExplorerStore implements OnDestroy {
  private readonly api = inject(GamesApiService);
  private analysisPollTimer?: ReturnType<typeof setTimeout>;

  readonly games = signal<ImportedGameListItem[]>([]);
  readonly facets = signal<ImportedGameFacetsResponse>({});
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly analysingGameId = signal<number | null>(null);
  readonly indexingPlyGameId = signal<number | null>(null);
  readonly bulkIndexing = signal(false);
  readonly bulkIndexCompleted = signal(0);
  readonly bulkIndexTotal = signal(0);
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

  ngOnDestroy(): void {
    this.clearAnalysisPolling();
  }

  refresh(): void {
    this.clearAnalysisPolling();
    this.resetBulkIndexState();
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
        this.scheduleAnalysisPolling();
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
    const force = game.plyIndex?.status === 'FAILED';
    this.api.indexPlies(game.id, force).subscribe({
      next: () => {
        this.indexingPlyGameId.set(null);
        this.refresh();
      },
      error: (err) => {
        this.error.set(readApiError(err, 'Could not index game plies.'));
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
      return;
    }
    this.refresh();
  }

  private runAnalysis(game: ImportedGameListItem, force = false): void {
    this.analysingGameId.set(game.id);
    this.error.set(null);
    this.api.startAnalysis(game.id, force).subscribe({
      next: (result) => {
        this.analysingGameId.set(null);
        this.applyAnalysisRun(result.run);
        if (this.filters().analysisStatus) {
          this.loadGames();
        } else {
          this.scheduleAnalysisPolling();
        }
      },
      error: (err) => {
        this.error.set(readApiError(err, 'Could not start game analysis.'));
        this.analysingGameId.set(null);
      },
    });
  }

  private async indexSingleGame(game: ImportedGameListItem): Promise<void> {
    this.indexingPlyGameId.set(game.id);
    const force = game.plyIndex?.status === 'FAILED';
    const result = await firstValueFrom(this.api.indexPlies(game.id, force));

    if (result.status === 'FAILED') {
      game.plyIndex.status = 'FAILED';
      game.plyIndex.error = result.error || 'Could not index game plies.';
      throw new Error(game.plyIndex.error);
    }

    this.markIndexed(game, result);
  }

  private markIndexed(game: ImportedGameListItem, result: ImportedGamePlyIndexResult): void {
    game.plyIndex.status = 'INDEXED';
    game.plyIndex.indexedAt = result.plyIndexedAt ?? game.plyIndex.indexedAt ?? null;
    game.plyIndex.error = null;
  }

  private applyAnalysisRun(run: ImportedGameAnalysisRun): void {
    this.games.update((games) => games.map((game) => {
      if (game.id !== run.importedGameId) return game;
      return {
        ...game,
        analysis: {
          ...game.analysis,
          status: run.status,
          runId: run.id,
          depth: run.depth ?? null,
          completedAt: run.completedAt ?? null,
          createdAt: run.createdAt ?? null,
          whiteAccuracy: run.whiteAccuracy ?? null,
          blackAccuracy: run.blackAccuracy ?? null,
          userAccuracy: userAccuracyForGame(game, run),
          summary: run.summary ?? null,
          criticalMoveCount: Array.isArray(run.criticalMoves) ? run.criticalMoves.length : null,
        },
      };
    }));
  }

  private resetBulkIndexState(): void {
    this.bulkIndexing.set(false);
    this.bulkIndexCompleted.set(0);
    this.bulkIndexTotal.set(0);
  }

  private scheduleAnalysisPolling(): void {
    this.clearAnalysisPolling();
    if (!this.games().some((game) => isAnalysisActive(game))) return;

    this.analysisPollTimer = setTimeout(() => {
      this.analysisPollTimer = undefined;
      if (this.loading()) {
        this.scheduleAnalysisPolling();
        return;
      }
      this.loadGames();
    }, 3000);
  }

  private clearAnalysisPolling(): void {
    if (!this.analysisPollTimer) return;
    clearTimeout(this.analysisPollTimer);
    this.analysisPollTimer = undefined;
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

function isAnalysisActive(game: ImportedGameListItem): boolean {
  return game.analysis?.status === 'QUEUED' || game.analysis?.status === 'RUNNING';
}

function userAccuracyForGame(game: ImportedGameListItem, run: ImportedGameAnalysisRun): number | null {
  if (game.userColor === 'WHITE') return run.whiteAccuracy ?? null;
  if (game.userColor === 'BLACK') return run.blackAccuracy ?? null;
  return null;
}
