import { Prisma, PrismaClient } from '@prisma/client';
import prisma from '../../prisma';
import { lockDataLifecycleUserScope } from './data-lifecycle.guard';
import {
  DataLifecycleInvalidStateError,
  createDataLifecycleRepository,
  type StoredDataLifecycleOperation,
} from './data-lifecycle.repository.prisma';

const ACCOUNT_GAME_ACTIONS = [
  'UNANALYSE_GAMES',
  'UNINDEX_GAMES',
  'PURGE_ACCOUNT_DATA',
  'DELETE_EXTERNAL_ACCOUNT',
] as const;

const CLAIMABLE_STATUSES = [
  'FENCING',
  'CANCEL_REQUESTED',
  'WAITING_FOR_DRAIN',
  'EXECUTING',
  'VERIFYING',
] as const;

interface ClaimedOperationRow {
  id: number;
  targetUserId: number;
}

export interface AccountGameDataLifecycleOperationRepository {
  claimNext(workKey: string): Promise<StoredDataLifecycleOperation | null>;
  releaseClaim(operationId: number, workKey: string): Promise<boolean>;
  recoverStaleClaims(staleBefore: Date): Promise<number>;
  resumeNeedsAttention(targetUserId: number, operationId: number): Promise<StoredDataLifecycleOperation>;
}

export function createAccountGameDataLifecycleOperationRepository(
  database: PrismaClient = prisma,
): AccountGameDataLifecycleOperationRepository {
  const lifecycleRepository = createDataLifecycleRepository(database);

  return {
    async claimNext(workKey) {
      validateWorkKey(workKey);
      const rows = await database.$queryRaw<ClaimedOperationRow[]>(Prisma.sql`
        WITH candidate AS (
          SELECT "id"
          FROM "DataLifecycleOperation"
          WHERE "action" IN (${Prisma.join(ACCOUNT_GAME_ACTIONS.map((action) => Prisma.sql`${action}`))})
            AND "status" IN (${Prisma.join(CLAIMABLE_STATUSES.map((status) => Prisma.sql`${status}`))})
            AND "workKey" IS NULL
          ORDER BY "updatedAt" ASC, "id" ASC
          FOR UPDATE SKIP LOCKED
          LIMIT 1
        )
        UPDATE "DataLifecycleOperation" AS operation
        SET "workKey" = ${workKey},
            "claimedAt" = NOW(),
            "heartbeatAt" = NOW(),
            "updatedAt" = NOW()
        FROM candidate
        WHERE operation."id" = candidate."id"
          AND operation."workKey" IS NULL
        RETURNING operation."id", operation."targetUserId"
      `);
      const claimed = rows[0];
      if (!claimed) return null;
      return lifecycleRepository.getForTargetUser(claimed.targetUserId, claimed.id);
    },

    async releaseClaim(operationId, workKey) {
      validatePositiveInteger(operationId, 'operationId');
      validateWorkKey(workKey);
      const updated = await database.$executeRaw(Prisma.sql`
        UPDATE "DataLifecycleOperation"
        SET "workKey" = NULL,
            "claimedAt" = NULL,
            "heartbeatAt" = NULL,
            "updatedAt" = NOW()
        WHERE "id" = ${operationId}
          AND "workKey" = ${workKey}
          AND "status" IN (${Prisma.join(CLAIMABLE_STATUSES.map((status) => Prisma.sql`${status}`))})
      `);
      return updated === 1;
    },

    async recoverStaleClaims(staleBefore) {
      if (!(staleBefore instanceof Date) || Number.isNaN(staleBefore.getTime())) {
        throw new Error('Lifecycle staleBefore must be a valid Date.');
      }
      return database.$executeRaw(Prisma.sql`
        UPDATE "DataLifecycleOperation"
        SET "workKey" = NULL,
            "claimedAt" = NULL,
            "heartbeatAt" = NULL,
            "updatedAt" = NOW()
        WHERE "action" IN (${Prisma.join(ACCOUNT_GAME_ACTIONS.map((action) => Prisma.sql`${action}`))})
          AND "status" IN (${Prisma.join(CLAIMABLE_STATUSES.map((status) => Prisma.sql`${status}`))})
          AND "workKey" IS NOT NULL
          AND COALESCE("heartbeatAt", "claimedAt") < ${staleBefore}
      `);
    },

    async resumeNeedsAttention(targetUserId, operationId) {
      validatePositiveInteger(targetUserId, 'targetUserId');
      validatePositiveInteger(operationId, 'operationId');
      await database.$transaction(async (transaction) => {
        await lockDataLifecycleUserScope(transaction, targetUserId);
        const activeFence = await transaction.dataLifecycleResourceFence.findFirst({
          where: { operationId, ownerUserId: targetUserId, releasedAt: null },
          select: { id: true },
        });
        if (!activeFence) {
          throw new DataLifecycleInvalidStateError(
            'A lifecycle operation without an active fence cannot resume destructive execution.',
          );
        }

        const updated = await transaction.$executeRaw(Prisma.sql`
          UPDATE "DataLifecycleOperation"
          SET "status" = 'EXECUTING',
              "terminalResult" = NULL,
              "errorCode" = NULL,
              "stopRequest" = 'NONE',
              "stopRequestedAt" = NULL,
              "workKey" = NULL,
              "claimedAt" = NULL,
              "heartbeatAt" = NULL,
              "completedAt" = NULL,
              "updatedAt" = NOW()
          WHERE "id" = ${operationId}
            AND "targetUserId" = ${targetUserId}
            AND "status" = 'NEEDS_ATTENTION'
            AND "firstDestructiveCommitAt" IS NOT NULL
        `);
        if (updated !== 1) {
          throw new DataLifecycleInvalidStateError(
            'Only a partially executed lifecycle operation in NEEDS_ATTENTION can resume.',
          );
        }
      });

      const operation = await lifecycleRepository.getForTargetUser(targetUserId, operationId);
      if (!operation) throw new DataLifecycleInvalidStateError('Lifecycle operation disappeared after resume.');
      return operation;
    },
  };
}

function validatePositiveInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`${label} must be a positive integer.`);
}

function validateWorkKey(value: string): void {
  if (!value.trim() || value.length > 80) throw new Error('Lifecycle workKey must contain 1-80 characters.');
}

export const AccountGameDataLifecycleOperationRepository =
  createAccountGameDataLifecycleOperationRepository();
