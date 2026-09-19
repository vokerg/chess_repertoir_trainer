import { fakeAsync, flushMicrotasks, TestBed, tick } from '@angular/core/testing';
import type {
  CreateImportedGameJobRunResponse,
  JobRunSummary,
  JobTask,
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
      'dismissJob',
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

  afterEach(() => {
    store.reset();
  });

  it('recovers active jobs and recent terminal jobs with their game ids', async () => {
    const active = jobRun(10, 'ANALYSE_GAMES', 'RUNNING', 2);
    const cancelled = jobRun(11, 'PROCESS_GAMES', 'CANCELLED', 1);
    api.listJobs.and.callFake((activeOnly: boolean) => of({
      items: activeOnly ? [active] : [cancelled, active],
    }));
    api.listTasks.and.callFake((jobRunId: number) => of(jobRunId === active.id
      ? {
          total: 2,
          items: [
            task(1, 101, 'RUNNING'),
            task(2, 102, 'QUEUED'),
          ],
        }
      : {
          total: 1,
          items: [task(3, 103, 'CANCELLED')],
        }));

    await store.initialize();

    expect(store.activeRuns()).toEqual([active]);
    expect(store.runs()).toContain(cancelled);
    expect(store.gameIdsForRun(active.id)).toEqual([101, 102]);
    expect(store.gameIdsForRun(cancelled.id)).toEqual([103]);
    expect(store.isGameActive(102, ['ANALYSE_GAMES'])).toBeTrue();
    expect(api.listJobs.calls.argsFor(0)).toEqual([true]);
    expect(api.listJobs.calls.argsFor(1)).toEqual([false, 100]);
  });

  it('tracks each task status independently while the parent run remains running', async () => {
    const active = jobRun(12, 'ANALYSE_GAMES', 'RUNNING', 4);
    api.listJobs.and.callFake((activeOnly: boolean) => of({ items: activeOnly ? [active] : [] }));
    api.listTasks.and.returnValue(of({ total: 4, items: [
      task(1, 101, 'COMPLETED'), task(2, 102, 'RUNNING'),
      task(3, 103, 'QUEUED'), task(4, 104, 'FAILED'),
    ] }));

    await store.initialize();

    expect(store.isGameActive(101)).toBeFalse();
    expect(store.isGameActive(102)).toBeTrue();
    expect(store.isGameActive(103)).toBeTrue();
    expect(store.isGameActive(104)).toBeFalse();
    expect(store.taskStatusForGame(active.id, 101)).toBe('COMPLETED');
  });
  it('permanently dismisses only the selected terminal job through the API', async () => {
    const completed = jobRun(80, 'INDEX_GAMES', 'COMPLETED', 1);
    const failed = jobRun(81, 'ANALYSE_GAMES', 'FAILED', 1);
    api.listJobs.and.callFake((activeOnly: boolean) => of({
      items: activeOnly ? [] : [completed, failed],
    }));
    api.listTasks.and.callFake((jobRunId: number) => of({
      total: 1,
      items: [task(jobRunId, 800 + jobRunId, jobRunId === failed.id ? 'FAILED' : 'COMPLETED')],
    }));
    api.dismissJob.and.returnValue(of(undefined));

    await store.initialize();
    await store.dismiss(completed.id);

    expect(api.dismissJob).toHaveBeenCalledOnceWith(completed.id);
    expect(store.runs()).not.toContain(completed);
    expect(store.visibleRuns()).toEqual([failed]);
    expect(store.gameIdsForRun(completed.id)).toEqual([]);
    expect(store.taskStatusForGame(completed.id, 880 + completed.id)).toBeNull();
    expect(store.terminalBatch()).toBeNull();
  });

  it('does not dismiss an active job', async () => {
    const active = jobRun(82, 'PROCESS_GAMES', 'RUNNING', 1);
    api.listJobs.and.callFake((activeOnly: boolean) => of({
      items: activeOnly ? [active] : [],
    }));
    api.listTasks.and.returnValue(of({
      total: 1,
      items: [task(82, 882, 'RUNNING')],
    }));

    await store.initialize();
    await store.dismiss(active.id);

    expect(api.dismissJob).not.toHaveBeenCalled();
    expect(store.visibleRuns()).toEqual([active]);
  });

  it('keeps a terminal job visible when the dismissal request fails', async () => {
    const completed = jobRun(83, 'INDEX_GAMES', 'COMPLETED', 1);
    api.listJobs.and.callFake((activeOnly: boolean) => of({
      items: activeOnly ? [] : [completed],
    }));
    api.listTasks.and.returnValue(of({
      total: 1,
      items: [task(83, 883, 'COMPLETED')],
    }));
    api.dismissJob.and.returnValue(throwError(() => new Error('Temporary dismiss failure')));

    await store.initialize();
    await store.dismiss(completed.id);

    expect(store.runs()).toContain(completed);
    expect(store.visibleRuns()).toEqual([completed]);
    expect(store.error()).toContain('Temporary dismiss failure');
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
    expect(store.taskStatusForGame(20, 201)).toBe('QUEUED');
    expect(store.activeRunForGame(202)?.id).toBe(20);
  });

  it('does not poll when initialization finds no active work', async () => {
    api.listJobs.and.returnValue(of({ items: [] }));

    await store.initialize();

    expect(store.hasActiveJobs()).toBeFalse();
    expect(api.listJobs).toHaveBeenCalledTimes(2);
    expect(api.listTasks).not.toHaveBeenCalled();
  });

  it('allows initialization to retry after the active-job list fails', async () => {
    let activeCalls = 0;
    api.listJobs.and.callFake((activeOnly: boolean) => {
      if (!activeOnly) return of({ items: [] });
      activeCalls += 1;
      return activeCalls === 1
        ? throwError(() => new Error('Temporary list failure'))
        : of({ items: [] });
    });

    await store.initialize();
    expect(store.error()).toContain('Temporary list failure');

    await store.initialize();

    expect(api.listJobs).toHaveBeenCalledTimes(3);
    expect(store.error()).toBeNull();
  });

  it('keeps polling and recovers when task hydration fails', fakeAsync(() => {
    const run = jobRun(30, 'ANALYSE_GAMES', 'RUNNING', 1);
    api.listJobs.and.callFake((activeOnly: boolean) => of({
      items: activeOnly ? [run] : [],
    }));
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

    expect(api.listJobs).toHaveBeenCalledTimes(3);
    expect(store.gameIdsForRun(run.id)).toEqual([301]);
    expect(store.error()).toBeNull();
    store.reset();
  }));

  it('discards an initialization response after reset changes the session', async () => {
    const response$ = new Subject<{ items: JobRunSummary[] }>();
    api.listJobs.and.callFake((activeOnly: boolean) => (
      activeOnly ? response$ : of({ items: [] })
    ));

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
    api.listJobs.and.callFake((activeOnly: boolean) => of({
      items: activeOnly ? [run] : [],
    }));
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
    api.listJobs.and.callFake((activeOnly: boolean) => of({
      items: activeOnly ? [active] : [],
    }));
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
  status: JobTask['status'],
): JobTask {
  return {
    id,
    importedGameId,
    ordinal: Math.max(0, id - 1),
    status,
    error: status === 'FAILED' || status === 'CANCELLED' ? 'Terminal task' : null,
    startedAt: status === 'RUNNING' || status === 'COMPLETED' || status === 'FAILED'
      ? '2026-07-17T10:00:01.000Z'
      : null,
    settledAt: status === 'COMPLETED'
      || status === 'FAILED'
      || status === 'CANCELLED'
      || status === 'SKIPPED'
      ? '2026-07-17T10:00:02.000Z'
      : null,
    createdAt: '2026-07-17T10:00:00.000Z',
    updatedAt: '2026-07-17T10:00:00.000Z',
  };
}

async function settlePromises(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}
