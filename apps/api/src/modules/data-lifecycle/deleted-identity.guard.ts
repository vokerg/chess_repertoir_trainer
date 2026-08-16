import { createHash } from 'node:crypto';
import { Prisma, PrismaClient } from '@prisma/client';
import {
  dataLifecycleActionSchema,
  dataLifecycleOperationStatusSchema,
  dataLifecycleTerminalResultSchema,
  type DataLifecycleAction,
  type DataLifecycleOperationStatus,
  type DataLifecycleTerminalResult,
} from '@chess-trainer/contracts/data-lifecycle';
import prisma from '../../prisma';
import {
  LifecycleHmacKeyring,
  hashOpaqueLifecycleToken,
  loadLifecycleIdentityKeyring,
} from './data-lifecycle.hmac';

const DELETED_IDENTITY_LOCK_NAMESPACE = 17_000_260;

interface TombstoneRow {
  operationId: number;
}

interface ExistsRow {
  exists: boolean;
}

interface ReceiptRow {
  id: number;
  action: string;
  status: string;
  terminalResult: string | null;
  completedAt: Date | null;
  receiptExpiresAt: Date | null;
}

export interface DataLifecycleReceiptStatus {
  operationId: number;
  action: DataLifecycleAction;
  status: DataLifecycleOperationStatus;
  terminalResult: DataLifecycleTerminalResult | null;
  completedAt: Date | null;
}

export class DeletedIdentityBlockedError extends Error {
  readonly code = 'DATA_LIFECYCLE_IDENTITY_DELETED' as const;

  constructor(readonly operationId: number) {
    super('This authenticated identity belongs to a deleted application account.');
    this.name = 'DeletedIdentityBlockedError';
  }
}

export interface DeletedIdentityGuard {
  assertCanProvision(
    transaction: Prisma.TransactionClient,
    provider: string,
    externalSubject: string,
  ): Promise<void>;
  createTombstone(
    transaction: Prisma.TransactionClient,
    input: { provider: string; externalSubject: string; operationId: number },
  ): Promise<void>;
  findOperationForIdentity(
    provider: string,
    externalSubject: string,
  ): Promise<DataLifecycleReceiptStatus | null>;
  findOperationByReceipt(receiptToken: string): Promise<DataLifecycleReceiptStatus | null>;
}

export function createDeletedIdentityGuard(
  database: PrismaClient = prisma,
  keyring: LifecycleHmacKeyring = loadLifecycleIdentityKeyring(),
): DeletedIdentityGuard {
  return {
    async assertCanProvision(transaction, provider, externalSubject) {
      validateIdentity(provider, externalSubject);
      await lockIdentity(transaction, provider, externalSubject);
      const tombstone = await findTombstone(transaction, keyring, provider, externalSubject);
      if (tombstone) throw new DeletedIdentityBlockedError(tombstone.operationId);
    },

    async createTombstone(transaction, input) {
      validateIdentity(input.provider, input.externalSubject);
      if (!Number.isInteger(input.operationId) || input.operationId <= 0) {
        throw new Error('operationId must be a positive integer.');
      }
      await lockIdentity(transaction, input.provider, input.externalSubject);
      const digest = keyring.current(identityValue(input.provider, input.externalSubject), 'deleted-identity');
      await transaction.$executeRaw(Prisma.sql`
        INSERT INTO "DeletedAuthIdentityTombstone" (
          "provider",
          "identityKeyVersion",
          "identityKeyHash",
          "operationId",
          "createdAt"
        ) VALUES (
          ${input.provider},
          ${digest.keyVersion},
          ${digest.digest},
          ${input.operationId},
          NOW()
        )
        ON CONFLICT ("provider", "identityKeyVersion", "identityKeyHash")
        DO NOTHING
      `);
    },

    async findOperationForIdentity(provider, externalSubject) {
      validateIdentity(provider, externalSubject);
      return database.$transaction(async (transaction) => {
        await lockIdentity(transaction, provider, externalSubject);
        const tombstone = await findTombstone(transaction, keyring, provider, externalSubject);
        if (!tombstone) return null;
        return findReceiptStatusByOperationId(transaction, tombstone.operationId);
      });
    },

    async findOperationByReceipt(receiptToken) {
      const receiptTokenHash = hashOpaqueLifecycleToken(receiptToken);
      const rows = await database.$queryRaw<ReceiptRow[]>(Prisma.sql`
        SELECT
          operation."id",
          operation."action",
          operation."status",
          operation."terminalResult",
          operation."completedAt",
          operation."receiptExpiresAt"
        FROM "DataLifecycleOperation" AS operation
        WHERE operation."receiptTokenHash" = ${receiptTokenHash}
          AND (
            operation."receiptExpiresAt" IS NULL
            OR operation."receiptExpiresAt" > NOW()
          )
        LIMIT 1
      `);
      return rows[0] ? toReceiptStatus(rows[0]) : null;
    },
  };
}

