import { Prisma, PrismaClient } from '@prisma/client';
import prisma from '../../prisma';

export interface AccountAutomaticRefreshSnapshot {
  latestSuccessfulForwardAt: Date | null;
  lastAutomaticFailureAt: Date | null;
  automaticFailureCount: number;
}

interface SnapshotRow {
  latestSuccessfulForwardAt: Date | null;
  lastAutomaticFailureAt: Date | null;
  automaticFailureCount: number;
}

export interface AccountImportAutomaticRefreshRepository {
  listActiveAccountIds(userId: number): Promise<number[]>;
  getSnapshot(
    userId: number,
    accountId: number,
    automaticPriority: number,
  ): Promise<AccountAutomaticRefreshSnapshot>;
}

export function createAccountImportAutomaticRefreshRepository(
  database: PrismaClient = prisma,
): AccountImportAutomaticRefreshRepository {
  return {
    async listActiveAccountIds(userId) {
      const accounts = await database.externalAccount.findMany({
        where: { userId, isActive: true },
        select: { id: true },
        orderBy: { id: 'asc' },
      });
      return accounts.map((account) => account.id);
    },

    async getSnapshot(userId, accountId, automaticPriority) {
      const rows = await database.$queryRaw<SnapshotRow[]>(Prisma.sql`
        WITH normal_coverage AS (
          SELECT coverage."scopeHash", coverage."createdAt"
          FROM "AccountImportCoverage" AS coverage
          JOIN "ExternalAccount" AS account
            ON account."id" = coverage."accountId"
           AND account."userId" = ${userId}
          WHERE coverage."accountId" = ${accountId}
            AND ${normalRefreshCoveragePredicate()}
          LIMIT 1
        ),
        latest_success AS (
          SELECT run."completedAt"
          FROM "ImportRun" AS run
          JOIN normal_coverage AS coverage
            ON coverage."scopeHash" = run."scopeHash"
          WHERE run."userId" = ${userId}
            AND run."accountId" = ${accountId}
            AND run."source" = 'ACCOUNT_REFRESH'
            AND run."mode" IN ('BOUNDED_INITIAL', 'INCREMENTAL_FORWARD')
            AND run."status" = 'COMPLETED'
            AND run."completedAt" IS NOT NULL
            AND run."completedAt" >= coverage."createdAt"
          ORDER BY run."completedAt" DESC, run."id" DESC
          LIMIT 1
        ),
        automatic_failures AS (
          SELECT run."completedAt"
          FROM "ImportRun" AS run
          JOIN normal_coverage AS coverage
            ON coverage."scopeHash" = run."scopeHash"
          WHERE run."userId" = ${userId}
            AND run."accountId" = ${accountId}
            AND run."source" = 'ACCOUNT_REFRESH'
            AND run."mode" = 'INCREMENTAL_FORWARD'
            AND run."priority" = ${automaticPriority}
            AND run."status" IN ('FAILED', 'CANCELLED')
            AND run."completedAt" IS NOT NULL
            AND run."completedAt" >= coverage."createdAt"
            AND (
              NOT EXISTS (SELECT 1 FROM latest_success)
              OR run."completedAt" > (SELECT "completedAt" FROM latest_success)
            )
        )
        SELECT
          (SELECT "completedAt" FROM latest_success) AS "latestSuccessfulForwardAt",
          (SELECT MAX("completedAt") FROM automatic_failures) AS "lastAutomaticFailureAt",
          (SELECT COUNT(*)::integer FROM automatic_failures) AS "automaticFailureCount"
      `);
      return rows[0] ?? {
        latestSuccessfulForwardAt: null,
        lastAutomaticFailureAt: null,
        automaticFailureCount: 0,
      };
    },
  };
}

function normalRefreshCoveragePredicate(): Prisma.Sql {
  return Prisma.sql`
    coverage."scopeJson" ->> 'variant' = 'STANDARD'
    AND coverage."scopeJson" ->> 'rated' = 'BOTH'
    AND jsonb_typeof(coverage."scopeJson" -> 'speeds') = 'array'
    AND jsonb_array_length(coverage."scopeJson" -> 'speeds') = 3
    AND (coverage."scopeJson" -> 'speeds') ?& ARRAY['BULLET', 'BLITZ', 'RAPID']
  `;
}

export const AccountImportAutomaticRefreshRepository =
  createAccountImportAutomaticRefreshRepository();