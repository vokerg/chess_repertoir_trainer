import { randomUUID } from 'node:crypto';
import { Prisma, PrismaClient } from '@prisma/client';
import {
  jobRunKindSchema,
  jobTaskStatusSchema,
  type JobRunKind,
  type JobRunStatus,
} from '@chess-trainer/contracts/jobs';
import prisma from '../../prisma';
import type { ClaimedJobTask, JobTaskExecutionStatus } from './job-task-executor';

export interface ClaimNextJobTaskInput {
  supportedKinds: JobRunKind[];
  jobRunId?: number;
}

export interface ActiveJobTaskClaim {
  id: number;
  jobRunId: number;
  workKey: string;
}

export interface JobWorkerRepository {
  claimNextTask(input: ClaimNextJobTaskInput): Promise<ClaimedJobTask | null>;
  hasHigherPriorityRunnableWork(priority: number, supportedKinds: JobRunKind[]): Promise<boolean>;
  heartbeatTask(claim: ActiveJobTaskClaim): Promise<boolean>;
  acknowledgeCancelledTask(claim: ActiveJobTaskClaim): Promise<boolean>;
  finishTask(
    claim: ActiveJobTaskClaim,
    status: JobTaskExecutionStatus,
  ): Promise<boolean>;
  failTask(claim: ActiveJobTaskClaim, error: string): Promise<boolean>;
  releaseTask(claim: ActiveJobTaskClaim): Promise<boolean>;
  touchJobRun(jobRunId: number): Promise<void>;
  recoverStaleTasks(staleBefore: Date): Promise<number>;
  skipOrphanedTasks(): Promise<number>;
}

type ClaimedRow = {
  id: number;
  jobRunId: number;
  userId: number;
  kind: string;
  priority: number;
  importedGameId: number;
  ordinal: number;
  force: boolean;
  workKey: string;
};

type TaskStatusCountRow = {
  status: string;
  count: number;
};

type JobRunStateRow = {
  totalTasks: number;
  startedAt: Date | null;
};

type JobRunIdRow = {
  jobRunId: number;
};

const CLAIM_RETRY_LIMIT = 8;

export function createJobWorkerRepository(
  database: PrismaClient = prisma,
): JobWorkerRepository {
  return {
    async claimNextTask(input) {
      if (input.supportedKinds.length === 0) return null;

      for (let attempt = 0; attempt < CLAIM_RETRY_LIMIT; attempt += 1) {
        try {
          return await claimNextTaskOnce(database, input);
        } catch (error) {
          if (!isUniqueConstraintViolation(error)) throw error;
        }
      }

      return null;
    },

    async hasHigherPriorityRunnableWork(priority, supportedKinds) {
      if (supportedKinds.length === 0) return false;
      const kinds = Prisma.join(supportedKinds.map((kind) => Prisma.sql`${kind}`));
      const rows = await database.$queryRaw<Array<{ exists: boolean }>>(Prisma.sql`
        SELECT EXISTS (
          SELECT 1
          FROM "JobTask" AS task
          JOIN "JobRun" AS job ON job."id" = task."jobRunId"
          WHERE task."status" = 'QUEUED'
            AND task."importedGameId" IS NOT NULL
            AND job."status" IN ('QUEUED', 'RUNNING')
            AND job."kind" IN (${kinds})
            AND job."priority" > ${priority}
            AND NOT EXISTS (
              SELECT 1
              FROM "JobTask" AS active_task
              WHERE active_task."workKey" IS NOT NULL
                AND active_task."importedGameId" = task."importedGameId"
            )
        ) AS "exists"
      `);
      return rows[0]?.exists ?? false;
    },

    async heartbeatTask(claim) {
      const updated = await database.$executeRaw`
        UPDATE "JobTask"
        SET "updatedAt" = NOW()
        WHERE "id" = ${claim.id}
          AND "jobRunId" = ${claim.jobRunId}
          AND "status" = 'RUNNING'
          AND "workKey" = ${claim.workKey}
      `;
      return updated === 1;
    },

    async acknowledgeCancelledTask(claim) {
      const updated = await database.$executeRaw`
        UPDATE "JobTask"
        SET "workKey" = NULL,
            "updatedAt" = NOW()
        WHERE "id" = ${claim.id}
          AND "jobRunId" = ${claim.jobRunId}
          AND "status" = 'CANCELLED'
          AND "workKey" = ${claim.workKey}
      `;
      return updated === 1;
    },

    finishTask(claim, status) {
      return settleTask(database, claim, status, null, false);
    },

    failTask(claim, error) {
      return settleTask(database, claim, 'FAILED', truncateError(error), false);
    },

    releaseTask(claim) {
      return releaseTask(database, claim);
    },

    async touchJobRun(jobRunId) {
      await database.$executeRaw`
        UPDATE "JobRun"
        SET "updatedAt" = NOW()
        WHERE "id" = ${jobRunId}
          AND "status" IN ('QUEUED', 'RUNNING')
      `;
    },

    async recoverStaleTasks(staleBefore) {
      return database.$transaction(async (transaction) => {
        const rows = await transaction.$queryRaw<JobRunIdRow[]>`
          UPDATE "JobTask"
          SET "status" = 'QUEUED',
              "workKey" = NULL,
              "error" = NULL,
              "updatedAt" = NOW()
          WHERE "status" = 'RUNNING'
            AND "updatedAt" < ${staleBefore}
          RETURNING "jobRunId"
        `;

        const cancelledClaimsCleared = await transaction.$executeRaw`
          UPDATE "JobTask"
          SET "workKey" = NULL,
              "updatedAt" = NOW()
          WHERE "status" = 'CANCELLED'
            AND "workKey" IS NOT NULL
            AND "updatedAt" < ${staleBefore}
        `;

        const jobRunIds = uniqueJobRunIds(rows);
        for (const jobRunId of jobRunIds) {
          await reconcileJobRun(transaction, jobRunId, true);
        }
        return rows.length + cancelledClaimsCleared;
      });
    },

    async skipOrphanedTasks() {
      return database.$transaction(async (transaction) => {
        const rows = await transaction.$queryRaw<JobRunIdRow[]>`
          UPDATE "JobTask"
          SET "status" = 'SKIPPED',
              "workKey" = NULL,
              "error" = 'Imported game no longer exists.',
              "updatedAt" = NOW()
          WHERE "status" = 'QUEUED'
            AND "importedGameId" IS NULL
          RETURNING "jobRunId"
        `;

        const jobRunIds = uniqueJobRunIds(rows);
        for (const jobRunId of jobRunIds) {
          await reconcileJobRun(transaction, jobRunId, true);
        }
        return rows.length;
      });
    },
  };
}

