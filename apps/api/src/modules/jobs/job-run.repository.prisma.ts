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
  importedGameId: number;
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
