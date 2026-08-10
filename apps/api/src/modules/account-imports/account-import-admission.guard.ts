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
 * ONB-019 owns persisted destructive lifecycle fences. ONB-011 keeps import
 * admission inside the create transaction and exposes this seam so lifecycle
 * fencing can replace the no-op without duplicating import creation logic.
 */
export const allowAccountImportAdmission: AccountImportAdmissionGuard = {
  async assertAllowed() {},
};
