import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { CreateImportedGameJobRunResponse, JobRunKind } from '@chess-trainer/contracts/jobs';
import { of, Subject, throwError } from 'rxjs';
import { ImportedGameJobStore } from '../../../core/jobs/imported-game-job.store';
import type { ImportedGameSearchCriteria } from '../../../shared/games/filters/imported-game-search-query.codec';
import { GamesApiService } from '../data-access/games-api.service';
import type { ImportedGameSearchItem } from '../data-access/games.models';
import { defaultGamesExplorerQuery } from '../helpers/games-explorer-route-query.helpers';
import { GamesExplorerStore } from './games-explorer.store';

describe('GamesExplorerStore', () => {
  let store: GamesExplorerStore;
  let api: jasmine.SpyObj<GamesApiService>;
  let submit: jasmine.Spy;
  let isGameActive: jasmine.Spy;
  let settledGameBatch: ReturnType<typeof signal>;

  beforeEach(() => {
    api = jasmine.createSpyObj<GamesApiService>('GamesApiService', ['getFacets', 'searchGames', 'setLiked', 'setMembership', 'createLibrary', 'renameLibrary', 'deleteLibrary', 'getLibraries']);
    submit = jasmine
      .createSpy('submit')
      .and.callFake(async (kind: JobRunKind, gameIds: readonly number[], force = false) =>
        acceptedJob(kind, gameIds, force),
      );
    isGameActive = jasmine.createSpy('isGameActive').and.returnValue(false);
    settledGameBatch = signal(null);
    TestBed.configureTestingModule({
      providers: [
        GamesExplorerStore,
        { provide: GamesApiService, useValue: api },
        {
          provide: ImportedGameJobStore,
          useValue: { terminalBatch: signal(null), settledGameBatch, submit, isGameActive },
        },
      ],
    });
    store = TestBed.inject(GamesExplorerStore);
    store.games.set([game(1), game(2)]);
  });

  it('likes a game without resetting filters, pagination, or other rows', async () => {
    api.setLiked.and.returnValue(of({ success: true }));
    store.pageInfo.set({ hasMore: true, nextCursor: 'next' });
    const query = store.appliedQuery();
    await store.toggleLike(store.games()[0]);
    expect(store.games()[0].liked).toBeTrue();
    expect(store.games()[1].id).toBe(2);
    expect(store.appliedQuery()).toBe(query);
    expect(store.pageInfo().nextCursor).toBe('next');
    expect(api.searchGames).not.toHaveBeenCalled();
  });

  it('removes an unliked row from Liked games and preserves rows after a failed write', async () => {
    store.appliedQuery.set({ sort: 'endedAtDesc', limit: 50, liked: true });
    store.games.set([{ ...game(1), liked: true }]);
    api.setLiked.and.returnValue(throwError(() => new Error('Offline')));
    await store.toggleLike(store.games()[0]);
    expect(store.games().length).toBe(1);
    expect(store.collectionError()).toBe('Offline');
    expect(store.savingGameIds()).toEqual([]);
    api.setLiked.and.returnValue(of({ success: true }));
    await store.toggleLike(store.games()[0]);
    expect(store.games()).toEqual([]);
  });

  it('prevents duplicate writes and ignores responses after navigation', async () => {
    const pending = new Subject<{ success: true }>();
    api.setLiked.and.returnValue(pending);
    const original = store.games()[0];
    const saving = store.toggleLike(original);
    await store.toggleLike(original);
    expect(api.setLiked).toHaveBeenCalledTimes(1);
    api.searchGames.and.returnValue(of(searchResponse([game(3)])));
    store.applyRouteQuery({ sort: 'endedAtDesc', limit: 50, libraryId: 4 });
    pending.next({ success: true });
    pending.complete();
    await saving;
    expect(store.games().map((row) => row.id)).toEqual([3]);
  });

  it('keeps likes and other memberships when removing a game from one library', async () => {
    store.appliedQuery.set({ sort: 'endedAtDesc', limit: 50, libraryId: 4 });
    store.games.set([{ ...game(1), liked: true, libraryIds: [4, 5] }]);
    store.libraries.set([{ id: 4, name: 'Study', gameCount: 1 }, { id: 5, name: 'Other', gameCount: 1 }]);
    api.setMembership.and.returnValue(of({ success: true }));
    await store.toggleMembership(store.games()[0], 4);
    expect(api.setMembership).toHaveBeenCalledOnceWith(4, 1, false);
    expect(store.games()).toEqual([]);
    expect(store.libraries().map((item) => item.gameCount)).toEqual([0, 1]);
    expect(api.setLiked).not.toHaveBeenCalled();
  });

  it('reloads visible rows once when an individual task settles', async () => {
    api.searchGames.and.returnValue(of(searchResponse([game(1), game(2)])));
    settledGameBatch.set({ sequence: 1, gameIds: [1] });
    TestBed.tick();
    await settlePromises();
    expect(api.searchGames).toHaveBeenCalledOnceWith(store.appliedQuery(), null);

    settledGameBatch.set({ sequence: 1, gameIds: [1] });
    TestBed.tick();
    await settlePromises();
    expect(api.searchGames).toHaveBeenCalledTimes(1);

    settledGameBatch.set({ sequence: 2, gameIds: [99] });
    TestBed.tick();
    await settlePromises();
    expect(api.searchGames).toHaveBeenCalledTimes(1);
  });
  it('only includes eligible inactive games in bulk candidates', () => {
    isGameActive.and.callFake((gameId: number) => gameId === 3);
    store.games.set([
      game(1, 'bullet'),
      game(2, 'blitz'),
      game(3, 'rapid'),
      game(4, 'rapid', true),
      game(5, 'rapid', true, 'COMPLETED'),
    ]);
    expect(store.bulkIndexableGames().map((item) => item.id)).toEqual([2]);
    expect(store.bulkAnalyzableGames().map((item) => item.id)).toEqual([2, 4]);
  });

  it('submits combined processing without optimistic row mutation', async () => {
    const original = store.games()[0];
    store.analyse(original);
    await settlePromises();
    expect(submit).toHaveBeenCalledOnceWith('PROCESS_GAMES', [1], false);
    expect(store.games()[0]).toBe(original);
  });

  it('submits unanalysed visible games through the combined processing job', async () => {
    store.games.set([game(1, 'blitz', true), game(2, 'rapid'), game(3, 'bullet', true)]);
    store.analyse(store.games()[0]);
    await settlePromises();
    store.analyseVisibleGames();
    await settlePromises();
    expect(submit.calls.allArgs()).toEqual([
      ['PROCESS_GAMES', [1], false],
      ['PROCESS_GAMES', [1, 2], false],
    ]);
  });

  it('keeps bulk indexing available for visible unindexed games', async () => {
    store.games.set([game(1, 'blitz'), game(2, 'rapid'), game(3, 'bullet')]);
    store.indexAllVisibleGames();
    await settlePromises();
    expect(submit.calls.allArgs()).toEqual([['INDEX_GAMES', [1, 2], false]]);
  });

  it('surfaces rejected games without pretending rows are running', async () => {
    store.games.set([game(1, 'rapid', true)]);
    submit.and.resolveTo({ ...acceptedJob('PROCESS_GAMES', [1], false), rejectedGameIds: [1] });
    store.analyse(store.games()[0]);
    await settlePromises();
    expect(store.error()).toContain('1 selected game was not available');
    expect(store.games()[0].analysis.status).toBe('NOT_ANALYZED');
  });

  it('applies route criteria as applied and draft state and loads exactly once', () => {
    const query = { ...defaultGamesExplorerQuery(), variant: ['standard'] };
    api.searchGames.and.returnValue(of(searchResponse([game(3)])));
    store.applyRouteQuery(query);
    expect(store.appliedQuery()).toEqual(query);
    expect(store.draftQuery()).toEqual(query);
    expect(api.searchGames).toHaveBeenCalledOnceWith(query, undefined);
  });

  it('patches form fields into the draft without losing URL-only criteria', () => {
    const query: ImportedGameSearchCriteria = {
      ...defaultGamesExplorerQuery(),
      providers: ['CHESS_COM', 'LICHESS'],
      variant: ['chess960', 'standard'],
      openingEco: ['B20', 'C50'],
      classification: ['BLUNDER'],
      minUserRating: 1500,
    };
    store.appliedQuery.set(query);
    store.draftQuery.set(query);
    store.setFilters({ ...store.filters(), opponent: 'New opponent' });
    expect(store.draftQuery()).toEqual(
      jasmine.objectContaining({
        opponent: 'New opponent',
        variant: ['chess960', 'standard'],
        openingEco: ['B20', 'C50'],
      }),
    );
    expect(store.unrepresentedCriteriaSummary()).toContain('Variants: chess960, standard');
    expect(api.searchGames).not.toHaveBeenCalled();
  });

  it('loads later pages with applied criteria and appends the result', () => {
    const query = { ...defaultGamesExplorerQuery(), openingEco: ['B20'] };
    store.appliedQuery.set(query);
    store.pageInfo.set({ nextCursor: 'next-page', hasMore: true });
    api.searchGames.and.returnValue(of(searchResponse([game(3)])));
    store.loadMore();
    expect(api.searchGames).toHaveBeenCalledOnceWith(query, 'next-page');
    expect(store.games().map((item) => item.id)).toEqual([1, 2, 3]);
  });
});

