import { fakeAsync, flushMicrotasks, TestBed, tick } from '@angular/core/testing';
import type {
  CreateImportedGameJobRunResponse,
  JobRunSummary,
} from '@chess-trainer/contracts/jobs';
import { of, Subject, throwError } from 'rxjs';
import { ImportedGameJobApiService } from './imported-game-job-api.service';
import { ImportedGameJobStore } from './imported-game-job.store';

describe('ImportedGameJobStore', () => {
  let store: ImportedGameJobStore;
  let api: jasmine.SpyObj<ImportedGameJobApiService>;

  beforeEach(() => {
    api = jasmine.createSpyObj<ImportedGameJobApiService>('ImportedGameJobApiService', [
      'createJob',
      'listJobs',
      'getJob',
      'cancelJob',
      'retryJob',
      'listTasks',
    ]);
    TestBed.configureTestingModule({
      providers: [
        ImportedGameJobStore,
        { provide: ImportedGameJobApiService, useValue: api },
      ],
    });
    store = TestBed.inject(ImportedGameJobStore);
  });

  afterEach(() => store.reset());

  it('recovers active jobs and their game ids on initialization', async () => {
    const run = jobRun(10, 'ANALYSE_GAMES', 'RUNNING', 2);
    api.listJobs.and.returnValue(of({ items: [run] }));
    api.listTasks.and.returnValue(of({
      total: 2,
      items: [
        task(1, 101, 'RUNNING'),
        task(2, 102, 'QUEUED'),
      ],
    }));

    await store.initialize();

    expect(store.activeRuns()).toEqual([run]);
    expect(store.gameIdsForRun(run.id)).toEqual([101, 102]);
    expect(store.isGameActive(102, ['ANALYSE_GAMES'])).toBeTrue();
    expect(api.listJobs).toHaveBeenCalledOnceWith(true);
  });

  it('submits one deduplicated durable job and tracks accepted games immediately', async () => {
    const response: CreateImportedGameJobRunResponse = {
      jobRun: jobRun(20, 'INDEX_GAMES', 'QUEUED', 2),
      rejectedGameIds: [999],
    };
    api.createJob.and.returnValue(of(response));

    const result = await store.submit('INDEX_GAMES', [201, 201, 202, 999]);

    expect(result).toBe(response);
    expect(api.createJob).toHaveBeenCalledOnceWith('INDEX_GAMES', [201, 202, 999], false);
    expect(store.gameIdsForRun(20)).toEqual([201, 202]);
    expect(store.activeRunForGame(202)?.id).toBe(20);
  });

  it('does not poll when initialization finds no active work', async () => {
    api.listJobs.and.returnValue(of({ items: [] }));

    await store.initialize();

    expect(store.hasActiveJobs()).toBeFalse();
    expect(api.listTasks).not.toHaveBeenCalled();
  });

  it('allows initialization to retry after the active-job list fails', async () => {
    api.listJobs.and.returnValues(
      throwError(() => new Error('Temporary list failure')),
      of({ items: [] }),
    );

    await store.initialize();
    expect(store.error()).toContain('Temporary list failure');

    await store.initialize();

    expect(api.listJobs).toHaveBeenCalledTimes(2);
    expect(store.error()).toBeNull();
  });

  it('keeps polling and recovers when task hydration fails', fakeAsync(() => {
    const run = jobRun(30, 'ANALYSE_GAMES', 'RUNNING', 1);
    api.listJobs.and.returnValues(
      of({ items: [run] }),
      of({ items: [run] }),
    );
    api.listTasks.and.returnValues(
      throwError(() => new Error('Temporary task failure')),
      of({
        total: 1,
        items: [task(1, 301, 'RUNNING')],
      }),
    );

    void store.initialize();
    flushMicrotasks();

    expect(store.activeRuns()).toEqual([run]);
    expect(store.error()).toContain('Temporary task failure');

    tick(1_500);
    flushMicrotasks();

    expect(api.listJobs).toHaveBeenCalledTimes(2);
    expect(store.gameIdsForRun(run.id)).toEqual([301]);
    expect(store.error()).toBeNull();
    store.reset();
  }));

  it('discards an initialization response after reset changes the session', async () => {
    const response$ = new Subject<{ items: JobRunSummary[] }>();
    api.listJobs.and.returnValue(response$);

    const initialization = store.initialize();
    store.reset();
    response$.next({ items: [jobRun(40, 'INDEX_GAMES', 'RUNNING', 1)] });
    response$.complete();
    await initialization;

    expect(store.runs()).toEqual([]);
    expect(store.gameIdsByRun()).toEqual({});
    expect(api.listTasks).not.toHaveBeenCalled();
    expect(store.error()).toBeNull();
  });

  it('discards task hydration after reset changes the session', async () => {
    const run = jobRun(50, 'PROCESS_GAMES', 'RUNNING', 1);
    const tasks$ = new Subject<{
      total: number;
      items: ReturnType<typeof task>[];
    }>();
    api.listJobs.and.returnValue(of({ items: [run] }));
    api.listTasks.and.returnValue(tasks$);

    const initialization = store.initialize();
    await settlePromises();
    expect(api.listTasks).toHaveBeenCalled();

    store.reset();
    tasks$.next({
      total: 1,
      items: [task(1, 501, 'RUNNING')],
    });
    tasks$.complete();
    await initialization;

    expect(store.runs()).toEqual([]);
    expect(store.gameIdsByRun()).toEqual({});
    expect(store.error()).toBeNull();
  });

  it('cancels an active job and publishes its affected games', async () => {
    const active = jobRun(60, 'PROCESS_GAMES', 'RUNNING', 1);
    const cancelled = jobRun(60, 'PROCESS_GAMES', 'CANCELLED', 1);
    api.listJobs.and.returnValue(of({ items: [active] }));
    api.listTasks.and.returnValue(of({
      total: 1,
      items: [task(1, 601, 'RUNNING')],
    }));
    api.cancelJob.and.returnValue(of({ jobRun: cancelled }));

    await store.initialize();
    await store.cancel(active.id);

    expect(api.cancelJob).toHaveBeenCalledOnceWith(active.id);
    expect(store.activeRuns()).toEqual([]);
    expect(store.runs()).toContain(cancelled);
    expect(store.terminalBatch()?.runs).toEqual([cancelled]);
    expect(store.terminalBatch()?.gameIds).toEqual([601]);
  });

  it('tracks a retry as a new active job and hydrates its games', async () => {
    const retriedRun = jobRun(71, 'ANALYSE_GAMES', 'QUEUED', 1);
    api.retryJob.and.returnValue(of({
      jobRun: retriedRun,
      rejectedGameIds: [],
    }));
    api.listTasks.and.returnValue(of({
      total: 1,
      items: [task(71, 701, 'QUEUED')],
    }));

    await store.retry(70);

    expect(api.retryJob).toHaveBeenCalledOnceWith(70);
    expect(store.activeRuns()).toEqual([retriedRun]);
    expect(store.gameIdsForRun(retriedRun.id)).toEqual([701]);
    expect(store.isGameActive(701, ['ANALYSE_GAMES'])).toBeTrue();
  });
});

