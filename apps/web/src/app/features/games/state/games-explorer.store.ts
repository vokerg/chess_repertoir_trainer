import type { GameLibrary } from '@chess-trainer/contracts/imported-games';
import { computed, effect, inject, Injectable, signal } from '@angular/core';
import type { JobRunKind } from '@chess-trainer/contracts/jobs';
import { firstValueFrom } from 'rxjs';
import { ImportedGameJobStore } from '../../../core/jobs/imported-game-job.store';
import { emptyImportedGameFacets } from '../../../shared/games/game.models';
import type { GameFilters } from '../../../shared/games/filters/game-filter.model';
import type { ImportedGameSearchCriteria } from '../../../shared/games/filters/imported-game-search-query.codec';
import { isStandardImportedGameSpeed } from '../../../shared/games/imported-game-workflow-eligibility';
import { GamesApiService } from '../data-access/games-api.service';
import type {
  ImportedGameFacetsResponse,
  ImportedGamePageInfo,
  ImportedGameSearchItem,
  ImportedGameSearchResponse,
} from '../data-access/games.models';
import {
  defaultGamesExplorerQuery,
  importedGameSearchCriteriaEqual,
  patchGamesExplorerDraftQuery,
  projectGamesExplorerFilters,
  summarizeUnrepresentedGamesExplorerCriteria,
} from '../helpers/games-explorer-route-query.helpers';

@Injectable()
export class GamesExplorerStore {
  private readonly api = inject(GamesApiService);
  private readonly jobs = inject(ImportedGameJobStore);
  private lastTerminalSequence = 0;
  private lastSettledGameSequence = 0;
  private searchRequestId = 0;

  readonly libraries = signal<GameLibrary[]>([]);
  readonly librariesLoading = signal(false);
  readonly collectionError = signal<string | null>(null);
  readonly libraryBusy = signal(false);
  readonly savingGameIds = signal<readonly number[]>([]);

  async loadLibraries(): Promise<void> {
    this.librariesLoading.set(true);
    this.collectionError.set(null);
    try {
      this.libraries.set((await firstValueFrom(this.api.getLibraries())).items);
    } catch (error) {
      this.collectionError.set(readApiError(error, 'Could not load game libraries.'));
    } finally {
      this.librariesLoading.set(false);
    }
  }

  async saveLibrary(name: string, id?: number): Promise<boolean> {
    if (this.libraryBusy() || !name.trim()) return false;
    this.libraryBusy.set(true);
    this.collectionError.set(null);
    try {
      if (id !== undefined) {
        await firstValueFrom(this.api.renameLibrary(id, name.trim()));
        this.libraries.update((items) => items.map((item) => item.id === id ? { ...item, name: name.trim() } : item));
      } else {
        const created = await firstValueFrom(this.api.createLibrary(name.trim()));
        this.libraries.update((items) => [...items, created]);
      }
      return true;
    } catch (error) {
      this.collectionError.set(readApiError(error, 'Could not save game library.'));
      return false;
    } finally {
      this.libraryBusy.set(false);
    }
  }

  async deleteLibrary(id: number): Promise<boolean> {
    if (this.libraryBusy()) return false;
    this.libraryBusy.set(true);
    this.collectionError.set(null);
    try {
      await firstValueFrom(this.api.deleteLibrary(id));
      this.libraries.update((items) => items.filter((item) => item.id !== id));
      this.games.update((games) => games.map((game) => ({ ...game, libraryIds: game.libraryIds?.filter((value) => value !== id) })));
      return true;
    } catch (error) {
      this.collectionError.set(readApiError(error, 'Could not delete game library.'));
      return false;
    } finally {
      this.libraryBusy.set(false);
    }
  }

  async toggleLike(game: ImportedGameSearchItem): Promise<void> {
    await this.saveGameCollection(game, async () => {
      const liked = !game.liked;
      await firstValueFrom(this.api.setLiked(game.id, liked));
      return { liked };
    });
  }

