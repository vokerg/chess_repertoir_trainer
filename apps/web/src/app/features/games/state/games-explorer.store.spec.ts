import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { CreateImportedGameJobRunResponse, JobRunKind } from '@chess-trainer/contracts/jobs';
import { ImportedGameJobStore } from '../../../core/jobs/imported-game-job.store';
import { GamesApiService } from '../data-access/games-api.service';
import { ImportedGameSearchItem } from '../data-access/games.models';
import { GamesExplorerStore } from './games-explorer.store';

describe('GamesExplorerStore', () => {
  let store: GamesExplorerStore;
  let api: jasmine.SpyObj<GamesApiService>;
  let submit: jasmine.Spy;
  let isGameActive: jasmine.Spy;

  beforeEach(() => {
    api = jasmine.createSpyObj<GamesApiService>('GamesApiService', [
      'getFacets',
      'searchGames',
    ]);
    submit = jasmine.createSpy('submit').and.callFake(
      async (kind: JobRunKind, gameIds: readonly number[], force = false) =>
        acceptedJob(kind, gameIds, force),
    );
    isGameActive = jasmine.createSpy('isGameActive').and.returnValue(false);

    TestBed.configureTestingModule({
      providers: [
        GamesExplorerStore,
        { provide: GamesApiService, useValue: api },
        {
          provide: ImportedGameJobStore,
          useValue: {
            terminalBatch: signal(null),
            submit,
            isGameActive,
          },
        },
      ],
    });
    store = TestBed.inject(GamesExplorerStore);
    store.games.set([game(1), game(2)]);
  });

  it('only includes blitz and rapid games without active jobs in bulk index candidates', () => {
    isGameActive.and.callFake((gameId: number) => gameId === 3);
    store.games.set([
      game(1, 'bullet'),
      game(2, 'blitz'),
      game(3, 'rapid'),
      { ...game(4, 'rapid'), plyIndex: { status: 'INDEXED' } },
    ]);

    expect(store.bulkIndexableGames().map((item) => item.id)).toEqual([2]);
  });

  it('submits one-game indexing without optimistic row mutation', async () => {
    const original = store.games()[0];

    store.indexPlies(original);
    await settlePromises();

    expect(submit).toHaveBeenCalledOnceWith('INDEX_GAMES', [1], false);
    expect(store.games()[0]).toBe(original);
    expect(store.games()[0].plyIndex.status).toBe('NOT_INDEXED');
  });

  it('submits forced one-game analysis through the persistent job store', async () => {
    store.forceReanalyse(store.games()[0]);
    await settlePromises();

    expect(submit).toHaveBeenCalledOnceWith('ANALYSE_GAMES', [1], true);
    expect(store.games()[0].analysis.status).toBe('NOT_ANALYZED');
  });

  it('submits all visible indexing candidates as one durable job', async () => {
    store.games.set([game(1, 'blitz'), game(2, 'rapid'), game(3, 'bullet')]);

    store.indexAllVisibleGames();
    await settlePromises();

    expect(submit).toHaveBeenCalledOnceWith('INDEX_GAMES', [1, 2], false);
  });

  it('submits visible tag refresh as one durable job', async () => {
    store.refreshTagsForVisibleGames();
    await settlePromises();

    expect(submit).toHaveBeenCalledOnceWith('REFRESH_TAGS', [1, 2], false);
  });

  it('surfaces rejected games without pretending the rows are running', async () => {
    submit.and.resolveTo({
      ...acceptedJob('ANALYSE_GAMES', [1], false),
      rejectedGameIds: [1],
    });

    store.analyse(store.games()[0]);
    await settlePromises();

    expect(store.error()).toContain('1 selected game was not available');
    expect(store.games()[0].analysis.status).toBe('NOT_ANALYZED');
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
    plyIndex: { status: 'NOT_INDEXED' },
    analysis: {
      status: 'NOT_ANALYZED',
      whiteAccuracy: null,
      blackAccuracy: null,
      userAccuracy: null,
    },
  };
}

async function settlePromises(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}
