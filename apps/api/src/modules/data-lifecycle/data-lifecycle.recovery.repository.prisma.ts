import { PrismaClient } from '@prisma/client';
import prisma from '../../prisma';
import { lockDataLifecycleUserScope } from './data-lifecycle.guard';
import { DataLifecycleInvalidStateError } from './data-lifecycle.repository.prisma';

export interface ResumedDataLifecycleOperation {
  operationId: number;
  status: 'WAITING_FOR_DRAIN';
  checkpoint: unknown | null;
  firstDestructiveCommitAt: Date;
}

/**
 * Explicit internal recovery primitive for partially-applied lifecycle work.
 *
 * NEEDS_ATTENTION is intentionally not picked up by normal workers. An operator
 * or future administrator recovery flow must deliberately requeue the operation.
 * The durable fence, checkpoint and first-destructive-commit evidence are kept;
 * only the stale stop/error marker is cleared so a worker can drain/reconcile
 * before resuming destructive execution.
 */
export async function resumeDataLifecycleNeedsAttention(
  targetUserId: number,
  operationId: number,
  database: PrismaClient = prisma,
): Promise<ResumedDataLifecycleOperation> {
  validatePositiveInteger(targetUserId, 'targetUserId');
  validatePositiveInteger(operationId, 'operationId');

  return database.$transaction(async (transaction) => {
    await lockDataLifecycleUserScope(transaction, targetUserId);

    const updated = await transaction.dataLifecycleOperation.updateMany({
      where: {
        id: operationId,
        targetUserId,
        status: 'NEEDS_ATTENTION',
        firstDestructiveCommitAt: { not: null },
        workKey: null,
      },
      data: {
        status: 'WAITING_FOR_DRAIN',
        stopRequest: 'NONE',
        stopRequestedAt: null,
        terminalResult: null,
        errorCode: null,
        completedAt: null,
      },
    });
    if (updated.count !== 1) {
      throw new DataLifecycleInvalidStateError(
        'Only an unclaimed partially-applied NEEDS_ATTENTION operation can be resumed.',
      );
    }

    const operation = await transaction.dataLifecycleOperation.findUnique({
      where: { id: operationId },
      select: {
        checkpointJson: true,
        firstDestructiveCommitAt: true,
      },
    });
    if (!operation?.firstDestructiveCommitAt) {
      throw new DataLifecycleInvalidStateError('Data lifecycle operation was not found.');
    }

    const activeFenceCount = await transaction.dataLifecycleResourceFence.count({
      where: { operationId, releasedAt: null },
    });
    if (activeFenceCount === 0) {
      throw new DataLifecycleInvalidStateError(
        'A partially-applied lifecycle operation cannot resume without its durable fence.',
      );
    }

    return {
      operationId,
      status: 'WAITING_FOR_DRAIN' as const,
      checkpoint: operation.checkpointJson,
      firstDestructiveCommitAt: operation.firstDestructiveCommitAt,
    };
  });
}

function validatePositiveInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive integer.`);
  }
}
