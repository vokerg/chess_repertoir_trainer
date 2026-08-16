import { Prisma, PrismaClient } from '@prisma/client';
import prisma from '../../prisma';
import { lockDataLifecycleUserScope } from './data-lifecycle.guard';
import { DataLifecycleInvalidStateError } from './data-lifecycle.repository.prisma';

interface RecoveryRow {
  id: number;
  status: string;
  targetUserId: number;
  checkpointJson: unknown | null;
  firstDestructiveCommitAt: Date | null;
  workKey: string | null;
}

interface FenceCountRow {
  count: number;
}

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

    const rows = await transaction.$queryRaw<RecoveryRow[]>(Prisma.sql`
      SELECT
        "id",
        "status",
        "targetUserId",
        "checkpointJson",
        "firstDestructiveCommitAt",
        "workKey"
      FROM "DataLifecycleOperation"
      WHERE "id" = ${operationId}
        AND "targetUserId" = ${targetUserId}
      FOR UPDATE
    `);
    const operation = rows[0];
    if (!operation) {
      throw new DataLifecycleInvalidStateError('Data lifecycle operation was not found.');
    }
    if (
      operation.status !== 'NEEDS_ATTENTION'
      || operation.firstDestructiveCommitAt === null
      || operation.workKey !== null
    ) {
      throw new DataLifecycleInvalidStateError(
        'Only an unclaimed partially-applied NEEDS_ATTENTION operation can be resumed.',
      );
    }

    const fenceRows = await transaction.$queryRaw<FenceCountRow[]>(Prisma.sql`
      SELECT COUNT(*)::int AS "count"
      FROM "DataLifecycleResourceFence"
      WHERE "operationId" = ${operationId}
        AND "releasedAt" IS NULL
    `);
    if ((fenceRows[0]?.count ?? 0) === 0) {
      throw new DataLifecycleInvalidStateError(
        'A partially-applied lifecycle operation cannot resume without its durable fence.',
      );
    }

    await transaction.$executeRaw(Prisma.sql`
      UPDATE "DataLifecycleOperation"
      SET "status" = 'WAITING_FOR_DRAIN',
          "stopRequest" = 'NONE',
          "stopRequestedAt" = NULL,
          "terminalResult" = NULL,
          "errorCode" = NULL,
          "completedAt" = NULL,
          "updatedAt" = NOW()
      WHERE "id" = ${operationId}
    `);

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
