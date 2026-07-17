import {
  jobRunKindSchema,
  jobRunSourceSchema,
  jobRunStatusSchema,
  jobTaskStatusSchema,
  type CreateImportedGameJobRunResponse,
  type JobRunKind,
  type JobRunListResponse,
  type JobRunStatus,
  type JobRunSummary,
  type JobTask,
  type JobTaskCounts,
  type JobTaskListResponse,
  type JobTaskStatus,
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

export class JobRunNotRetryableError extends Error {
  readonly code = 'JOB_RUN_NOT_RETRYABLE' as const;

  constructor() {
    super('This job has no failed or cancelled games available to retry.');
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

    return createdResponse(created.jobRun, created.acceptedImportedGameIds, importedGameIds);
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

  async cancelForUser(userId: number, jobRunId: number): Promise<JobRunSummary> {
    const run = await JobRunRepository.cancelForUser(userId, jobRunId);
    if (!run) throw new JobRunNotFoundError();

    const counts = await JobRunRepository.countTaskStatuses([jobRunId]);
    return toJobRunSummary(run, counts);
  },

  async retryForUser(
    userId: number,
    jobRunId: number,
  ): Promise<CreateImportedGameJobRunResponse> {
    const retryable = await JobRunRepository.findRetryableForUser(userId, jobRunId);
    if (!retryable) throw new JobRunNotFoundError();

    const status = jobRunStatusSchema.parse(retryable.jobRun.status);
    if (activeJobRunStatuses.includes(status) || retryable.importedGameIds.length === 0) {
      throw new JobRunNotRetryableError();
    }

    const kind = jobRunKindSchema.parse(retryable.jobRun.kind);
    const requestedGameIds = Array.from(new Set(retryable.importedGameIds));
    const created = await JobRunRepository.createQueued({
      userId,
      kind,
      source: 'USER_ACTION',
      priority: USER_ACTION_JOB_PRIORITIES[kind],
      force: retryable.jobRun.force,
      importedGameIds: requestedGameIds,
    });
    if (!created) throw new JobRunNotRetryableError();

    return createdResponse(created.jobRun, created.acceptedImportedGameIds, requestedGameIds);
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

function createdResponse(
  jobRun: StoredJobRun,
  acceptedImportedGameIds: number[],
  requestedImportedGameIds: number[],
): CreateImportedGameJobRunResponse {
  const accepted = new Set(acceptedImportedGameIds);
  return {
    jobRun: toJobRunSummary(jobRun, [{
      jobRunId: jobRun.id,
      status: 'QUEUED',
      count: acceptedImportedGameIds.length,
    }]),
    rejectedGameIds: requestedImportedGameIds.filter((gameId) => !accepted.has(gameId)),
  };
}

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
    const status = jobTaskStatusSchema.parse(group.status);
    taskCounts[taskCountKey(status)] = group.count;
  }

  const countedTasks = Object.values(taskCounts).reduce((sum, count) => sum + count, 0);
  if (countedTasks !== run.totalTasks) {
    throw new Error(
      `Job run ${run.id} task-count mismatch: expected ${run.totalTasks}, counted ${countedTasks}.`,
    );
  }

  return {
    id: run.id,
    kind: jobRunKindSchema.parse(run.kind),
    source: jobRunSourceSchema.parse(run.source),
    priority: run.priority,
    status: jobRunStatusSchema.parse(run.status),
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
    status: jobTaskStatusSchema.parse(task.status),
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