function jobRun(
  id: number,
  kind: JobRunSummary['kind'],
  status: JobRunSummary['status'],
  totalTasks: number,
): JobRunSummary {
  const taskCounts = {
    queued: 0,
    running: 0,
    completed: 0,
    skipped: 0,
    failed: 0,
    cancelled: 0,
  };
  if (status === 'QUEUED') taskCounts.queued = totalTasks;
  else if (status === 'RUNNING') {
    taskCounts.running = Math.min(1, totalTasks);
    taskCounts.queued = Math.max(0, totalTasks - taskCounts.running);
  } else if (status === 'COMPLETED') taskCounts.completed = totalTasks;
  else if (status === 'FAILED') taskCounts.failed = totalTasks;
  else if (status === 'CANCELLED') taskCounts.cancelled = totalTasks;
  else {
    taskCounts.failed = Math.min(1, totalTasks);
    taskCounts.completed = Math.max(0, totalTasks - taskCounts.failed);
  }

  return {
    id,
    kind,
    source: 'USER_ACTION',
    priority: 300,
    status,
    totalTasks,
    force: false,
    taskCounts,
    createdAt: '2026-07-17T10:00:00.000Z',
    updatedAt: '2026-07-17T10:00:00.000Z',
    startedAt: status === 'QUEUED' ? null : '2026-07-17T10:00:01.000Z',
    completedAt: status === 'QUEUED' || status === 'RUNNING'
      ? null
      : '2026-07-17T10:00:02.000Z',
  };
}

function task(
  id: number,
  importedGameId: number,
  status: 'QUEUED' | 'RUNNING',
) {
  return {
    id,
    importedGameId,
    ordinal: id - 1,
    status,
    error: null,
    createdAt: '2026-07-17T10:00:00.000Z',
    updatedAt: '2026-07-17T10:00:00.000Z',
  };
}

async function settlePromises(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}
