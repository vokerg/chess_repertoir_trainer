import { Prisma } from '@prisma/client';

export interface AccountImportAdmissionGuardInput {
  userId: number;
  accountId: number;
}

export interface AccountImportClaimCandidateColumns {
  userId: Prisma.Sql;
  accountId: Prisma.Sql;
}

export class AccountImportAdmissionBlockedError extends Error {
  readonly code = 'ACCOUNT_IMPORT_ADMISSION_BLOCKED' as const;

  constructor(message = 'Account import is blocked by an active data lifecycle operation.') {
    super(message);
    this.name = 'AccountImportAdmissionBlockedError';
  }
}

export interface AccountImportAdmissionGuard {
  claimCandidatePredicate(columns: AccountImportClaimCandidateColumns): Prisma.Sql;
  assertAllowed(
    transaction: Prisma.TransactionClient,
    input: AccountImportAdmissionGuardInput,
  ): Promise<void>;
}

/**
 * ONB-019 owns persisted destructive lifecycle fences. ONB-011/012 call this
 * guard when accepting durable import work, selecting worker claims, and
 * immediately before each bounded game/coverage commit. Claim filtering keeps
 * fenced queue entries from starving unrelated runnable accounts; assertAllowed
 * remains the transactional race-safe recheck before mutation. ONB-019 can
 * therefore replace the no-op through this one seam without duplicating import
 * creation, scheduling, or persistence logic.
 */
export const allowAccountImportAdmission: AccountImportAdmissionGuard = {
  claimCandidatePredicate() {
    return Prisma.sql`TRUE`;
  },
  async assertAllowed() {},
};
