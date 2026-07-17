import { computed, effect, inject, Injectable, signal } from '@angular/core';
import type { JobRunKind } from '@chess-trainer/contracts/jobs';
import { firstValueFrom } from 'rxjs';
import { ImportedGameJobStore } from '../../../core/jobs/imported-game-job.store';
import { emptyImportedGameFacets } from '../../../shared/games/game.models';
import { defaultGameFilters, GameFilters } from '../../../shared/games/filters/game-filter.model';
import { isStandardImportedGameSpeed } from '../../../shared/games/imported-game-workflow-eligibility';
import { GamesApiService } from '../data-access/games-api.service';
import {
  ImportedGameFacetsResponse,
  ImportedGamePageInfo,
  ImportedGameSearchItem,
  ImportedGameSearchResponse,
} from '../data-access/games.models';

@Injectable()
export class GamesExplorerStore {
  private readonly api = inject(GamesApiService);
  private readonly jobs = inject(ImportedGameJobStore);
  private lastTerminalSequence = 0;

  readonly games = signal<ImportedGameSearchItem[]>([]);
  readonly facets = signal<ImportedGameFacetsResponse>(emptyImportedGameFacets());
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly submittingKind = signal<JobRunKind | null>(null);
  readonly pageInfo = signal<ImportedGamePageInfo>({ nextCursor: null, hasMore: false });
  readonly filters = signal<GameFilters>(defaultGameFilters());

  readonly filteredGames = computed(() => this.games());
  readonly analysedCount = computed(
    () => this.filteredGames().filter((game) => game.analysis?.status === 'COMPLETED').length,
  );
  readonly plyIndexedCount = computed(
    () => this.filteredGames().filter((game) => game.plyIndex?.status === 'INDEXED').length,
  );
  readonly bulkIndexableGames = computed(() =>
    this.filteredGames().filter((game) =>
      isStandardImportedGameSpeed(game.speedCategory)
      && game.plyIndex?.status !== 'INDEXED'
      && !this.jobs.isGameActive(game.id),
    ),
  );
  readonly bulkAnalyzableGames = computed(() =>
    this.filteredGames().filter((game) =>
      isStandardImportedGameSpeed(game.speedCategory)
      && game.plyIndex?.status === 'INDEXED'
      && !this.jobs.isGameActive(game.id),
    ),
  );
  readonly bulkIndexProgressLabel = computed(() =>
    this.submittingKind() === 'INDEX_GAMES'
      ? 'Starting...'
      : String(this.bulkIndexableGames().length),
  );
  readonly bulkRefreshTagsProgressLabel = computed(() =>
    this.submittingKind() === 'REFRESH_TAGS'
      ? 'Starting...'
      : String(this.filteredGames().filter((game) => !this.jobs.isGameActive(game.id)).length),
  );
  readonly batchAnalysisProgressLabel = computed(() =>
    this.submittingKind() === 'ANALYSE_GAMES'
      ? 'Starting...'
      : String(this.bulkAnalyzableGames().length),
  );
  readonly tableSubtitle = computed(() => {
    const filteredGames = this.filteredGames();
    const games = this.games();
    const pageInfo = this.pageInfo();
    if (this.loading() && filteredGames.length === 0) return 'Loading matching games...';
    if (filteredGames.length === 0) return 'No games loaded';
    const totalNote = filteredGames.length === games.length ? '' : ` · ${games.length} fetched`;
    return `${filteredGames.length} games shown${totalNote}${pageInfo.hasMore ? ' · more available' : ''}`;
  });

  constructor() {
    effect(() => {
      const batch = this.jobs.terminalBatch();
      if (!batch || batch.sequence === this.lastTerminalSequence) return;
      this.lastTerminalSequence = batch.sequence;
      const visibleIds = new Set(this.games().map((game) => game.id));
      if (batch.gameIds.some((gameId) => visibleIds.has(gameId))) {
        void this.reloadCurrentList();
      }
    });
  }

