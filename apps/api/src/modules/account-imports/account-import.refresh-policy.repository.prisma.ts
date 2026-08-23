import { Prisma } from '@prisma/client';
import prisma from '../../prisma';
import {
  allowAccountImportAdmission,
  type AccountImportAdmissionGuard,
} from './account-import-admission.guard';
import {
  AccountImportActiveRunError,
  createAccountImportRepository,
} from './account-import.repository.prisma';

const NON_TERMINAL_PREPARATION_STATUSES = [
  'QUEUED',
  'RUNNING',
  'PAUSE_REQUESTED',
  'PAUSED',
  'CANCEL_REQUESTED',
  'NEEDS_ATTENTION',
] as const;

interface BlockingRefreshRow {
  id: number;
  status: string;
}

export class AccountImportRefreshRetryRequiredError extends Error {
  constructor(readonly importRunId: number, readonly importStatus: 'FAILED' | 'CANCELLED') {
    super(`Retry the ${importStatus.toLowerCase()} account import before starting new account-refresh work.`);
    this.name = 'AccountImportRefreshRetryRequiredError';
  }
}

export const accountImportRefreshAdmissionGuard: AccountImportAdmissionGuard = {
  claimCandidatePredicate(columns) {
    return allowAccountImportAdmission.claimCandidatePredicate(columns);
  },

  async assertAllowed(transaction, input) {
    // This acquires the same user-scoped transaction lock used by preparation
    // admission. Handoff cannot attach a recoverable parent between this check
    // and the account-import insert.
    await allowAccountImportAdmission.assertAllowed(transaction, input);

    const rows = await transaction.$queryRaw<BlockingRefreshRow[]>(Prisma.sql`
      SELECT run."id", run."status"
      FROM "ImportRun" AS run
      JOIN "DataPreparationTarget" AS target
        ON target."currentImportRunId" = run."id"
      JOIN "DataPreparationRun" AS preparation
        ON preparation."id" = target."preparationRunId"
       AND preparation."userId" = run."userId"
      WHERE run."userId" = ${input.userId}
        AND run."accountId" = ${input.accountId}
        AND run."source" = 'ACCOUNT_REFRESH'
        AND run."mode" <> 'LEGACY_SYNC'
        AND run."status" <> 'COMPLETED'
        AND preparation."status" IN (${Prisma.join(
          NON_TERMINAL_PREPARATION_STATUSES.map((status) => Prisma.sql`${status}`),
        )})
      ORDER BY run."createdAt" DESC, run."id" DESC
      LIMIT 1
    `);
    const blocker = rows[0];
    if (!blocker) return;

    if (blocker.status === 'FAILED' || blocker.status === 'CANCELLED') {
      throw new AccountImportRefreshRetryRequiredError(blocker.id, blocker.status);
    }
    throw new AccountImportActiveRunError(blocker.id);
  },
};

export const AccountRefreshImportRepository = createAccountImportRepository(
  prisma,
  accountImportRefreshAdmissionGuard,
);