  async toggleMembership(game: ImportedGameSearchItem, libraryId: number): Promise<void> {
    await this.saveGameCollection(game, async () => {
      const ids = game.libraryIds ?? [];
      const included = !ids.includes(libraryId);
      await firstValueFrom(this.api.setMembership(libraryId, game.id, included));
      this.libraries.update((items) => items.map((item) => item.id === libraryId
        ? { ...item, gameCount: Math.max(0, item.gameCount + (included ? 1 : -1)) } : item));
      return { libraryIds: included ? [...ids, libraryId] : ids.filter((id) => id !== libraryId) };
    });
  }

  private async saveGameCollection(game: ImportedGameSearchItem, save: () => Promise<Partial<Pick<ImportedGameSearchItem, 'liked' | 'libraryIds'>>>): Promise<void> {
    if (this.savingGameIds().includes(game.id)) return;
    this.savingGameIds.update((ids) => [...ids, game.id]);
    this.collectionError.set(null);
    const query = this.appliedQuery();
    const requestId = this.searchRequestId;
    try {
      const updated = await save();
      // Ignore a mutation response from a previous route/search.
      if (requestId !== this.searchRequestId) return;
      this.games.update((games) => games.flatMap((item) => {
        if (item.id !== game.id) return [item];
        const patched = { ...item, ...updated };
        const matches = (query.liked === undefined || patched.liked === query.liked) &&
          (!query.libraryId || patched.libraryIds?.includes(query.libraryId));
        return matches ? [patched] : [];
      }));
    } catch (error) {
      this.collectionError.set(readApiError(error, 'Could not save game. Please try again.'));
    } finally {
      this.savingGameIds.update((ids) => ids.filter((id) => id !== game.id));
    }
  }

  readonly games = signal<ImportedGameSearchItem[]>([]);
  readonly facets = signal<ImportedGameFacetsResponse>(emptyImportedGameFacets());
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly submittingKind = signal<JobRunKind | null>(null);
  readonly pageInfo = signal<ImportedGamePageInfo>({ nextCursor: null, hasMore: false });
  readonly appliedQuery = signal<ImportedGameSearchCriteria>(defaultGamesExplorerQuery());
  readonly draftQuery = signal<ImportedGameSearchCriteria>(defaultGamesExplorerQuery());
  readonly filters = computed<GameFilters>(() => projectGamesExplorerFilters(this.draftQuery()));
  readonly unrepresentedCriteriaSummary = computed(() =>
    summarizeUnrepresentedGamesExplorerCriteria(this.appliedQuery()),
  );
  readonly filteredGames = computed(() => this.games());
  readonly analysedCount = computed(
    () => this.filteredGames().filter((game) => game.analysis?.status === 'COMPLETED').length,
  );
  readonly plyIndexedCount = computed(
    () => this.filteredGames().filter((game) => game.plyIndex?.status === 'INDEXED').length,
  );
  readonly bulkIndexableGames = computed(() =>
    this.filteredGames().filter(
      (game) =>
        isStandardImportedGameSpeed(game.speedCategory) &&
        game.plyIndex?.status !== 'INDEXED' &&
        !this.jobs.isGameActive(game.id),
    ),
  );
  readonly bulkAnalyzableGames = computed(() =>
    this.filteredGames().filter(
      (game) =>
        isStandardImportedGameSpeed(game.speedCategory) &&
        game.analysis?.status !== 'COMPLETED' &&
        !this.jobs.isGameActive(game.id),
    ),
  );
  readonly bulkIndexProgressLabel = computed(() =>
    this.submittingKind() === 'INDEX_GAMES'
      ? 'Starting...'
      : String(this.bulkIndexableGames().length),
  );
  readonly analysisProgressLabel = computed(() =>
    this.submittingKind() === 'PROCESS_GAMES'
      ? 'Starting...'
      : String(this.bulkAnalyzableGames().length),
  );
  readonly tableSubtitle = computed(() => {
    const games = this.games();
    const pageInfo = this.pageInfo();
    if (this.loading() && games.length === 0) return 'Loading matching games...';
    if (games.length === 0) return 'No games loaded';
    return `${games.length} games shown${pageInfo.hasMore ? ' · more available' : ''}`;
  });

