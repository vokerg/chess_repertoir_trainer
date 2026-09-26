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

class MissingDeletedIdentityKeyError extends Error {}

interface TombstoneRow {
  operationId: number;
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
      let tombstone: TombstoneRow | null;
      try {
        tombstone = await findTombstone(transaction, keyring, provider, externalSubject);
      } catch (error) {
        if (
          error instanceof MissingDeletedIdentityKeyError
          && await canResolveEstablishedIdentity(transaction, provider, externalSubject)
        ) return;
        throw error;
      }
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
      const row = await database.dataLifecycleOperation.findFirst({
        where: {
          receiptTokenHash,
          OR: [
            { receiptExpiresAt: null },
            { receiptExpiresAt: { gt: new Date() } },
          ],
        },
        select: {
          id: true,
          action: true,
          status: true,
          terminalResult: true,
          completedAt: true,
          receiptExpiresAt: true,
        },
      });
      return row ? toReceiptStatus(row) : null;
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
  const persistedVersions = await transaction.deletedAuthIdentityTombstone.findMany({
    where: { provider },
    distinct: ['identityKeyVersion'],
    select: { identityKeyVersion: true },
  });
  const missingVersions = persistedVersions
    .map((row) => row.identityKeyVersion)
    .filter((version) => !keyring.hasVersion(version))
    .sort((left, right) => left - right);
  const digests = keyring.candidates(identityValue(provider, externalSubject), 'deleted-identity');
  if (digests.length > 0) {
    const tombstone = await transaction.deletedAuthIdentityTombstone.findFirst({
      where: {
        provider,
        OR: digests.map((digest) => ({
          identityKeyVersion: digest.keyVersion,
          identityKeyHash: digest.digest,
        })),
      },
      orderBy: { id: 'desc' },
      select: { operationId: true },
    });
    if (tombstone) return tombstone;
  }
  if (missingVersions.length > 0) {
    throw new MissingDeletedIdentityKeyError(
      `Deleted identities exist for provider ${provider} with unconfigured HMAC key version(s): ${missingVersions.join(', ')}.`,
    );
  }
  return null;
}

async function canResolveEstablishedIdentity(
  transaction: Prisma.TransactionClient,
  provider: string,
  externalSubject: string,
): Promise<boolean> {
  // The caller holds the same identity lock as final deletion. Deletion inserts
  // its tombstone and removes AppUser atomically, so this never creates a user.
  const existing = await transaction.appUser.findUnique({
    where: { authProvider_authSubject: { authProvider: provider, authSubject: externalSubject } },
    select: { id: true, createdAt: true },
  });
  if (!existing) return false;

  const oldestTombstone = await transaction.deletedAuthIdentityTombstone.findFirst({
    where: { provider },
    orderBy: { createdAt: 'asc' },
    select: { createdAt: true },
  });
  // Only accounts established before any retained deletion qualify. A row
  // created after a deletion could itself be an incorrectly reprovisioned identity.
  if (!oldestTombstone || existing.createdAt >= oldestTombstone.createdAt) return false;

  const deleted = await transaction.$queryRaw<TombstoneRow[]>(Prisma.sql`
    SELECT tombstone."operationId"
    FROM "DeletedAuthIdentityTombstone" AS tombstone
    JOIN "DataLifecycleOperation" AS operation ON operation."id" = tombstone."operationId"
    WHERE tombstone."provider" = ${provider}
      AND operation."targetUserId" = ${existing.id}
    LIMIT 1
  `);
  if (deleted[0]) throw new DeletedIdentityBlockedError(deleted[0].operationId);
  return true;
}

async function findReceiptStatusByOperationId(
  transaction: Prisma.TransactionClient,
  operationId: number,
): Promise<DataLifecycleReceiptStatus | null> {
  const row = await transaction.dataLifecycleOperation.findUnique({
    where: { id: operationId },
    select: {
      id: true,
      action: true,
      status: true,
      terminalResult: true,
      completedAt: true,
      receiptExpiresAt: true,
    },
  });
  return row ? toReceiptStatus(row) : null;
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