  loadFacets(): void {
    this.api.getFacets().subscribe({
      next: (data) => this.facets.set(data),
    });
  }

  refresh(): void {
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
      error: (error) => {
        this.error.set(readApiError(error, 'Could not load imported games.'));
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

  analyse(game: ImportedGameSearchItem): void {
    if (!this.canAnalyse(game)) return;
    void this.submitJob('ANALYSE_GAMES', [game.id]);
  }

  forceReanalyse(game: ImportedGameSearchItem): void {
    if (!this.canAnalyse(game)) return;
    void this.submitJob('ANALYSE_GAMES', [game.id], true);
  }

  indexPlies(game: ImportedGameSearchItem): void {
    if (game.plyIndex?.status === 'INDEXED' || this.jobs.isGameActive(game.id)) return;
    void this.submitJob('INDEX_GAMES', [game.id], game.plyIndex?.status === 'FAILED');
  }

  indexAllVisibleGames(): void {
    void this.submitJob(
      'INDEX_GAMES',
      this.bulkIndexableGames().map((game) => game.id),
    );
  }

  batchAnalyzeVisibleGames(): void {
    void this.submitJob(
      'ANALYSE_GAMES',
      this.bulkAnalyzableGames().map((game) => game.id),
    );
  }

  refreshTagsForVisibleGames(): void {
    const gameIds = this.filteredGames()
      .filter((game) => !this.jobs.isGameActive(game.id))
      .map((game) => game.id);
    void this.submitJob('REFRESH_TAGS', gameIds);
  }

  isSubmitting(kind: JobRunKind): boolean {
    return this.submittingKind() === kind;
  }

  private canAnalyse(game: ImportedGameSearchItem): boolean {
    if (this.jobs.isGameActive(game.id)) return false;
    if (!isStandardImportedGameSpeed(game.speedCategory)) {
      this.error.set('Only blitz and rapid games are eligible for saved analysis.');
      return false;
    }
    if (game.plyIndex?.status !== 'INDEXED') {
      this.error.set('Index game plies before starting analysis.');
      return false;
    }
    return true;
  }

  private async submitJob(
    kind: JobRunKind,
    gameIds: readonly number[],
    force = false,
  ): Promise<void> {
    if (!gameIds.length || this.submittingKind() !== null) return;

    this.error.set(null);
    this.submittingKind.set(kind);
    try {
      const response = await this.jobs.submit(kind, gameIds, force);
      if (response.rejectedGameIds.length) {
        this.error.set(
          `${response.rejectedGameIds.length} selected ${response.rejectedGameIds.length === 1 ? 'game was' : 'games were'} not available for this job.`,
        );
      }
    } catch (error) {
      this.error.set(readApiError(error, 'Could not submit imported-game job.'));
    } finally {
      this.submittingKind.set(null);
    }
  }

  private async reloadCurrentList(): Promise<void> {
    const targetCount = Math.max(1, this.games().length);
    const items: ImportedGameSearchItem[] = [];
    let cursor: string | null = null;
    let pageInfo: ImportedGamePageInfo = { nextCursor: null, hasMore: false };

    try {
      do {
        const data: ImportedGameSearchResponse = await firstValueFrom(
          this.api.searchGames(this.filters(), cursor),
        );
        items.push(...data.items);
        pageInfo = data.pageInfo;
        cursor = data.pageInfo.nextCursor;
      } while (pageInfo.hasMore && cursor && items.length < targetCount);

      this.games.set(items);
      this.pageInfo.set(pageInfo);
    } catch (error) {
      this.error.set(readApiError(error, 'Job finished, but the game list could not be refreshed.'));
    }
  }
}

function readApiError(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null) {
    const candidate = error as {
      error?: { message?: string; error?: string };
      message?: string;
    };
    return candidate.error?.message || candidate.error?.error || candidate.message || fallback;
  }
  return fallback;
}
