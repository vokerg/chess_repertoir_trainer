import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { CreateImportedGameJobRunResponse, JobRunKind } from '@chess-trainer/contracts/jobs';
import { of } from 'rxjs';
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
    api = jasmine.createSpyObj<GamesApiService>('GamesApiService', ['getFacets', 'searchGames']);
    submit = jasmine.createSpy('submit').and.callFake(
      async (kind: JobRunKind, gameIds: readonly number[], force = false) => acceptedJob(kind, gameIds, force),
    );
    isGameActive = jasmine.createSpy('isGameActive').and.returnValue(false);
    settledGameBatch = signal(null);
    TestBed.configureTestingModule({
      providers: [
        GamesExplorerStore,
        { provide: GamesApiService, useValue: api },
        { provide: ImportedGameJobStore, useValue: { terminalBatch: signal(null), settledGameBatch, submit, isGameActive } },
      ],
    });
    store = TestBed.inject(GamesExplorerStore);
    store.games.set([game(1), game(2)]);
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
    store.games.set([game(1, 'bullet'), game(2, 'blitz'), game(3, 'rapid'), game(4, 'rapid', true)]);
    expect(store.bulkIndexableGames().map((item) => item.id)).toEqual([2]);
    expect(store.bulkAnalyzableGames().map((item) => item.id)).toEqual([4]);
  });

  it('submits durable jobs without optimistic row mutation', async () => {
    const original = store.games()[0];
    store.indexPlies(original);
    await settlePromises();
    expect(submit).toHaveBeenCalledOnceWith('INDEX_GAMES', [1], false);
    expect(store.games()[0]).toBe(original);
  });

  it('submits forced analysis and visible bulk commands through the job store', async () => {
    store.games.set([game(1, 'blitz', true), game(2, 'rapid'), game(3, 'bullet', true)]);
    store.forceReanalyse(store.games()[0]);
    await settlePromises();
    store.batchAnalyzeVisibleGames();
    await settlePromises();
    expect(submit.calls.allArgs()).toEqual([
      ['ANALYSE_GAMES', [1], true],
      ['ANALYSE_GAMES', [1], false],
    ]);
  });

  it('submits all visible index and tag candidates as durable jobs', async () => {
    store.games.set([game(1, 'blitz'), game(2, 'rapid'), game(3, 'bullet')]);
    store.indexAllVisibleGames();
    await settlePromises();
    store.refreshTagsForVisibleGames();
    await settlePromises();
    expect(submit.calls.allArgs()).toEqual([
      ['INDEX_GAMES', [1, 2], false],
      ['REFRESH_TAGS', [1, 2, 3], false],
    ]);
  });

  it('surfaces rejected games without pretending rows are running', async () => {
    store.games.set([game(1, 'rapid', true)]);
    submit.and.resolveTo({ ...acceptedJob('ANALYSE_GAMES', [1], false), rejectedGameIds: [1] });
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
      ...defaultGamesExplorerQuery(), providers: ['CHESS_COM', 'LICHESS'], variant: ['chess960', 'standard'],
      openingEco: ['B20', 'C50'], classification: ['BLUNDER'], minUserRating: 1500,
    };
    store.appliedQuery.set(query);
    store.draftQuery.set(query);
    store.setFilters({ ...store.filters(), opponent: 'New opponent' });
    expect(store.draftQuery()).toEqual(jasmine.objectContaining({ opponent: 'New opponent', variant: ['chess960', 'standard'], openingEco: ['B20', 'C50'] }));
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

function acceptedJob(kind: JobRunKind, gameIds: readonly number[], force: boolean): CreateImportedGameJobRunResponse {
  return { jobRun: { id: 100, kind, source: 'USER_ACTION', priority: 300, status: 'QUEUED', totalTasks: gameIds.length, force, taskCounts: { queued: gameIds.length, running: 0, completed: 0, skipped: 0, failed: 0, cancelled: 0 }, createdAt: '2026-07-17T10:00:00.000Z', updatedAt: '2026-07-17T10:00:00.000Z', startedAt: null, completedAt: null }, rejectedGameIds: [] };
}

function game(id: number, speedCategory: string | null = 'rapid', indexed = false): ImportedGameSearchItem {
  return { id, provider: 'LICHESS', providerUrl: null, endedAt: null, speedCategory, rated: null, timeControl: { raw: null, initial: null, increment: null }, white: { username: null, rating: null }, black: { username: null, rating: null }, userColor: null, resultForUser: null, opening: { eco: null, name: null }, tagCount: 0, plyIndex: { status: indexed ? 'INDEXED' : 'NOT_INDEXED' }, analysis: { status: 'NOT_ANALYZED', whiteAccuracy: null, blackAccuracy: null, userAccuracy: null } };
}

function searchResponse(items: ImportedGameSearchItem[]) {
  return { items, pageInfo: { nextCursor: null, hasMore: false }, appliedFilters: { sort: 'endedAtDesc' as const, limit: 50 } };
}

async function settlePromises(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}
