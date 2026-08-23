import { Prisma, PrismaClient } from '@prisma/client';
import prisma from '../../prisma';

interface LatestRefreshRow {
  id: number;
  status: string;
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
      const rows = await database.$queryRaw<LatestRefreshRow[]>(Prisma.sql`
        SELECT run."id", run."status"
        FROM "ImportRun" AS run
        JOIN "ExternalAccount" AS account
          ON account."id" = run."accountId"
         AND account."userId" = run."userId"
        WHERE run."userId" = ${userId}
          AND run."accountId" = ${accountId}
          AND run."source" = 'ACCOUNT_REFRESH'
          AND run."mode" <> 'LEGACY_SYNC'
        ORDER BY run."createdAt" DESC, run."id" DESC
        LIMIT 1
      `);
      const latest = rows[0];
      if (!latest || (latest.status !== 'FAILED' && latest.status !== 'CANCELLED')) {
        return null;
      }
      return {
        id: latest.id,
        status: latest.status,
      };
    },
  };
}

export const AccountImportRefreshPolicyRepository =
  createAccountImportRefreshPolicyRepository();
