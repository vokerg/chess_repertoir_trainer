import { fakeAsync, flushMicrotasks, TestBed, tick } from '@angular/core/testing';
import type {
  CreateImportedGameJobRunResponse,
  JobRunSummary,
  JobTask,
} from '@chess-trainer/contracts/jobs';
import { of, Subject, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { ImportedGameJobApiService } from './imported-game-job-api.service';
import { ImportedGameJobStore } from './imported-game-job.store';

const TEST_USER_ID = 42;
const TEST_DISMISSAL_STORAGE_KEY =
  `chess-repertoire-trainer:imported-game-jobs:dismissed-run-ids:user:${TEST_USER_ID}`;

describe('ImportedGameJobStore', () => {
  let store: ImportedGameJobStore;
  let api: jasmine.SpyObj<ImportedGameJobApiService>;

  beforeEach(() => {
    localStorage.removeItem(TEST_DISMISSAL_STORAGE_KEY);
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
        {
          provide: AuthService,
          useValue: { appUser: () => ({ user: { id: TEST_USER_ID } }) },
        },
      ],
    });
    store = TestBed.inject(ImportedGameJobStore);
  });

  afterEach(() => {
    store.reset();
    localStorage.removeItem(TEST_DISMISSAL_STORAGE_KEY);
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

  it('dismisses only the selected terminal job from visible runs', async () => {
    const completed = jobRun(80, 'INDEX_GAMES', 'COMPLETED', 1);
    const failed = jobRun(81, 'ANALYSE_GAMES', 'FAILED', 1);
    api.listJobs.and.callFake((activeOnly: boolean) => of({
      items: activeOnly ? [] : [completed, failed],
    }));
    api.listTasks.and.callFake((jobRunId: number) => of({
      total: 1,
      items: [task(jobRunId, 800 + jobRunId, jobRunId === failed.id ? 'FAILED' : 'COMPLETED')],
    }));

    await store.initialize();
    store.dismiss(completed.id);

    expect(store.runs()).toContain(completed);
    expect(store.visibleRuns()).toEqual([failed]);
    expect(store.terminalBatch()).toBeNull();
    expect(JSON.parse(localStorage.getItem(TEST_DISMISSAL_STORAGE_KEY) ?? '[]')).toEqual([
      completed.id,
    ]);
  });

  it('does not hide an active job even when its id is persisted as dismissed', async () => {
    const active = jobRun(82, 'PROCESS_GAMES', 'RUNNING', 1);
    localStorage.setItem(TEST_DISMISSAL_STORAGE_KEY, JSON.stringify([active.id]));
    api.listJobs.and.callFake((activeOnly: boolean) => of({
      items: activeOnly ? [active] : [],
    }));
    api.listTasks.and.returnValue(of({
      total: 1,
      items: [task(82, 882, 'RUNNING')],
    }));

    await store.initialize();
    store.dismiss(active.id);

    expect(store.visibleRuns()).toEqual([active]);
    expect(JSON.parse(localStorage.getItem(TEST_DISMISSAL_STORAGE_KEY) ?? '[]')).toEqual([
      active.id,
    ]);
  });

  it('restores dismissed terminal jobs from localStorage when the store is recreated', async () => {
    const completed = jobRun(83, 'INDEX_GAMES', 'COMPLETED', 1);
    api.listJobs.and.callFake((activeOnly: boolean) => of({
      items: activeOnly ? [] : [completed],
    }));
    api.listTasks.and.returnValue(of({
      total: 1,
      items: [task(83, 883, 'COMPLETED')],
    }));

    await store.initialize();
    store.dismiss(completed.id);

    const recreatedStore = TestBed.runInInjectionContext(() => new ImportedGameJobStore());
    await recreatedStore.initialize();

    expect(recreatedStore.runs()).toContain(completed);
    expect(recreatedStore.visibleRuns()).toEqual([]);
    recreatedStore.reset();
  });

  it('ignores malformed dismissal data in localStorage', async () => {
    const completed = jobRun(84, 'INDEX_GAMES', 'COMPLETED', 1);
    localStorage.setItem(TEST_DISMISSAL_STORAGE_KEY, '{not valid json');
    api.listJobs.and.callFake((activeOnly: boolean) => of({
      items: activeOnly ? [] : [completed],
    }));
    api.listTasks.and.returnValue(of({
      total: 1,
      items: [task(84, 884, 'COMPLETED')],
    }));

    await expectAsync(store.initialize()).toBeResolved();

    expect(store.visibleRuns()).toEqual([completed]);
  });

  it('removes stale dismissed ids that are absent from loaded job history', async () => {
    const completed = jobRun(85, 'INDEX_GAMES', 'COMPLETED', 1);
    localStorage.setItem(TEST_DISMISSAL_STORAGE_KEY, JSON.stringify([completed.id, 9999]));
    api.listJobs.and.callFake((activeOnly: boolean) => of({
      items: activeOnly ? [] : [completed],
    }));
    api.listTasks.and.returnValue(of({
      total: 1,
      items: [task(85, 885, 'COMPLETED')],
    }));

    await store.initialize();

    expect(store.visibleRuns()).toEqual([]);
    expect(JSON.parse(localStorage.getItem(TEST_DISMISSAL_STORAGE_KEY) ?? '[]')).toEqual([
      completed.id,
    ]);
  });

  it('clears persisted dismissal state on reset so another session does not inherit it', async () => {
    const failed = jobRun(86, 'ANALYSE_GAMES', 'FAILED', 1);
    api.listJobs.and.callFake((activeOnly: boolean) => of({
      items: activeOnly ? [] : [failed],
    }));
    api.listTasks.and.returnValue(of({
      total: 1,
      items: [task(86, 886, 'FAILED')],
    }));

    await store.initialize();
    store.dismiss(failed.id);
    expect(store.visibleRuns()).toEqual([]);

    store.reset();
    expect(localStorage.getItem(TEST_DISMISSAL_STORAGE_KEY)).toBeNull();

    const nextSessionStore = TestBed.runInInjectionContext(() => new ImportedGameJobStore());
    await nextSessionStore.initialize();
    expect(nextSessionStore.visibleRuns()).toEqual([failed]);
    nextSessionStore.reset();
  });

  it('shows a new active job when retrying a dismissed terminal job', async () => {
    const failed = jobRun(12, 'ANALYSE_GAMES', 'FAILED', 1);
    const retried = jobRun(13, 'ANALYSE_GAMES', 'QUEUED', 1);
    api.listJobs.and.callFake((activeOnly: boolean) => of({
      items: activeOnly ? [] : [failed],
    }));
    api.listTasks.and.callFake((jobRunId: number) => of({
      total: 1,
      items: [task(jobRunId, 1201, jobRunId === failed.id ? 'FAILED' : 'QUEUED')],
    }));
    api.retryJob.and.returnValue(of({ jobRun: retried, rejectedGameIds: [] }));

    await store.initialize();
    expect(store.runs()).toContain(failed);
    expect(store.gameIdsForRun(failed.id)).toEqual([1201]);
    store.dismiss(failed.id);
    expect(store.visibleRuns()).toEqual([]);

    await store.retry(failed.id);

    expect(api.retryJob).toHaveBeenCalledOnceWith(failed.id);
    expect(store.activeRuns()).toEqual([retried]);
    expect(store.visibleRuns()).toEqual([retried]);
    expect(store.gameIdsForRun(retried.id)).toEqual([1201]);
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
    createdAt: '2026-07-17T10:00:00.000Z',
    updatedAt: '2026-07-17T10:00:00.000Z',
  };
}

async function settlePromises(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}
