import type {
  JobRunKind,
  JobRunSource,
  JobRunStatus,
} from '@chess-trainer/contracts/jobs';
import prisma from '../../prisma';

export interface StoredJobRun {
  id: number;
  kind: string;
  source: string;
  priority: number;
  status: string;
  totalTasks: number;
  force: boolean;
  createdAt: Date;
  updatedAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
}

export interface StoredJobTask {
  id: number;
  importedGameId: number | null;
  ordinal: number;
  status: string;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface StoredTaskStatusCount {
  jobRunId: number;
  status: string;
  count: number;
}

export interface CreateQueuedJobRunInput {
  userId: number;
  kind: JobRunKind;
  source: JobRunSource;
  priority: number;
  force: boolean;
  importedGameIds: number[];
}

export interface CreateQueuedJobRunResult {
  jobRun: StoredJobRun;
  acceptedImportedGameIds: number[];
}

export interface StoredRetryableJobRun {
  jobRun: StoredJobRun;
  importedGameIds: number[];
}

const terminalJobRunStatuses = [
  'COMPLETED',
  'PARTIALLY_FAILED',
  'FAILED',
  'CANCELLED',
] as const;

const jobRunSelect = {
  id: true,
  kind: true,
  source: true,
  priority: true,
  status: true,
  totalTasks: true,
  force: true,
  createdAt: true,
  updatedAt: true,
  startedAt: true,
  completedAt: true,
} as const;

const jobTaskSelect = {
  id: true,
  importedGameId: true,
  ordinal: true,
  status: true,
  error: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const JobRunRepository = {
  async createQueued(input: CreateQueuedJobRunInput): Promise<CreateQueuedJobRunResult | null> {
    return prisma.$transaction(async (transaction) => {
      const games = await transaction.importedGame.findMany({
        where: {
          userId: input.userId,
          id: { in: input.importedGameIds },
        },
        select: { id: true },
        orderBy: [
          { endedAt: { sort: 'desc', nulls: 'last' } },
          { id: 'desc' },
        ],
      });

      if (games.length === 0) return null;

      const jobRun = await transaction.jobRun.create({
        data: {
          userId: input.userId,
          kind: input.kind,
          source: input.source,
          priority: input.priority,
          status: 'QUEUED',
          totalTasks: games.length,
          force: input.force,
          tasks: {
            create: games.map((game, ordinal) => ({
              importedGameId: game.id,
              ordinal,
              status: 'QUEUED',
            })),
          },
        },
        select: jobRunSelect,
      });

      return {
        jobRun,
        acceptedImportedGameIds: games.map((game) => game.id),
      };
    });
  },

  listForUser(
    userId: number,
    limit: number,
    statuses?: JobRunStatus[],
  ): Promise<StoredJobRun[]> {
    return prisma.jobRun.findMany({
      where: {
        userId,
        ...(statuses ? { status: { in: statuses } } : {}),
      },
      select: jobRunSelect,
      orderBy: [
        { createdAt: 'desc' },
        { id: 'desc' },
      ],
      take: limit,
    });
  },

  findForUser(userId: number, jobRunId: number): Promise<StoredJobRun | null> {
    return prisma.jobRun.findFirst({
      where: { id: jobRunId, userId },
      select: jobRunSelect,
    });
  },

  async cancelForUser(userId: number, jobRunId: number): Promise<StoredJobRun | null> {
    return prisma.$transaction(async (transaction) => {
      const ownedRun = await transaction.jobRun.findFirst({
        where: { id: jobRunId, userId },
        select: { id: true, status: true },
      });
      if (!ownedRun) return null;

      if (ownedRun.status === 'QUEUED' || ownedRun.status === 'RUNNING') {
        // Worker settlement updates JobTask before locking JobRun. Cancellation must
        // use the same order so completion and cancellation cannot deadlock.
        await transaction.jobTask.updateMany({
          where: { jobRunId, status: 'QUEUED' },
          data: {
            status: 'CANCELLED',
            workKey: null,
            error: 'Cancelled by user.',
            updatedAt: new Date(),
          },
        });
        await transaction.jobTask.updateMany({
          where: { jobRunId, status: 'RUNNING' },
          data: {
            status: 'CANCELLED',
            // Keep the claim key until the executor has stopped. The active-game
            // fence is keyed by this lease, so an immediate retry cannot overlap
            // the cancelled executor before worker acknowledgement.
            error: 'Cancelled by user.',
            updatedAt: new Date(),
          },
        });

        const lockedRows = await transaction.$queryRaw<Array<{ id: number; status: string }>>`
          SELECT "id", "status"
          FROM "JobRun"
          WHERE "id" = ${jobRunId}
            AND "userId" = ${userId}
          FOR UPDATE
        `;
        const lockedRun = lockedRows[0];
        if (!lockedRun) return null;

        // If worker settlement won the task-row race, it also reconciled the run.
        // Preserve that terminal result rather than rewriting it as cancellation.
        if (lockedRun.status === 'QUEUED' || lockedRun.status === 'RUNNING') {
          const groups = await transaction.jobTask.groupBy({
            by: ['status'],
            where: { jobRunId },
            _count: { _all: true },
          });
          const counts = new Map(groups.map((group) => [group.status, group._count._all]));
          const failed = counts.get('FAILED') ?? 0;
          const cancelled = counts.get('CANCELLED') ?? 0;
          const total = groups.reduce((sum, group) => sum + group._count._all, 0);
          const status = cancelled === total && total > 0
            ? 'CANCELLED'
            : failed > 0 || cancelled > 0
              ? 'PARTIALLY_FAILED'
              : 'COMPLETED';

          await transaction.jobRun.update({
            where: { id: jobRunId },
            data: {
              status,
              completedAt: new Date(),
              updatedAt: new Date(),
            },
          });
        }
      }

      return transaction.jobRun.findUnique({
        where: { id: jobRunId },
        select: jobRunSelect,
      });
    });
  },

  async findRetryableForUser(
    userId: number,
    jobRunId: number,
  ): Promise<StoredRetryableJobRun | null> {
    return prisma.$transaction(async (transaction) => {
      const jobRun = await transaction.jobRun.findFirst({
        where: { id: jobRunId, userId },
        select: jobRunSelect,
      });
      if (!jobRun) return null;

      const tasks = await transaction.jobTask.findMany({
        where: {
          jobRunId,
          status: { in: ['FAILED', 'CANCELLED'] },
          importedGameId: { not: null },
        },
        select: { importedGameId: true },
        orderBy: [
          { ordinal: 'asc' },
          { id: 'asc' },
        ],
      });

      return {
        jobRun,
        importedGameIds: tasks.flatMap((task) => (
          task.importedGameId === null ? [] : [task.importedGameId]
        )),
      };
    });
  },

  async deleteTerminalCompletedBefore(completedBefore: Date): Promise<number> {
    const result = await prisma.jobRun.deleteMany({
      where: {
        status: { in: [...terminalJobRunStatuses] },
        completedAt: { lt: completedBefore },
      },
    });
    return result.count;
  },

  async countTaskStatuses(jobRunIds: number[]): Promise<StoredTaskStatusCount[]> {
    if (jobRunIds.length === 0) return [];

    const groups = await prisma.jobTask.groupBy({
      by: ['jobRunId', 'status'],
      where: { jobRunId: { in: jobRunIds } },
      _count: { _all: true },
    });

    return groups.map((group) => ({
      jobRunId: group.jobRunId,
      status: group.status,
      count: group._count._all,
    }));
  },

  async listTasksForUser(
    userId: number,
    jobRunId: number,
    offset: number,
    limit: number,
  ): Promise<{ total: number; items: StoredJobTask[] } | null> {
    const ownedJob = await prisma.jobRun.findFirst({
      where: { id: jobRunId, userId },
      select: { id: true },
    });
    if (!ownedJob) return null;

    const [total, items] = await Promise.all([
      prisma.jobTask.count({ where: { jobRunId } }),
      prisma.jobTask.findMany({
        where: { jobRunId },
        select: jobTaskSelect,
        orderBy: [
          { ordinal: 'asc' },
          { id: 'asc' },
        ],
        skip: offset,
        take: limit,
      }),
    ]);

    return { total, items };
  },
};