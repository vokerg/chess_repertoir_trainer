import type { Prisma } from '@prisma/client';
import {
  DataLifecycleWriteBlockedError,
  assertDataLifecycleWriteAllowed,
} from '../data-lifecycle/data-lifecycle.guard';

export interface PreparationAdmissionGuardInput {
  userId: number;
  accountId: number;
}

export class PreparationAdmissionBlockedError extends Error {
  readonly code = 'PREPARATION_ADMISSION_BLOCKED' as const;

  constructor(message = 'Preparation is blocked by an active data lifecycle operation.') {
    super(message);
    this.name = 'PreparationAdmissionBlockedError';
  }
}

export interface PreparationAdmissionGuard {
  assertAllowed(
    transaction: Prisma.TransactionClient,
    input: PreparationAdmissionGuardInput,
  ): Promise<void>;
}

/**
 * Preparation admission shares the same short transaction lock used by
 * lifecycle fence creation. Expensive import/index/analysis work remains
 * outside the guard; admission is rechecked only at the durable boundary.
 */
export const allowPreparationAdmission: PreparationAdmissionGuard = {
  async assertAllowed(transaction, input) {
    try {
      await assertDataLifecycleWriteAllowed(transaction, input);
    } catch (error) {
      if (error instanceof DataLifecycleWriteBlockedError) {
        throw new PreparationAdmissionBlockedError();
      }
      throw error;
    }
  },
};
