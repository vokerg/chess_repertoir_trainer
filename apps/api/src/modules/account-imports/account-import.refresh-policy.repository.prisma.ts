import { Prisma, PrismaClient } from '@prisma/client';
import prisma from '../../prisma';

const NON_TERMINAL_PREPARATION_STATUSES = [
  'QUEUED',
  'RUNNING',
  'PAUSE_REQUESTED',
  'PAUSED',
  'CANCEL_REQUESTED',
  'NEEDS_ATTENTION',
] as const;

interface RecoverableRefreshRow {
  id: number;
  status: 'FAILED' | 'CANCELLED';
}

export interface RecoverableAccountRefreshRun {
  id: number;
  status: 'FAILED' | 'CANCELLED';
}

export interface AccountImportRefreshPolicyRepository {
  findLatestRecoverableRefresh(
    userId: number,
    accountId: number,
  ): Promise<RecoverableAccountRefreshRun | null>;
}

export function createAccountImportRefreshPolicyRepository(
  database: PrismaClient = prisma,
): AccountImportRefreshPolicyRepository {
  return {
    async findLatestRecoverableRefresh(userId, accountId) {
      const rows = await database.$queryRaw<RecoverableRefreshRow[]>(Prisma.sql`
        SELECT run."id", run."status"
        FROM "ImportRun" AS run
        JOIN "ExternalAccount" AS account
          ON account."id" = run."accountId"
         AND account."userId" = run."userId"
        JOIN "DataPreparationTarget" AS target
          ON target."currentImportRunId" = run."id"
        JOIN "DataPreparationRun" AS preparation
          ON preparation."id" = target."preparationRunId"
         AND preparation."userId" = run."userId"
        WHERE run."userId" = ${userId}
          AND run."accountId" = ${accountId}
          AND run."source" = 'ACCOUNT_REFRESH'
          AND run."mode" <> 'LEGACY_SYNC'
          AND run."status" IN ('FAILED', 'CANCELLED')
          AND preparation."status" IN (${Prisma.join(
            NON_TERMINAL_PREPARATION_STATUSES.map((status) => Prisma.sql`${status}`),
          )})
        ORDER BY run."createdAt" DESC, run."id" DESC
        LIMIT 1
      `);
      return rows[0] ?? null;
    },
  };
}

export const AccountImportRefreshPolicyRepository =
  createAccountImportRefreshPolicyRepository();
