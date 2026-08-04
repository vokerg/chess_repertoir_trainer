import type { Prisma } from '@prisma/client';

export interface PreparationAdmissionGuardInput {
  userId: number;
  accountId: number;
}

export interface PreparationAdmissionGuard {
  assertAllowed(
    transaction: Prisma.TransactionClient,
    input: PreparationAdmissionGuardInput,
  ): Promise<void>;
}

/**
 * ONB-019 owns persisted destructive lifecycle fences. ONB-017 keeps the
 * admission check inside the serialized transaction and exposes this seam so
 * the lifecycle implementation can replace the no-op without duplicating
 * preparation admission logic or introducing provisional fence tables here.
 */
export const allowPreparationAdmission: PreparationAdmissionGuard = {
  async assertAllowed() {},
};
