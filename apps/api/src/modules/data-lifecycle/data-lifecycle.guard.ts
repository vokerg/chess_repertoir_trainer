import { Prisma, PrismaClient } from '@prisma/client';
import prisma from '../../prisma';

export const DATA_LIFECYCLE_USER_LOCK_NAMESPACE = 17_000_259;

export interface DataLifecycleWriteScope {
  userId: number;
  accountId?: number | null;
  gameId?: number | null;
}

export interface DataLifecycleFenceColumns {
  userId: Prisma.Sql;
  accountId?: Prisma.Sql;
  gameId?: Prisma.Sql;
}

interface ActiveFenceRow {
  operationId: number;
  resourceType: string;
  resourceId: number;
}

interface GameOwnerRow {
  accountId: number;
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

  const scopePredicate = input.gameId != null
    ? Prisma.sql`
        fence."resourceType" = 'USER'
        OR (fence."resourceType" = 'ACCOUNT' AND fence."resourceId" = ${input.accountId!})
        OR (fence."resourceType" = 'GAME' AND fence."resourceId" = ${input.gameId})
      `
    : input.accountId != null
      ? Prisma.sql`
          fence."resourceType" = 'USER'
          OR (fence."resourceType" = 'ACCOUNT' AND fence."resourceId" = ${input.accountId})
          OR (fence."resourceType" = 'GAME' AND fence."ownerAccountId" = ${input.accountId})
        `
      : Prisma.sql`TRUE`;

  const rows = await transaction.$queryRaw<ActiveFenceRow[]>(Prisma.sql`
    SELECT fence."operationId", fence."resourceType", fence."resourceId"
    FROM "DataLifecycleResourceFence" AS fence
    WHERE fence."releasedAt" IS NULL
      AND fence."ownerUserId" = ${input.userId}
      AND (${scopePredicate})
    ORDER BY
      CASE fence."resourceType" WHEN 'USER' THEN 0 WHEN 'ACCOUNT' THEN 1 ELSE 2 END,
      fence."id"
    LIMIT 1
  `);
  const fence = rows[0];
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
    const games = await transaction.$queryRaw<GameOwnerRow[]>(Prisma.sql`
      SELECT game."accountId"
      FROM "ImportedGame" AS game
      WHERE game."id" = ${gameId}
        AND game."userId" = ${userId}
      FOR SHARE
    `);
    const game = games[0];
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
}

function validatePositiveInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive integer.`);
  }
}
