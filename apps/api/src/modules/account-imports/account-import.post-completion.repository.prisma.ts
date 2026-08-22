import { Prisma, PrismaClient } from '@prisma/client';
import prisma from '../../prisma';
import { assertDataLifecycleWriteAllowed } from '../data-lifecycle/data-lifecycle.guard';

const NON_TERMINAL_IMPORT_STATUSES = [
  'QUEUED',
  'RUNNING',
  'PAUSE_REQUESTED',
  'PAUSED',
  'CANCEL_REQUESTED',
] as const;

export interface AccountImportPostCompletionCandidate {
  userId: number;
  accountId: number;
  latestCompletedImportRunId: number;
  latestCompletedAt: Date;
}

export interface AccountImportPostCompletionState {
  latestCompletedImportRunId: number | null;
  latestCompletedAt: Date | null;
  hasActiveImport: boolean;
}

interface CandidateRow extends AccountImportPostCompletionCandidate {}

interface StateRow {
  latestCompletedImportRunId: number | null;
  latestCompletedAt: Date | null;
  hasActiveImport: boolean;
}

interface IdRow {
  id: number;
}

interface ForwardRunRow {
  id: number;
  completedAt: Date;
}

export interface AccountImportPostCompletionRepository {
  findNextCandidate(): Promise<AccountImportPostCompletionCandidate | null>;
  getState(userId: number, accountId: number): Promise<AccountImportPostCompletionState>;
  synchronizeForwardSyncMetadata(userId: number, accountId: number): Promise<boolean>;
}

export function createAccountImportPostCompletionRepository(
  database: PrismaClient = prisma,
): AccountImportPostCompletionRepository {
  return {
    async findNextCandidate() {
      const rows = await database.$queryRaw<CandidateRow[]>(Prisma.sql`
        WITH latest_completed AS (
          SELECT DISTINCT ON (run."accountId")
            run."id",
            run."userId",
            run."accountId",
            run."completedAt"
          FROM "ImportRun" AS run
          WHERE run."mode" <> 'LEGACY_SYNC'
            AND run."status" = 'COMPLETED'
            AND run."completedAt" IS NOT NULL
          ORDER BY run."accountId", run."completedAt" DESC, run."id" DESC
        ),
        latest_forward AS (
          SELECT DISTINCT ON (run."accountId")
            run."id",
            run."accountId",
            run."completedAt"
          FROM "ImportRun" AS run
          WHERE run."mode" IN ('BOUNDED_INITIAL', 'INCREMENTAL_FORWARD')
            AND run."status" = 'COMPLETED'
            AND run."completedAt" IS NOT NULL
          ORDER BY run."accountId", run."completedAt" DESC, run."id" DESC
        )
        SELECT
          latest."userId",
          latest."accountId",
          latest."id" AS "latestCompletedImportRunId",
          latest."completedAt" AS "latestCompletedAt"
        FROM latest_completed AS latest
        JOIN "ExternalAccount" AS account
          ON account."id" = latest."accountId"
         AND account."userId" = latest."userId"
        LEFT JOIN "AccountRatingStats" AS stats
          ON stats."accountId" = latest."accountId"
        LEFT JOIN latest_forward AS forward
          ON forward."accountId" = latest."accountId"
        WHERE NOT EXISTS (
          SELECT 1
          FROM "ImportRun" AS active
          WHERE active."accountId" = latest."accountId"
            AND active."status" IN (${Prisma.join(NON_TERMINAL_IMPORT_STATUSES.map((status) => Prisma.sql`${status}`))})
        )
          AND (
            stats."computedAt" IS NULL
            OR stats."computedAt" < latest."completedAt"
            OR (
              forward."id" IS NOT NULL
              AND (
                account."lastSyncRunId" IS DISTINCT FROM forward."id"
                OR account."lastSyncAt" IS DISTINCT FROM forward."completedAt"
              )
            )
          )
        ORDER BY latest."completedAt" ASC, latest."id" ASC
        LIMIT 1
      `);
      return rows[0] ?? null;
    },

    async getState(userId, accountId) {
      const rows = await database.$queryRaw<StateRow[]>(Prisma.sql`
        SELECT
          (
            SELECT completed."id"
            FROM "ImportRun" AS completed
            WHERE completed."userId" = ${userId}
              AND completed."accountId" = ${accountId}
              AND completed."mode" <> 'LEGACY_SYNC'
              AND completed."status" = 'COMPLETED'
              AND completed."completedAt" IS NOT NULL
            ORDER BY completed."completedAt" DESC, completed."id" DESC
            LIMIT 1
          ) AS "latestCompletedImportRunId",
          (
            SELECT completed."completedAt"
            FROM "ImportRun" AS completed
            WHERE completed."userId" = ${userId}
              AND completed."accountId" = ${accountId}
              AND completed."mode" <> 'LEGACY_SYNC'
              AND completed."status" = 'COMPLETED'
              AND completed."completedAt" IS NOT NULL
            ORDER BY completed."completedAt" DESC, completed."id" DESC
            LIMIT 1
          ) AS "latestCompletedAt",
          EXISTS (
            SELECT 1
            FROM "ImportRun" AS active
            WHERE active."userId" = ${userId}
              AND active."accountId" = ${accountId}
              AND active."status" IN (${Prisma.join(NON_TERMINAL_IMPORT_STATUSES.map((status) => Prisma.sql`${status}`))})
          ) AS "hasActiveImport"
      `);
      return rows[0] ?? {
        latestCompletedImportRunId: null,
        latestCompletedAt: null,
        hasActiveImport: false,
      };
    },

    async synchronizeForwardSyncMetadata(userId, accountId) {
      return database.$transaction(async (transaction) => {
        const accountRows = await transaction.$queryRaw<IdRow[]>(Prisma.sql`
          SELECT "id"
          FROM "ExternalAccount"
          WHERE "id" = ${accountId}
            AND "userId" = ${userId}
          FOR UPDATE
        `);
        if (!accountRows[0]) return false;

        await assertDataLifecycleWriteAllowed(transaction, { userId, accountId });

        const forwardRows = await transaction.$queryRaw<ForwardRunRow[]>(Prisma.sql`
          SELECT "id", "completedAt"
          FROM "ImportRun"
          WHERE "userId" = ${userId}
            AND "accountId" = ${accountId}
            AND "mode" IN ('BOUNDED_INITIAL', 'INCREMENTAL_FORWARD')
            AND "status" = 'COMPLETED'
            AND "completedAt" IS NOT NULL
          ORDER BY "completedAt" DESC, "id" DESC
          LIMIT 1
        `);
        const forward = forwardRows[0];
        if (!forward) return false;

        const updated = await transaction.$executeRaw(Prisma.sql`
          UPDATE "ExternalAccount"
          SET "lastSyncAt" = ${forward.completedAt},
              "lastSyncRunId" = ${forward.id},
              "updatedAt" = NOW()
          WHERE "id" = ${accountId}
            AND "userId" = ${userId}
            AND (
              "lastSyncRunId" IS DISTINCT FROM ${forward.id}
              OR "lastSyncAt" IS DISTINCT FROM ${forward.completedAt}
            )
        `);
        return updated === 1;
      });
    },
  };
}

export const AccountImportPostCompletionRepository =
  createAccountImportPostCompletionRepository();
