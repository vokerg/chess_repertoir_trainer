import { TestBed } from '@angular/core/testing';
import type {
  CreateImportedGameJobRunResponse,
  JobRunSummary,
} from '@chess-trainer/contracts/jobs';
import { of } from 'rxjs';
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
});

function jobRun(
  id: number,
  kind: JobRunSummary['kind'],
  status: JobRunSummary['status'],
  totalTasks: number,
): JobRunSummary {
  return {
    id,
    kind,
    source: 'USER_ACTION',
    priority: 300,
    status,
    totalTasks,
    force: false,
    taskCounts: {
      queued: status === 'QUEUED' ? totalTasks : 1,
      running: status === 'RUNNING' ? 1 : 0,
      completed: 0,
      skipped: 0,
      failed: 0,
      cancelled: 0,
    },
    createdAt: '2026-07-17T10:00:00.000Z',
    updatedAt: '2026-07-17T10:00:00.000Z',
    startedAt: status === 'RUNNING' ? '2026-07-17T10:00:01.000Z' : null,
    completedAt: null,
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