async function claimNextTaskOnce(
  database: PrismaClient,
  input: ClaimNextJobTaskInput,
): Promise<ClaimedJobTask | null> {
  const workKey = `GAME_WORK:${randomUUID()}`;
  const kinds = Prisma.join(input.supportedKinds.map((kind) => Prisma.sql`${kind}`));
  const jobFilter = input.jobRunId === undefined
    ? Prisma.sql``
    : Prisma.sql`AND job."id" = ${input.jobRunId}`;

  return database.$transaction(async (transaction) => {
    const rows = await transaction.$queryRaw<ClaimedRow[]>(Prisma.sql`
      WITH candidate AS (
        SELECT task."id"
        FROM "JobTask" AS task
        JOIN "JobRun" AS job ON job."id" = task."jobRunId"
        WHERE task."status" = 'QUEUED'
          AND task."importedGameId" IS NOT NULL
          AND job."status" IN ('QUEUED', 'RUNNING')
          AND job."kind" IN (${kinds})
          ${jobFilter}
          AND NOT EXISTS (
            SELECT 1
            FROM "JobTask" AS active_task
            WHERE active_task."workKey" IS NOT NULL
              AND active_task."importedGameId" = task."importedGameId"
          )
        ORDER BY
          job."priority" DESC,
          job."updatedAt" ASC,
          job."id" ASC,
          task."ordinal" ASC,
          task."id" ASC
        FOR UPDATE OF job, task SKIP LOCKED
        LIMIT 1
      ), claimed AS (
        UPDATE "JobTask" AS task
        SET "status" = 'RUNNING',
            "workKey" = ${workKey},
            "error" = NULL,
            "updatedAt" = NOW()
        FROM candidate
        WHERE task."id" = candidate."id"
        RETURNING
          task."id",
          task."jobRunId",
          task."importedGameId",
          task."ordinal",
          task."workKey"
      )
      SELECT
        claimed."id",
        claimed."jobRunId",
        job."userId",
        job."kind",
        job."priority",
        claimed."importedGameId",
        claimed."ordinal",
        job."force",
        claimed."workKey"
      FROM claimed
      JOIN "JobRun" AS job ON job."id" = claimed."jobRunId"
    `);

    const row = rows[0];
    if (!row) return null;

    if (input.jobRunId === undefined) {
      await transaction.$executeRaw`
        UPDATE "JobRun"
        SET "status" = 'RUNNING',
            "startedAt" = COALESCE("startedAt", NOW()),
            "completedAt" = NULL,
            "updatedAt" = NOW()
        WHERE "id" = ${row.jobRunId}
          AND "status" IN ('QUEUED', 'RUNNING')
      `;
    } else {
      await transaction.$executeRaw`
        UPDATE "JobRun"
        SET "status" = 'RUNNING',
            "startedAt" = COALESCE("startedAt", NOW()),
            "completedAt" = NULL
        WHERE "id" = ${row.jobRunId}
          AND "status" IN ('QUEUED', 'RUNNING')
      `;
    }

    return {
      ...row,
      kind: jobRunKindSchema.parse(row.kind),
    };
  });
}

