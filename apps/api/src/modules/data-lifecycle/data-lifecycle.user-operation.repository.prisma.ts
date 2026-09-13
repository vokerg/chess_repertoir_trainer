import { Prisma, PrismaClient } from '@prisma/client';
import prisma from '../../prisma';
import { lockDataLifecycleUserScope } from './data-lifecycle.guard';
import {
  DataLifecycleInvalidStateError,
  createDataLifecycleRepository,
  type StoredDataLifecycleOperation,
} from './data-lifecycle.repository.prisma';

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

export interface UserDataLifecycleOperationRepository {
  claimNext(workKey: string): Promise<StoredDataLifecycleOperation | null>;
  releaseClaim(operationId: number, workKey: string): Promise<boolean>;
  recoverStaleClaims(staleBefore: Date): Promise<number>;
  resumeNeedsAttention(
    targetUserId: number,
    operationId: number,
    idempotencyKeyHash: string,
  ): Promise<StoredDataLifecycleOperation>;
}

export function createUserDataLifecycleOperationRepository(
  database: PrismaClient = prisma,
): UserDataLifecycleOperationRepository {
  const lifecycleRepository = createDataLifecycleRepository(database);
  return {
    async claimNext(workKey) {
      validateWorkKey(workKey);
      const rows = await database.$queryRaw<ClaimedOperationRow[]>(Prisma.sql`
        WITH candidate AS (
          SELECT "id"
          FROM "DataLifecycleOperation"
          WHERE "action" = 'DELETE_APP_USER'
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
      return claimed
        ? lifecycleRepository.getForTargetUser(claimed.targetUserId, claimed.id)
        : null;
    },

    async releaseClaim(operationId, workKey) {
      validatePositiveInteger(operationId, 'operationId');
      validateWorkKey(workKey);
      return (await database.$executeRaw(Prisma.sql`
        UPDATE "DataLifecycleOperation"
        SET "workKey" = NULL,
            "claimedAt" = NULL,
            "heartbeatAt" = NULL,
            "updatedAt" = NOW()
        WHERE "id" = ${operationId}
          AND "action" = 'DELETE_APP_USER'
          AND "workKey" = ${workKey}
          AND "status" IN (${Prisma.join(CLAIMABLE_STATUSES.map((status) => Prisma.sql`${status}`))})
      `)) === 1;
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
        WHERE "action" = 'DELETE_APP_USER'
          AND "status" IN (${Prisma.join(CLAIMABLE_STATUSES.map((status) => Prisma.sql`${status}`))})
          AND "workKey" IS NOT NULL
          AND COALESCE("heartbeatAt", "claimedAt") < ${staleBefore}
      `);
    },

    async resumeNeedsAttention(targetUserId, operationId, idempotencyKeyHash) {
      validatePositiveInteger(targetUserId, 'targetUserId');
      validatePositiveInteger(operationId, 'operationId');
      validateSha256(idempotencyKeyHash, 'idempotencyKeyHash');
      await database.$transaction(async (transaction) => {
        await lockDataLifecycleUserScope(transaction, targetUserId);
        const operation = await transaction.dataLifecycleOperation.findFirst({
          where: {
            id: operationId,
            targetUserId,
            action: 'DELETE_APP_USER',
            status: 'NEEDS_ATTENTION',
            firstDestructiveCommitAt: { not: null },
            idempotencyKeyHash,
          },
        });
        if (!operation) {
          throw new DataLifecycleInvalidStateError(
            'Only the matching partially executed user deletion can resume.',
          );
        }
        const fence = await transaction.dataLifecycleResourceFence.findFirst({
          where: {
            operationId,
            ownerUserId: targetUserId,
            resourceType: 'USER',
            releasedAt: null,
          },
          select: { id: true },
        });
        if (!fence) {
          throw new DataLifecycleInvalidStateError(
            'A partially executed user deletion must retain its USER fence.',
          );
        }
        const updated = await transaction.dataLifecycleOperation.updateMany({
          where: {
            id: operationId,
            targetUserId,
            action: 'DELETE_APP_USER',
            status: 'NEEDS_ATTENTION',
            firstDestructiveCommitAt: { not: null },
            idempotencyKeyHash,
          },
          data: {
            status: 'EXECUTING',
            terminalResult: null,
            errorCode: null,
            stopRequest: 'NONE',
            stopRequestedAt: null,
            workKey: null,
            claimedAt: null,
            heartbeatAt: null,
            completedAt: null,
          },
        });
        if (updated.count !== 1) {
          throw new DataLifecycleInvalidStateError(
            'User deletion changed concurrently before it could resume.',
          );
        }
      });
      const operation = await lifecycleRepository.getForTargetUser(targetUserId, operationId);
      if (!operation) throw new DataLifecycleInvalidStateError('User deletion disappeared after resume.');
      return operation;
    },
  };
}

function validatePositiveInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`${label} must be a positive integer.`);
}

function validateWorkKey(value: string): void {
  if (!value.trim() || value.length > 80) {
    throw new Error('Lifecycle workKey must contain 1-80 characters.');
  }
}

function validateSha256(value: string, label: string): void {
  if (!/^[a-f0-9]{64}$/.test(value)) {
    throw new Error(`${label} must be a lowercase SHA-256 hex digest.`);
  }
}

export const UserDataLifecycleOperationRepository =
  createUserDataLifecycleOperationRepository();