  constructor() {
    effect(() => {
      const batch = this.jobs.terminalBatch();
      if (!batch || batch.sequence === this.lastTerminalSequence) return;
      this.lastTerminalSequence = batch.sequence;
      const visibleIds = new Set(this.games().map((game) => game.id));
      if (batch.gameIds.some((gameId) => visibleIds.has(gameId))) void this.reloadCurrentList();
    });

    effect(() => {
      const batch = this.jobs.settledGameBatch();
      if (!batch || batch.sequence === this.lastSettledGameSequence) return;
      this.lastSettledGameSequence = batch.sequence;
      const visibleIds = new Set(this.games().map((game) => game.id));
      if (batch.gameIds.some((gameId) => visibleIds.has(gameId))) void this.reloadCurrentList();
    });
  }

  loadFacets(): void {
    this.api.getFacets().subscribe({ next: (data) => this.facets.set(data) });
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
      error: (error) => {
        if (requestId !== this.searchRequestId) return;
        this.error.set(readApiError(error, 'Could not load imported games.'));
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

  applyRouteQuery(query: ImportedGameSearchCriteria, load = true): void {
    this.appliedQuery.set(query);
    this.draftQuery.set(query);
    if (load) this.refresh();
    else {
      ++this.searchRequestId;
      this.games.set([]);
      this.pageInfo.set({ nextCursor: null, hasMore: false });
      this.loading.set(false);
    }
  }

  analyse(game: ImportedGameSearchItem): void {
    if (this.canAnalyse(game)) void this.submitJob('PROCESS_GAMES', [game.id]);
  }

  indexAllVisibleGames(): void {
    void this.submitJob(
      'INDEX_GAMES',
      this.bulkIndexableGames().map((game) => game.id),
    );
  }

  analyseVisibleGames(): void {
    void this.submitJob(
      'PROCESS_GAMES',
      this.bulkAnalyzableGames().map((game) => game.id),
    );
  }

  private canAnalyse(game: ImportedGameSearchItem): boolean {
    if (this.jobs.isGameActive(game.id)) return false;
    if (!isStandardImportedGameSpeed(game.speedCategory)) {
      this.error.set('Only blitz and rapid games are eligible for saved analysis.');
      return false;
    }
    if (game.analysis?.status === 'COMPLETED') {
      this.error.set('This game has already been analysed.');
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
        const count = response.rejectedGameIds.length;
        this.error.set(
          `${count} selected ${count === 1 ? 'game was' : 'games were'} not available for this job.`,
        );
      }
    } catch (error) {
      this.error.set(readApiError(error, 'Could not submit imported-game job.'));
    } finally {
      this.submittingKind.set(null);
    }
  }

  private async reloadCurrentList(): Promise<void> {
    const query = this.appliedQuery();
    const targetCount = Math.max(1, this.games().length);
    const items: ImportedGameSearchItem[] = [];
    let cursor: string | null = null;
    let pageInfo: ImportedGamePageInfo = { nextCursor: null, hasMore: false };
    try {
      do {
        const data: ImportedGameSearchResponse = await firstValueFrom(
          this.api.searchGames(query, cursor),
        );
        items.push(...data.items);
        pageInfo = data.pageInfo;
        cursor = data.pageInfo.nextCursor;
      } while (pageInfo.hasMore && cursor && items.length < targetCount);

      if (importedGameSearchCriteriaEqual(this.appliedQuery(), query)) {
        this.games.set(items);
        this.pageInfo.set(pageInfo);
      }
    } catch (error) {
      this.error.set(
        readApiError(error, 'Job finished, but the game list could not be refreshed.'),
      );
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