export const DeletedIdentityLifecycleGuard = createDeletedIdentityGuard();

async function findTombstone(
  transaction: Prisma.TransactionClient,
  keyring: LifecycleHmacKeyring,
  provider: string,
  externalSubject: string,
): Promise<TombstoneRow | null> {
  if (!keyring.configured) {
    const existing = await transaction.$queryRaw<ExistsRow[]>(Prisma.sql`
      SELECT EXISTS (
        SELECT 1
        FROM "DeletedAuthIdentityTombstone"
        WHERE "provider" = ${provider}
      ) AS "exists"
    `);
    if (existing[0]?.exists) {
      throw new Error(
        'Deleted identities exist for this provider but DATA_LIFECYCLE_IDENTITY_HMAC_KEY is not configured.',
      );
    }
    return null;
  }

  const digests = keyring.candidates(identityValue(provider, externalSubject), 'deleted-identity');
  if (digests.length === 0) return null;
  const matches = Prisma.join(digests.map((digest) => Prisma.sql`
    ("identityKeyVersion" = ${digest.keyVersion} AND "identityKeyHash" = ${digest.digest})
  `), ' OR ');
  const rows = await transaction.$queryRaw<TombstoneRow[]>(Prisma.sql`
    SELECT "operationId"
    FROM "DeletedAuthIdentityTombstone"
    WHERE "provider" = ${provider}
      AND (${matches})
    ORDER BY "id" DESC
    LIMIT 1
  `);
  return rows[0] ?? null;
}

async function findReceiptStatusByOperationId(
  transaction: Prisma.TransactionClient,
  operationId: number,
): Promise<DataLifecycleReceiptStatus | null> {
  const rows = await transaction.$queryRaw<ReceiptRow[]>(Prisma.sql`
    SELECT
      "id",
      "action",
      "status",
      "terminalResult",
      "completedAt",
      "receiptExpiresAt"
    FROM "DataLifecycleOperation"
    WHERE "id" = ${operationId}
    LIMIT 1
  `);
  return rows[0] ? toReceiptStatus(rows[0]) : null;
}

async function lockIdentity(
  transaction: Prisma.TransactionClient,
  provider: string,
  externalSubject: string,
): Promise<void> {
  const digest = createHash('sha256')
    .update(identityValue(provider, externalSubject), 'utf8')
    .digest();
  const lockKey = digest.readInt32BE(0);
  await transaction.$executeRaw(Prisma.sql`
    SELECT pg_advisory_xact_lock(
      ${DELETED_IDENTITY_LOCK_NAMESPACE}::integer,
      ${lockKey}::integer
    )
  `);
}

function toReceiptStatus(row: ReceiptRow): DataLifecycleReceiptStatus {
  return {
    operationId: row.id,
    action: dataLifecycleActionSchema.parse(row.action),
    status: dataLifecycleOperationStatusSchema.parse(row.status),
    terminalResult: row.terminalResult === null
      ? null
      : dataLifecycleTerminalResultSchema.parse(row.terminalResult),
    completedAt: row.completedAt,
  };
}

function identityValue(provider: string, externalSubject: string): string {
  return `${provider}\0${externalSubject}`;
}

function validateIdentity(provider: string, externalSubject: string): void {
  if (!provider.trim()) throw new Error('Identity provider is required.');
  if (!externalSubject.trim()) throw new Error('External identity subject is required.');
}