async function settleTask(
  database: PrismaClient,
  claim: ActiveJobTaskClaim,
  status: JobTaskExecutionStatus | 'FAILED',
  error: string | null,
  touchActiveJob: boolean,
): Promise<boolean> {
  return database.$transaction(async (transaction) => {
    const rows = await transaction.$queryRaw<JobRunIdRow[]>`
      UPDATE "JobTask"
      SET "status" = ${status},
          "workKey" = NULL,
          "error" = ${error},
          "updatedAt" = NOW()
      WHERE "id" = ${claim.id}
        AND "jobRunId" = ${claim.jobRunId}
        AND "status" = 'RUNNING'
        AND "workKey" = ${claim.workKey}
      RETURNING "jobRunId"
    `;

    if (rows.length !== 1) return false;
    await reconcileJobRun(transaction, claim.jobRunId, touchActiveJob);
    return true;
  });
}

async function releaseTask(
  database: PrismaClient,
  claim: ActiveJobTaskClaim,
): Promise<boolean> {
  return database.$transaction(async (transaction) => {
    const rows = await transaction.$queryRaw<JobRunIdRow[]>`
      UPDATE "JobTask"
      SET "status" = 'QUEUED',
          "workKey" = NULL,
          "error" = NULL,
          "updatedAt" = NOW()
      WHERE "id" = ${claim.id}
        AND "jobRunId" = ${claim.jobRunId}
        AND "status" = 'RUNNING'
        AND "workKey" = ${claim.workKey}
      RETURNING "jobRunId"
    `;

    if (rows.length !== 1) return false;
    await reconcileJobRun(transaction, claim.jobRunId, true);
    return true;
  });
}

async function reconcileJobRun(
  transaction: Prisma.TransactionClient,
  jobRunId: number,
  touchActiveJob: boolean,
): Promise<void> {
  const jobRows = await transaction.$queryRaw<JobRunStateRow[]>`
    SELECT "totalTasks", "startedAt"
    FROM "JobRun"
    WHERE "id" = ${jobRunId}
    FOR UPDATE
  `;
  const job = jobRows[0];
  if (!job) return;

  const counts = await transaction.$queryRaw<TaskStatusCountRow[]>`
    SELECT "status", COUNT(*)::int AS "count"
    FROM "JobTask"
    WHERE "jobRunId" = ${jobRunId}
    GROUP BY "status"
  `;
  const parsedCounts = counts.map((row) => ({
    status: jobTaskStatusSchema.parse(row.status),
    count: row.count,
  }));
  const byStatus = new Map(parsedCounts.map((row) => [row.status, row.count]));
  const countedTasks = parsedCounts.reduce((sum, row) => sum + row.count, 0);
  if (countedTasks !== job.totalTasks) {
    throw new Error(
      `Job run ${jobRunId} task-count mismatch: expected ${job.totalTasks}, counted ${countedTasks}.`,
    );
  }

  const queued = byStatus.get('QUEUED') ?? 0;
  const running = byStatus.get('RUNNING') ?? 0;
  const failed = byStatus.get('FAILED') ?? 0;
  const cancelled = byStatus.get('CANCELLED') ?? 0;
  const active = queued + running;

  if (active > 0) {
    const status: JobRunStatus = job.startedAt ? 'RUNNING' : 'QUEUED';
    if (touchActiveJob) {
      await transaction.$executeRaw`
        UPDATE "JobRun"
        SET "status" = ${status},
            "completedAt" = NULL,
            "updatedAt" = NOW()
        WHERE "id" = ${jobRunId}
      `;
    } else {
      await transaction.$executeRaw`
        UPDATE "JobRun"
        SET "status" = ${status},
            "completedAt" = NULL
        WHERE "id" = ${jobRunId}
      `;
    }
    return;
  }

  let status: JobRunStatus;
  if (failed === job.totalTasks) {
    status = 'FAILED';
  } else if (cancelled === job.totalTasks) {
    status = 'CANCELLED';
  } else if (failed > 0 || cancelled > 0) {
    status = 'PARTIALLY_FAILED';
  } else {
    status = 'COMPLETED';
  }

  await transaction.$executeRaw`
    UPDATE "JobRun"
    SET "status" = ${status},
        "completedAt" = NOW(),
        "updatedAt" = NOW()
    WHERE "id" = ${jobRunId}
  `;
}

function uniqueJobRunIds(rows: JobRunIdRow[]): number[] {
  return Array.from(new Set(rows.map((row) => row.jobRunId)));
}

function truncateError(error: string): string {
  return error.length <= 4_000 ? error : `${error.slice(0, 3_997)}...`;
}

function isUniqueConstraintViolation(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { code?: string; meta?: { code?: string } };
  return candidate.code === 'P2002'
    || (candidate.code === 'P2010' && candidate.meta?.code === '23505');
}

export const JobWorkerRepository = createJobWorkerRepository();
