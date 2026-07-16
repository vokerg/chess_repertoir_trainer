import type {
  CreateImportedGameJobRunResponse,
  JobRunKind,
  JobRunListResponse,
  JobRunStatus,
  JobRunSummary,
  JobTask,
  JobTaskCounts,
  JobTaskListResponse,
  JobTaskStatus,
} from '@chess-trainer/contracts/jobs';
import {
  JobRunRepository,
  type StoredJobRun,
  type StoredJobTask,
  type StoredTaskStatusCount,
} from './job-run.repository.prisma';

export const USER_ACTION_JOB_PRIORITIES: Readonly<Record<JobRunKind, number>> = {
  INDEX_GAMES: 400,
  PROCESS_GAMES: 350,
  ANALYSE_GAMES: 300,
  REFRESH_TAGS: 250,
};

const activeJobRunStatuses: JobRunStatus[] = ['QUEUED', 'RUNNING'];

export class NoImportedGamesFoundError extends Error {
  readonly code = 'NO_IMPORTED_GAMES_FOUND' as const;

  constructor() {
    super('No owned imported games were found for this job.');
  }
}

export class JobRunNotFoundError extends Error {
  readonly code = 'JOB_RUN_NOT_FOUND' as const;

  constructor() {
    super('Job run not found.');
  }
}

export const JobRunService = {
  async createUserAction(input: {
    userId: number;
    kind: JobRunKind;
    importedGameIds: number[];
    force: boolean;
  }): Promise<CreateImportedGameJobRunResponse> {
    const importedGameIds = Array.from(new Set(input.importedGameIds));
    const created = await JobRunRepository.createQueued({
      userId: input.userId,
      kind: input.kind,
      source: 'USER_ACTION',
      priority: USER_ACTION_JOB_PRIORITIES[input.kind],
      force: input.force,
      importedGameIds,
    });

    if (!created) throw new NoImportedGamesFoundError();

    const accepted = new Set(created.acceptedImportedGameIds);
    return {
      jobRun: toJobRunSummary(created.jobRun, [{
        jobRunId: created.jobRun.id,
        status: 'QUEUED',
        count: created.acceptedImportedGameIds.length,
      }]),
      rejectedGameIds: importedGameIds.filter((gameId) => !accepted.has(gameId)),
    };
  },

  async listForUser(userId: number, active: boolean, limit: number): Promise<JobRunListResponse> {
    const runs = await JobRunRepository.listForUser(
      userId,
      limit,
      active ? activeJobRunStatuses : undefined,
    );
    const counts = await JobRunRepository.countTaskStatuses(runs.map((run) => run.id));

    return {
      items: runs.map((run) => toJobRunSummary(run, counts)),
    };
  },

  async getForUser(userId: number, jobRunId: number): Promise<JobRunSummary> {
    const run = await JobRunRepository.findForUser(userId, jobRunId);
    if (!run) throw new JobRunNotFoundError();

    const counts = await JobRunRepository.countTaskStatuses([jobRunId]);
    return toJobRunSummary(run, counts);
  },

  async listTasksForUser(
    userId: number,
    jobRunId: number,
    offset: number,
    limit: number,
  ): Promise<JobTaskListResponse> {
    const result = await JobRunRepository.listTasksForUser(
      userId,
      jobRunId,
      offset,
      limit,
    );
    if (!result) throw new JobRunNotFoundError();

    return {
      total: result.total,
      items: result.items.map(toJobTask),
    };
  },
};

function toJobRunSummary(
  run: StoredJobRun,
  allCounts: StoredTaskStatusCount[],
): JobRunSummary {
  const taskCounts: JobTaskCounts = {
    queued: 0,
    running: 0,
    completed: 0,
    skipped: 0,
    failed: 0,
    cancelled: 0,
  };

  for (const group of allCounts) {
    if (group.jobRunId !== run.id) continue;
    const key = taskCountKey(group.status as JobTaskStatus);
    taskCounts[key] = group.count;
  }

  return {
    id: run.id,
    kind: run.kind as JobRunKind,
    source: run.source as JobRunSummary['source'],
    priority: run.priority,
    status: run.status as JobRunStatus,
    totalTasks: run.totalTasks,
    force: run.force,
    taskCounts,
    createdAt: run.createdAt.toISOString(),
    updatedAt: run.updatedAt.toISOString(),
    startedAt: run.startedAt?.toISOString() ?? null,
    completedAt: run.completedAt?.toISOString() ?? null,
  };
}

function toJobTask(task: StoredJobTask): JobTask {
  return {
    id: task.id,
    importedGameId: task.importedGameId,
    ordinal: task.ordinal,
    status: task.status as JobTaskStatus,
    error: task.error,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

function taskCountKey(status: JobTaskStatus): keyof JobTaskCounts {
  switch (status) {
    case 'QUEUED': return 'queued';
    case 'RUNNING': return 'running';
    case 'COMPLETED': return 'completed';
    case 'SKIPPED': return 'skipped';
    case 'FAILED': return 'failed';
    case 'CANCELLED': return 'cancelled';
  }
}
