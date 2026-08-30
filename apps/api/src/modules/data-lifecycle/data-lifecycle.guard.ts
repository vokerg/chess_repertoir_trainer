import { Prisma, PrismaClient } from '@prisma/client';
import prisma from '../../prisma';

export const DATA_LIFECYCLE_USER_LOCK_NAMESPACE = 17_000_259;

export interface DataLifecycleWriteScope {
  userId: number;
  accountId?: number | null;
  gameId?: number | null;
  snapshotStartedAt?: Date | null;
}

export interface DataLifecycleFenceColumns {
  userId: Prisma.Sql;
  accountId?: Prisma.Sql;
  gameId?: Prisma.Sql;
}

export class DataLifecycleWriteBlockedError extends Error {
  readonly code = 'DATA_LIFECYCLE_WRITE_BLOCKED' as const;

  constructor(
    readonly operationId: number,
    readonly resourceType: string,
    readonly resourceId: number,
  ) {
    super('Write is blocked by an active data lifecycle operation.');
    this.name = 'DataLifecycleWriteBlockedError';
  }
}

export function dataLifecycleAdmissionPredicate(
  columns: DataLifecycleFenceColumns,
): Prisma.Sql {
  const scopePredicate = columns.gameId
    ? Prisma.sql`
        fence."resourceType" = 'USER'
        ${columns.accountId
          ? Prisma.sql`OR (fence."resourceType" = 'ACCOUNT' AND fence."resourceId" = ${columns.accountId})`
          : Prisma.empty}
        OR (fence."resourceType" = 'GAME' AND fence."resourceId" = ${columns.gameId})
      `
    : columns.accountId
      ? Prisma.sql`
          fence."resourceType" = 'USER'
          OR (fence."resourceType" = 'ACCOUNT' AND fence."resourceId" = ${columns.accountId})
          OR (fence."resourceType" = 'GAME' AND fence."ownerAccountId" = ${columns.accountId})
        `
      : Prisma.sql`TRUE`;

  return Prisma.sql`
    NOT EXISTS (
      SELECT 1
      FROM "DataLifecycleResourceFence" AS fence
      WHERE fence."releasedAt" IS NULL
        AND fence."ownerUserId" = ${columns.userId}
        AND (${scopePredicate})
    )
  `;
}

export async function assertDataLifecycleWriteAllowed(
  transaction: Prisma.TransactionClient,
  input: DataLifecycleWriteScope,
): Promise<void> {
  validateScope(input);
  await lockDataLifecycleUserScope(transaction, input.userId);

  const scopeWhere: Prisma.DataLifecycleResourceFenceWhereInput = input.gameId != null
    ? {
        OR: [
          { resourceType: 'USER' },
          { resourceType: 'ACCOUNT', resourceId: input.accountId! },
          { resourceType: 'GAME', resourceId: input.gameId },
        ],
      }
    : input.accountId != null
      ? {
          OR: [
            { resourceType: 'USER' },
            { resourceType: 'ACCOUNT', resourceId: input.accountId },
            { resourceType: 'GAME', ownerAccountId: input.accountId },
          ],
        }
      : {};
  const fenceWindowWhere: Prisma.DataLifecycleResourceFenceWhereInput = input.snapshotStartedAt
    ? {
        OR: [
          { releasedAt: null },
          { releasedAt: { gte: input.snapshotStartedAt } },
        ],
      }
    : { releasedAt: null };

  const fence = await transaction.dataLifecycleResourceFence.findFirst({
    where: {
      ownerUserId: input.userId,
      AND: [scopeWhere, fenceWindowWhere],
    },
    orderBy: { id: 'asc' },
    select: {
      operationId: true,
      resourceType: true,
      resourceId: true,
    },
  });
  if (fence) {
    throw new DataLifecycleWriteBlockedError(
      fence.operationId,
      fence.resourceType,
      fence.resourceId,
    );
  }
}

export async function assertGameLifecycleWriteAllowed(
  userId: number,
  gameId: number,
  database: PrismaClient = prisma,
): Promise<void> {
  validatePositiveInteger(userId, 'userId');
  validatePositiveInteger(gameId, 'gameId');

  await database.$transaction(async (transaction) => {
    await lockDataLifecycleUserScope(transaction, userId);
    const game = await transaction.importedGame.findFirst({
      where: { id: gameId, userId },
      select: { accountId: true },
    });
    if (!game) return;
    await assertDataLifecycleWriteAllowed(transaction, {
      userId,
      accountId: game.accountId,
      gameId,
    });
  });
}

export async function lockDataLifecycleUserScope(
  transaction: Prisma.TransactionClient,
  userId: number,
): Promise<void> {
  validatePositiveInteger(userId, 'userId');
  await transaction.$executeRaw(Prisma.sql`
    SELECT pg_advisory_xact_lock(
      ${DATA_LIFECYCLE_USER_LOCK_NAMESPACE}::integer,
      ${userId}::integer
    )
  `);
}

function validateScope(input: DataLifecycleWriteScope): void {
  validatePositiveInteger(input.userId, 'userId');
  if (input.accountId != null) validatePositiveInteger(input.accountId, 'accountId');
  if (input.gameId != null) {
    validatePositiveInteger(input.gameId, 'gameId');
    if (input.accountId == null) {
      throw new Error('accountId is required when gameId is provided.');
    }
  }
  if (input.snapshotStartedAt != null && Number.isNaN(input.snapshotStartedAt.getTime())) {
    throw new Error('snapshotStartedAt must be a valid timestamp.');
  }
}

function validatePositiveInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive integer.`);
  }
}
