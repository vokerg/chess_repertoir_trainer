import type { Prisma } from '@prisma/client';

export interface AccountImportAdmissionGuardInput {
  userId: number;
  accountId: number;
}

export interface AccountImportAdmissionGuard {
  assertAllowed(
    transaction: Prisma.TransactionClient,
    input: AccountImportAdmissionGuardInput,
  ): Promise<void>;
}

/**
 * ONB-019 owns persisted destructive lifecycle fences. ONB-011 calls this
 * guard both when accepting durable import work and immediately before each
 * bounded game commit, always inside the same short database transaction as
 * the guarded mutation. ONB-019 can therefore replace the no-op without
 * duplicating import creation or persistence logic.
 */
export const allowAccountImportAdmission: AccountImportAdmissionGuard = {
  async assertAllowed() {},
};