function acceptedJob(
  kind: JobRunKind,
  gameIds: readonly number[],
  force: boolean,
): CreateImportedGameJobRunResponse {
  return {
    jobRun: {
      id: 100,
      kind,
      source: 'USER_ACTION',
      priority: 300,
      status: 'QUEUED',
      totalTasks: gameIds.length,
      force,
      taskCounts: {
        queued: gameIds.length,
        running: 0,
        completed: 0,
        skipped: 0,
        failed: 0,
        cancelled: 0,
      },
      createdAt: '2026-07-17T10:00:00.000Z',
      updatedAt: '2026-07-17T10:00:00.000Z',
      startedAt: null,
      completedAt: null,
    },
    rejectedGameIds: [],
  };
}

function game(
  id: number,
  speedCategory: string | null = 'rapid',
  indexed = false,
  analysisStatus: 'NOT_ANALYZED' | 'COMPLETED' = 'NOT_ANALYZED',
): ImportedGameSearchItem {
  return {
    id,
    provider: 'LICHESS',
    providerUrl: null,
    endedAt: null,
    speedCategory,
    rated: null,
    timeControl: { raw: null, initial: null, increment: null },
    white: { username: null, rating: null },
    black: { username: null, rating: null },
    userColor: null,
    resultForUser: null,
    opening: { eco: null, name: null },
    tagCount: 0,
    plyIndex: { status: indexed ? 'INDEXED' : 'NOT_INDEXED' },
    analysis: {
      status: analysisStatus,
      whiteAccuracy: null,
      blackAccuracy: null,
      userAccuracy: null,
    },
  };
}

function searchResponse(items: ImportedGameSearchItem[]) {
  return {
    items,
    pageInfo: { nextCursor: null, hasMore: false },
    appliedFilters: { sort: 'endedAtDesc' as const, limit: 50 },
  };
}

async function settlePromises(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}
