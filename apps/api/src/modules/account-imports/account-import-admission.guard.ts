import { Prisma } from '@prisma/client';
import {
  DataLifecycleWriteBlockedError,
  assertDataLifecycleWriteAllowed,
  dataLifecycleAdmissionPredicate,
} from '../data-lifecycle/data-lifecycle.guard';

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
 * Persisted lifecycle fences are checked both while selecting worker candidates
 * and under the shared user-scoped transaction lock immediately before durable
 * import/coverage writes. That lock is also used by fence creation, so a writer
 * that already owns the short commit guard may finish before the fence commits;
 * later writers observe the durable fence and are rejected.
 */
export const allowAccountImportAdmission: AccountImportAdmissionGuard = {
  claimCandidatePredicate(columns) {
    return dataLifecycleAdmissionPredicate(columns);
  },
  async assertAllowed(transaction, input) {
    try {
      await assertDataLifecycleWriteAllowed(transaction, input);
    } catch (error) {
      if (error instanceof DataLifecycleWriteBlockedError) {
        throw new AccountImportAdmissionBlockedError();
      }
      throw error;
    }
  },
};
