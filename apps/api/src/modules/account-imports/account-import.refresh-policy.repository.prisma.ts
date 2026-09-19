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

    const linkedRows = await transaction.$queryRaw<BlockingRefreshRow[]>(Prisma.sql`
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
    const linkedBlocker = linkedRows[0];
    if (linkedBlocker) {
      if (linkedBlocker.status === 'FAILED' || linkedBlocker.status === 'CANCELLED') {
        throw new AccountImportRefreshRetryRequiredError(linkedBlocker.id, linkedBlocker.status);
      }
      throw new AccountImportActiveRunError(linkedBlocker.id);
    }

    // Initial refresh establishes exact coverage newest-first. If that attempt
    // terminates after only part of its accepted range is proved, starting a
    // new forward refresh from coveredThrough would abandon the missing older
    // interval. Keep the immutable failed/cancelled attempt as the recovery
    // authority until its range is fully covered. A future account purge
    // deletes AccountImportCoverage, so retained terminal history alone cannot
    // create this block; the coverage epoch check also rejects fresh post-purge
    // coverage from reviving an older failed attempt.
    const incompleteRows = await transaction.$queryRaw<BlockingRefreshRow[]>(Prisma.sql`
      SELECT run."id", run."status"
      FROM "ImportRun" AS run
      JOIN "AccountImportCoverage" AS coverage
        ON coverage."accountId" = run."accountId"
       AND coverage."scopeHash" = run."scopeHash"
      WHERE run."userId" = ${input.userId}
        AND run."accountId" = ${input.accountId}
        AND run."source" = 'ACCOUNT_REFRESH'
        AND run."mode" = 'BOUNDED_INITIAL'
        AND run."status" IN ('FAILED', 'CANCELLED')
        AND run."completedAt" IS NOT NULL
        AND run."requestedFrom" IS NOT NULL
        AND run."requestedTo" IS NOT NULL
        AND coverage."coveredFrom" IS NOT NULL
        AND coverage."coveredThrough" IS NOT NULL
        AND run."completedAt" >= coverage."createdAt"
        AND NOT (
          coverage."coveredFrom" <= run."requestedFrom"
          AND coverage."coveredThrough" >= run."requestedTo"
        )
      ORDER BY run."completedAt" DESC, run."id" DESC
      LIMIT 1
    `);
    const incomplete = incompleteRows[0];
    if (incomplete && (incomplete.status === 'FAILED' || incomplete.status === 'CANCELLED')) {
      throw new AccountImportRefreshRetryRequiredError(incomplete.id, incomplete.status);
    }
  },
};

export const AccountRefreshImportRepository = createAccountImportRepository(
  prisma,
  accountImportRefreshAdmissionGuard,
);
