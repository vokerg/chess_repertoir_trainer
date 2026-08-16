import { Prisma, PrismaClient } from '@prisma/client';
import {
  dataLifecycleActionSchema,
  dataLifecycleOperationStatusSchema,
  dataLifecyclePreviewCountsSchema,
  dataLifecycleScopeSchema,
  dataLifecycleTerminalResultSchema,
  type DataLifecycleAction,
  type DataLifecycleOperationStatus,
  type DataLifecyclePreviewCounts,
  type DataLifecycleScope,
  type DataLifecycleTerminalResult,
} from '@chess-trainer/contracts/data-lifecycle';
import prisma from '../../prisma';
import {
  lockDataLifecycleUserScope,
} from './data-lifecycle.guard';

const CLAIMABLE_STATUSES = [
  'FENCING',
  'CANCEL_REQUESTED',
  'WAITING_FOR_DRAIN',
  'EXECUTING',
  'VERIFYING',
] as const;
const TERMINAL_STATUSES = [
  'COMPLETED',
  'NEEDS_ATTENTION',
  'FAILED',
  'CANCELLED',
  'EXPIRED',
] as const;

interface OperationRow {
  id: number;
  action: string;
  status: string;
  actorUserId: number | null;
  targetUserId: number;
  scopeResourceType: string;
  scopeJson: unknown;
  previewCountsJson: unknown;
  previewHash: string;
  previewTokenHash: string;
  previewExpiresAt: Date;
  confirmationPhrase: string;
  warningCodes: string[];
  idempotencyKeyHash: string | null;
  stopRequest: string;
  stopRequestedAt: Date | null;
  checkpointJson: unknown | null;
  workKey: string | null;
  claimedAt: Date | null;
  heartbeatAt: Date | null;
  firstDestructiveCommitAt: Date | null;
  verificationJson: unknown | null;
  terminalResult: string | null;
  errorCode: string | null;
  receiptTokenHash: string | null;
  receiptExpiresAt: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface IdRow {
  id: number;
}

interface CountRow {
  count: number;
}

export interface StoredDataLifecycleOperation {
  id: number;
  action: DataLifecycleAction;
  status: DataLifecycleOperationStatus;
  actorUserId: number | null;
  targetUserId: number;
  scope: DataLifecycleScope;
  previewCounts: DataLifecyclePreviewCounts;
  previewHash: string;
  previewTokenHash: string;
  previewExpiresAt: Date;
  confirmationPhrase: string;
  warningCodes: string[];
  idempotencyKeyHash: string | null;
  stopRequest: string;
  stopRequestedAt: Date | null;
  checkpoint: unknown | null;
  workKey: string | null;
  claimedAt: Date | null;
  heartbeatAt: Date | null;
  firstDestructiveCommitAt: Date | null;
  verification: unknown | null;
  terminalResult: DataLifecycleTerminalResult | null;
  errorCode: string | null;
  receiptTokenHash: string | null;
  receiptExpiresAt: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDataLifecyclePreviewInput {
  action: DataLifecycleAction;
  actorUserId?: number | null;
  targetUserId: number;
  actorKeyVersion: number;
  actorKeyHash: string;
  targetKeyVersion: number;
  targetKeyHash: string;
  scope: DataLifecycleScope;
  previewCounts: DataLifecyclePreviewCounts;
  previewHash: string;
  previewTokenHash: string;
  previewExpiresAt: Date;
  confirmationPhrase: string;
  warningCodes?: string[];
}

export interface StartDataLifecycleExecutionInput {
  operationId: number;
  targetUserId: number;
  previewTokenHash: string;
  previewHash: string;
  idempotencyKeyHash: string;
  receiptTokenHash?: string | null;
  receiptExpiresAt?: Date | null;
}

export interface AppendLifecycleAuditInput {
  operationId: number;
  eventType: string;
  action: DataLifecycleAction;
  status?: DataLifecycleOperationStatus | null;
  actorKeyVersion: number;
  actorKeyHash: string;
  targetKeyVersion: number;
  targetKeyHash: string;
  resourceType?: 'USER' | 'ACCOUNT' | 'GAME' | null;
  aggregateCounts?: DataLifecyclePreviewCounts | null;
  reasonCode?: string | null;
  errorCode?: string | null;
  confirmationMethod?: string | null;
  terminalResult?: DataLifecycleTerminalResult | null;
}

export class DataLifecycleConflictError extends Error {
  readonly code = 'DATA_LIFECYCLE_CONFLICT' as const;
  constructor() {
    super('Another destructive lifecycle operation is active for this user.');
    this.name = 'DataLifecycleConflictError';
  }
}

export class DataLifecycleInvalidStateError extends Error {
  readonly code = 'DATA_LIFECYCLE_INVALID_STATE' as const;
  constructor(message = 'Data lifecycle operation is not in a valid state for this action.') {
    super(message);
    this.name = 'DataLifecycleInvalidStateError';
  }
}

export class DataLifecyclePreviewExpiredError extends Error {
  readonly code = 'DATA_LIFECYCLE_PREVIEW_EXPIRED' as const;
  constructor() {
    super('Data lifecycle preview has expired.');
    this.name = 'DataLifecyclePreviewExpiredError';
  }
}

export class DataLifecyclePreviewInvalidError extends Error {
  readonly code = 'DATA_LIFECYCLE_PREVIEW_INVALID' as const;
  constructor() {
    super('Data lifecycle preview token or scope hash is invalid.');
    this.name = 'DataLifecyclePreviewInvalidError';
  }
}

export class DataLifecycleOwnershipChangedError extends Error {
  readonly code = 'DATA_LIFECYCLE_OWNERSHIP_CHANGED' as const;
  constructor() {
    super('The lifecycle target is no longer owned by the target user.');
    this.name = 'DataLifecycleOwnershipChangedError';
  }
}

export class DataLifecycleClaimLostError extends Error {
  readonly code = 'DATA_LIFECYCLE_CLAIM_LOST' as const;
  constructor() {
    super('Data lifecycle worker claim is no longer active.');
    this.name = 'DataLifecycleClaimLostError';
  }
}

export interface DataLifecycleRepository {
  createPreview(input: CreateDataLifecyclePreviewInput): Promise<StoredDataLifecycleOperation>;
  startExecution(input: StartDataLifecycleExecutionInput): Promise<StoredDataLifecycleOperation>;
  getForTargetUser(targetUserId: number, operationId: number): Promise<StoredDataLifecycleOperation | null>;
  claimNext(workKey: string): Promise<StoredDataLifecycleOperation | null>;
  heartbeat(operationId: number, workKey: string): Promise<boolean>;
  advanceClaimed(
    operationId: number,
    workKey: string,
    status: Extract<DataLifecycleOperationStatus, 'FENCING' | 'CANCEL_REQUESTED' | 'WAITING_FOR_DRAIN' | 'EXECUTING' | 'VERIFYING'>,
  ): Promise<StoredDataLifecycleOperation>;
  updateCheckpoint(operationId: number, workKey: string, checkpoint: unknown): Promise<void>;
  markFirstDestructiveCommit(operationId: number, workKey: string, checkpoint?: unknown): Promise<void>;
  requestStop(targetUserId: number, operationId: number): Promise<StoredDataLifecycleOperation>;
  completeCancellationBeforeMutation(operationId: number, workKey: string): Promise<void>;
  failClaimed(operationId: number, workKey: string, errorCode: string): Promise<void>;
  completeVerified(operationId: number, workKey: string, verification: unknown): Promise<void>;
  recoverStaleClaims(staleBefore: Date): Promise<number>;
  expirePreviews(now?: Date): Promise<number>;
  deleteTerminalOperationsBefore(cutoff: Date): Promise<number>;
  appendAudit(input: AppendLifecycleAuditInput): Promise<void>;
  deleteAuditBefore(cutoff: Date): Promise<number>;
}

export function createDataLifecycleRepository(
  database: PrismaClient = prisma,
): DataLifecycleRepository {
  return {
    async createPreview(input) {
      validateCreatePreview(input);
      const rows = await database.$queryRaw<OperationRow[]>(Prisma.sql`
        INSERT INTO "DataLifecycleOperation" (
          "action",
          "status",
          "actorUserId",
          "targetUserId",
          "actorKeyVersion",
          "actorKeyHash",
          "targetKeyVersion",
          "targetKeyHash",
          "scopeResourceType",
          "scopeJson",
          "previewCountsJson",
          "previewHash",
          "previewTokenHash",
          "previewExpiresAt",
          "confirmationPhrase",
          "warningCodes",
          "stopRequest",
          "createdAt",
          "updatedAt"
        ) VALUES (
          ${input.action},
          'PREVIEWED',
          ${input.actorUserId ?? null},
          ${input.targetUserId},
          ${input.actorKeyVersion},
          ${input.actorKeyHash},
          ${input.targetKeyVersion},
          ${input.targetKeyHash},
          ${input.scope.resourceType},
          ${JSON.stringify(input.scope)}::jsonb,
          ${JSON.stringify(input.previewCounts)}::jsonb,
          ${input.previewHash},
          ${input.previewTokenHash},
          ${input.previewExpiresAt},
          ${input.confirmationPhrase},
          ${input.warningCodes ?? []},
          'NONE',
          NOW(),
          NOW()
        )
        RETURNING ${operationColumns()}
      `);
      const row = rows[0];
      if (!row) throw new Error('Data lifecycle preview insert did not return a row.');
      return toStoredOperation(row);
    },

    async startExecution(input) {
      validateStartExecution(input);
      return database.$transaction(async (transaction) => {
        await lockDataLifecycleUserScope(transaction, input.targetUserId);

        const duplicateRows = await transaction.$queryRaw<OperationRow[]>(Prisma.sql`
          SELECT ${operationColumns('operation')}
          FROM "DataLifecycleOperation" AS operation
          WHERE operation."targetUserId" = ${input.targetUserId}
            AND operation."idempotencyKeyHash" = ${input.idempotencyKeyHash}
          LIMIT 1
        `);
        if (duplicateRows[0]) return toStoredOperation(duplicateRows[0]);

        const rows = await transaction.$queryRaw<OperationRow[]>(Prisma.sql`
          SELECT ${operationColumns('operation')}
          FROM "DataLifecycleOperation" AS operation
          WHERE operation."id" = ${input.operationId}
            AND operation."targetUserId" = ${input.targetUserId}
          FOR UPDATE
        `);
        const operation = rows[0];
        if (!operation || operation.status !== 'PREVIEWED') {
          throw new DataLifecycleInvalidStateError('Only a current preview can start execution.');
        }
        if (operation.previewExpiresAt <= new Date()) throw new DataLifecyclePreviewExpiredError();
        if (
          operation.previewTokenHash !== input.previewTokenHash
          || operation.previewHash !== input.previewHash
        ) {
          throw new DataLifecyclePreviewInvalidError();
        }

        const scope = dataLifecycleScopeSchema.parse(operation.scopeJson);
        if (scope.userId !== input.targetUserId) throw new DataLifecyclePreviewInvalidError();
        await assertScopeStillOwned(transaction, scope);

        const conflicts = await transaction.$queryRaw<IdRow[]>(Prisma.sql`
          SELECT "id"
          FROM "DataLifecycleResourceFence"
          WHERE "ownerUserId" = ${input.targetUserId}
            AND "releasedAt" IS NULL
          LIMIT 1
        `);
        if (conflicts.length > 0) throw new DataLifecycleConflictError();

        await createScopeFences(transaction, operation.id, scope);
        const updatedRows = await transaction.$queryRaw<OperationRow[]>(Prisma.sql`
          UPDATE "DataLifecycleOperation"
          SET "status" = 'FENCING',
              "idempotencyKeyHash" = ${input.idempotencyKeyHash},
              "receiptTokenHash" = ${input.receiptTokenHash ?? null},
              "receiptExpiresAt" = ${input.receiptExpiresAt ?? null},
              "startedAt" = COALESCE("startedAt", NOW()),
              "updatedAt" = NOW()
          WHERE "id" = ${operation.id}
          RETURNING ${operationColumns()}
        `);
        const updated = updatedRows[0];
        if (!updated) throw new Error('Data lifecycle execution start did not return a row.');
        return toStoredOperation(updated);
      });
    },

    async getForTargetUser(targetUserId, operationId) {
      const rows = await database.$queryRaw<OperationRow[]>(Prisma.sql`
        SELECT ${operationColumns('operation')}
        FROM "DataLifecycleOperation" AS operation
        WHERE operation."id" = ${operationId}
          AND operation."targetUserId" = ${targetUserId}
        LIMIT 1
      `);
      return rows[0] ? toStoredOperation(rows[0]) : null;
    },

    async claimNext(workKey) {
      validateWorkKey(workKey);
      return database.$transaction(async (transaction) => {
        const statuses = Prisma.join(CLAIMABLE_STATUSES.map((status) => Prisma.sql`${status}`));
        const rows = await transaction.$queryRaw<OperationRow[]>(Prisma.sql`
          WITH candidate AS (
            SELECT "id"
            FROM "DataLifecycleOperation"
            WHERE "status" IN (${statuses})
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
          RETURNING ${operationColumns('operation')}
        `);
        return rows[0] ? toStoredOperation(rows[0]) : null;
      });
    },

    async heartbeat(operationId, workKey) {
      validateWorkKey(workKey);
      const updated = await database.$executeRaw(Prisma.sql`
        UPDATE "DataLifecycleOperation"
        SET "heartbeatAt" = NOW(),
            "updatedAt" = NOW()
        WHERE "id" = ${operationId}
          AND "workKey" = ${workKey}
          AND "status" IN (${Prisma.join(CLAIMABLE_STATUSES.map((status) => Prisma.sql`${status}`))})
      `);
      return updated === 1;
    },

    async advanceClaimed(operationId, workKey, status) {
      validateWorkKey(workKey);
      const parsedStatus = dataLifecycleOperationStatusSchema.parse(status);
      if (!CLAIMABLE_STATUSES.includes(parsedStatus as typeof CLAIMABLE_STATUSES[number])) {
        throw new DataLifecycleInvalidStateError();
      }
      const rows = await database.$queryRaw<OperationRow[]>(Prisma.sql`
        UPDATE "DataLifecycleOperation"
        SET "status" = ${parsedStatus},
            "updatedAt" = NOW()
        WHERE "id" = ${operationId}
          AND "workKey" = ${workKey}
          AND "status" IN (${Prisma.join(CLAIMABLE_STATUSES.map((value) => Prisma.sql`${value}`))})
        RETURNING ${operationColumns()}
      `);
      const row = rows[0];
      if (!row) throw new DataLifecycleClaimLostError();
      return toStoredOperation(row);
    },

    async updateCheckpoint(operationId, workKey, checkpoint) {
      validateWorkKey(workKey);
      const updated = await database.$executeRaw(Prisma.sql`
        UPDATE "DataLifecycleOperation"
        SET "checkpointJson" = ${JSON.stringify(checkpoint)}::jsonb,
            "updatedAt" = NOW()
        WHERE "id" = ${operationId}
          AND "workKey" = ${workKey}
          AND "status" IN ('EXECUTING', 'VERIFYING')
      `);
      if (updated !== 1) throw new DataLifecycleClaimLostError();
    },

    async markFirstDestructiveCommit(operationId, workKey, checkpoint) {
      validateWorkKey(workKey);
      const checkpointSql = checkpoint === undefined
        ? Prisma.sql`"checkpointJson"`
        : Prisma.sql`${JSON.stringify(checkpoint)}::jsonb`;
      const updated = await database.$executeRaw(Prisma.sql`
        UPDATE "DataLifecycleOperation"
        SET "firstDestructiveCommitAt" = COALESCE("firstDestructiveCommitAt", NOW()),
            "checkpointJson" = ${checkpointSql},
            "updatedAt" = NOW()
        WHERE "id" = ${operationId}
          AND "workKey" = ${workKey}
          AND "status" = 'EXECUTING'
      `);
      if (updated !== 1) throw new DataLifecycleClaimLostError();
    },

    async requestStop(targetUserId, operationId) {
      return database.$transaction(async (transaction) => {
        await lockDataLifecycleUserScope(transaction, targetUserId);
        const rows = await transaction.$queryRaw<OperationRow[]>(Prisma.sql`
          SELECT ${operationColumns('operation')}
          FROM "DataLifecycleOperation" AS operation
          WHERE operation."id" = ${operationId}
            AND operation."targetUserId" = ${targetUserId}
          FOR UPDATE
        `);
        const operation = rows[0];
        if (!operation) throw new DataLifecycleInvalidStateError('Data lifecycle operation was not found.');
        const status = dataLifecycleOperationStatusSchema.parse(operation.status);
        if (TERMINAL_STATUSES.includes(status as typeof TERMINAL_STATUSES[number])) {
          return toStoredOperation(operation);
        }

        if (operation.status === 'PREVIEWED') {
          const cancelledRows = await transaction.$queryRaw<OperationRow[]>(Prisma.sql`
            UPDATE "DataLifecycleOperation"
            SET "status" = 'CANCELLED',
                "stopRequest" = 'CANCEL',
                "stopRequestedAt" = NOW(),
                "terminalResult" = 'CANCELLED_BEFORE_MUTATION',
                "completedAt" = NOW(),
                "updatedAt" = NOW()
            WHERE "id" = ${operation.id}
            RETURNING ${operationColumns()}
          `);
          return toStoredOperation(cancelledRows[0]!);
        }

        const stopRequest = operation.firstDestructiveCommitAt === null ? 'CANCEL' : 'STOP_AFTER_BATCH';
        const nextStatus = operation.firstDestructiveCommitAt === null ? 'CANCEL_REQUESTED' : operation.status;
        const updatedRows = await transaction.$queryRaw<OperationRow[]>(Prisma.sql`
          UPDATE "DataLifecycleOperation"
          SET "status" = ${nextStatus},
              "stopRequest" = ${stopRequest},
              "stopRequestedAt" = COALESCE("stopRequestedAt", NOW()),
              "updatedAt" = NOW()
          WHERE "id" = ${operation.id}
          RETURNING ${operationColumns()}
        `);
        return toStoredOperation(updatedRows[0]!);
      });
    },

    async completeCancellationBeforeMutation(operationId, workKey) {
      validateWorkKey(workKey);
      await database.$transaction(async (transaction) => {
        const rows = await transaction.$queryRaw<OperationRow[]>(Prisma.sql`
          SELECT ${operationColumns('operation')}
          FROM "DataLifecycleOperation" AS operation
          WHERE operation."id" = ${operationId}
            AND operation."workKey" = ${workKey}
          FOR UPDATE
        `);
        const operation = rows[0];
        if (!operation) throw new DataLifecycleClaimLostError();
        if (operation.firstDestructiveCommitAt !== null) {
          throw new DataLifecycleInvalidStateError('An operation cannot be cancelled after destructive execution starts.');
        }
        if (operation.status !== 'CANCEL_REQUESTED') throw new DataLifecycleInvalidStateError();

        await releaseOperationFences(transaction, operationId);
        await transaction.$executeRaw(Prisma.sql`
          UPDATE "DataLifecycleOperation"
          SET "status" = 'CANCELLED',
              "terminalResult" = 'CANCELLED_BEFORE_MUTATION',
              "workKey" = NULL,
              "claimedAt" = NULL,
              "heartbeatAt" = NULL,
              "completedAt" = NOW(),
              "updatedAt" = NOW()
          WHERE "id" = ${operationId}
        `);
      });
    },

    async failClaimed(operationId, workKey, errorCode) {
      validateWorkKey(workKey);
      validateCode(errorCode, 'errorCode');
      await database.$transaction(async (transaction) => {
        const rows = await transaction.$queryRaw<OperationRow[]>(Prisma.sql`
          SELECT ${operationColumns('operation')}
          FROM "DataLifecycleOperation" AS operation
          WHERE operation."id" = ${operationId}
            AND operation."workKey" = ${workKey}
          FOR UPDATE
        `);
        const operation = rows[0];
        if (!operation) throw new DataLifecycleClaimLostError();
        const afterMutation = operation.firstDestructiveCommitAt !== null;
        if (!afterMutation) await releaseOperationFences(transaction, operationId);
        await transaction.$executeRaw(Prisma.sql`
          UPDATE "DataLifecycleOperation"
          SET "status" = ${afterMutation ? 'NEEDS_ATTENTION' : 'FAILED'},
              "terminalResult" = ${afterMutation ? 'NEEDS_ATTENTION' : 'FAILED_BEFORE_MUTATION'},
              "errorCode" = ${errorCode},
              "workKey" = NULL,
              "claimedAt" = NULL,
              "heartbeatAt" = NULL,
              "completedAt" = ${afterMutation ? null : new Date()},
              "updatedAt" = NOW()
          WHERE "id" = ${operationId}
        `);
      });
    },

    async completeVerified(operationId, workKey, verification) {
      validateWorkKey(workKey);
      await database.$transaction(async (transaction) => {
        const rows = await transaction.$queryRaw<OperationRow[]>(Prisma.sql`
          SELECT ${operationColumns('operation')}
          FROM "DataLifecycleOperation" AS operation
          WHERE operation."id" = ${operationId}
            AND operation."workKey" = ${workKey}
            AND operation."status" = 'VERIFYING'
          FOR UPDATE
        `);
        if (!rows[0]) throw new DataLifecycleClaimLostError();
        await releaseOperationFences(transaction, operationId);
        await transaction.$executeRaw(Prisma.sql`
          UPDATE "DataLifecycleOperation"
          SET "status" = 'COMPLETED',
              "terminalResult" = 'COMPLETED',
              "verificationJson" = ${JSON.stringify(verification)}::jsonb,
              "workKey" = NULL,
              "claimedAt" = NULL,
              "heartbeatAt" = NULL,
              "completedAt" = NOW(),
              "updatedAt" = NOW()
          WHERE "id" = ${operationId}
        `);
      });
    },

    async recoverStaleClaims(staleBefore) {
      validateDate(staleBefore, 'staleBefore');
      return database.$executeRaw(Prisma.sql`
        UPDATE "DataLifecycleOperation"
        SET "workKey" = NULL,
            "claimedAt" = NULL,
            "heartbeatAt" = NULL,
            "updatedAt" = NOW()
        WHERE "workKey" IS NOT NULL
          AND COALESCE("heartbeatAt", "claimedAt") < ${staleBefore}
          AND "status" IN (${Prisma.join(CLAIMABLE_STATUSES.map((status) => Prisma.sql`${status}`))})
      `);
    },

    async expirePreviews(now = new Date()) {
      validateDate(now, 'now');
      return database.$executeRaw(Prisma.sql`
        UPDATE "DataLifecycleOperation"
        SET "status" = 'EXPIRED',
            "terminalResult" = 'EXPIRED',
            "completedAt" = ${now},
            "updatedAt" = ${now}
        WHERE "status" = 'PREVIEWED'
          AND "previewExpiresAt" <= ${now}
      `);
    },

    async deleteTerminalOperationsBefore(cutoff) {
      validateDate(cutoff, 'cutoff');
      return database.$executeRaw(Prisma.sql`
        DELETE FROM "DataLifecycleOperation" AS operation
        WHERE operation."status" IN ('COMPLETED', 'FAILED', 'CANCELLED', 'EXPIRED')
          AND operation."completedAt" < ${cutoff}
          AND (operation."receiptExpiresAt" IS NULL OR operation."receiptExpiresAt" < ${cutoff})
          AND NOT EXISTS (
            SELECT 1
            FROM "DeletedAuthIdentityTombstone" AS tombstone
            WHERE tombstone."operationId" = operation."id"
          )
      `);
    },

    async appendAudit(input) {
      validateAudit(input);
      await database.$executeRaw(Prisma.sql`
        INSERT INTO "DataLifecycleAuditEvent" (
          "operationId",
          "eventType",
          "action",
          "status",
          "actorKeyVersion",
          "actorKeyHash",
          "targetKeyVersion",
          "targetKeyHash",
          "resourceType",
          "aggregateCountsJson",
          "reasonCode",
          "errorCode",
          "confirmationMethod",
          "terminalResult",
          "createdAt"
        ) VALUES (
          ${input.operationId},
          ${input.eventType},
          ${input.action},
          ${input.status ?? null},
          ${input.actorKeyVersion},
          ${input.actorKeyHash},
          ${input.targetKeyVersion},
          ${input.targetKeyHash},
          ${input.resourceType ?? null},
          ${input.aggregateCounts ? JSON.stringify(input.aggregateCounts) : null}::jsonb,
          ${input.reasonCode ?? null},
          ${input.errorCode ?? null},
          ${input.confirmationMethod ?? null},
          ${input.terminalResult ?? null},
          NOW()
        )
      `);
    },

    async deleteAuditBefore(cutoff) {
      validateDate(cutoff, 'cutoff');
      return database.$executeRaw(Prisma.sql`
        DELETE FROM "DataLifecycleAuditEvent"
        WHERE "createdAt" < ${cutoff}
      `);
    },
  };
}

export const DataLifecycleRepository = createDataLifecycleRepository();

async function assertScopeStillOwned(
  transaction: Prisma.TransactionClient,
  scope: DataLifecycleScope,
): Promise<void> {
  if (scope.resourceType === 'USER') {
    const rows = await transaction.$queryRaw<IdRow[]>(Prisma.sql`
      SELECT "id" FROM "AppUser" WHERE "id" = ${scope.userId} FOR SHARE
    `);
    if (rows.length !== 1) throw new DataLifecycleOwnershipChangedError();
    return;
  }

  const accounts = await transaction.$queryRaw<IdRow[]>(Prisma.sql`
    SELECT "id"
    FROM "ExternalAccount"
    WHERE "id" = ${scope.accountId}
      AND "userId" = ${scope.userId}
    FOR SHARE
  `);
  if (accounts.length !== 1) throw new DataLifecycleOwnershipChangedError();
  if (scope.resourceType === 'ACCOUNT') return;

  const counts = await transaction.$queryRaw<CountRow[]>(Prisma.sql`
    SELECT COUNT(*)::int AS "count"
    FROM "ImportedGame"
    WHERE "userId" = ${scope.userId}
      AND "accountId" = ${scope.accountId}
      AND "id" IN (${Prisma.join(scope.gameIds.map((gameId) => Prisma.sql`${gameId}`))})
  `);
  if ((counts[0]?.count ?? 0) !== new Set(scope.gameIds).size) {
    throw new DataLifecycleOwnershipChangedError();
  }
}

async function createScopeFences(
  transaction: Prisma.TransactionClient,
  operationId: number,
  scope: DataLifecycleScope,
): Promise<void> {
  if (scope.resourceType === 'USER') {
    await insertFence(transaction, operationId, scope.userId, null, 'USER', scope.userId);
    return;
  }
  if (scope.resourceType === 'ACCOUNT') {
    await insertFence(transaction, operationId, scope.userId, scope.accountId, 'ACCOUNT', scope.accountId);
    return;
  }
  for (const gameId of Array.from(new Set(scope.gameIds)).sort((left, right) => left - right)) {
    await insertFence(transaction, operationId, scope.userId, scope.accountId, 'GAME', gameId);
  }
}

async function insertFence(
  transaction: Prisma.TransactionClient,
  operationId: number,
  ownerUserId: number,
  ownerAccountId: number | null,
  resourceType: 'USER' | 'ACCOUNT' | 'GAME',
  resourceId: number,
): Promise<void> {
  await transaction.$executeRaw(Prisma.sql`
    INSERT INTO "DataLifecycleResourceFence" (
      "operationId",
      "ownerUserId",
      "ownerAccountId",
      "resourceType",
      "resourceId",
      "createdAt"
    ) VALUES (
      ${operationId},
      ${ownerUserId},
      ${ownerAccountId},
      ${resourceType},
      ${resourceId},
      NOW()
    )
  `);
}

async function releaseOperationFences(
  transaction: Prisma.TransactionClient,
  operationId: number,
): Promise<void> {
  await transaction.$executeRaw(Prisma.sql`
    UPDATE "DataLifecycleResourceFence"
    SET "releasedAt" = COALESCE("releasedAt", NOW())
    WHERE "operationId" = ${operationId}
      AND "releasedAt" IS NULL
  `);
}

function operationColumns(alias?: string): Prisma.Sql {
  const prefix = alias ? Prisma.raw(`"${alias}".`) : Prisma.empty;
  return Prisma.join([
    Prisma.sql`${prefix}"id"`,
    Prisma.sql`${prefix}"action"`,
    Prisma.sql`${prefix}"status"`,
    Prisma.sql`${prefix}"actorUserId"`,
    Prisma.sql`${prefix}"targetUserId"`,
    Prisma.sql`${prefix}"scopeResourceType"`,
    Prisma.sql`${prefix}"scopeJson"`,
    Prisma.sql`${prefix}"previewCountsJson"`,
    Prisma.sql`${prefix}"previewHash"`,
    Prisma.sql`${prefix}"previewTokenHash"`,
    Prisma.sql`${prefix}"previewExpiresAt"`,
    Prisma.sql`${prefix}"confirmationPhrase"`,
    Prisma.sql`${prefix}"warningCodes"`,
    Prisma.sql`${prefix}"idempotencyKeyHash"`,
    Prisma.sql`${prefix}"stopRequest"`,
    Prisma.sql`${prefix}"stopRequestedAt"`,
    Prisma.sql`${prefix}"checkpointJson"`,
    Prisma.sql`${prefix}"workKey"`,
    Prisma.sql`${prefix}"claimedAt"`,
    Prisma.sql`${prefix}"heartbeatAt"`,
    Prisma.sql`${prefix}"firstDestructiveCommitAt"`,
    Prisma.sql`${prefix}"verificationJson"`,
    Prisma.sql`${prefix}"terminalResult"`,
    Prisma.sql`${prefix}"errorCode"`,
    Prisma.sql`${prefix}"receiptTokenHash"`,
    Prisma.sql`${prefix}"receiptExpiresAt"`,
    Prisma.sql`${prefix}"startedAt"`,
    Prisma.sql`${prefix}"completedAt"`,
    Prisma.sql`${prefix}"createdAt"`,
    Prisma.sql`${prefix}"updatedAt"`,
  ]);
}

function toStoredOperation(row: OperationRow): StoredDataLifecycleOperation {
  return {
    id: row.id,
    action: dataLifecycleActionSchema.parse(row.action),
    status: dataLifecycleOperationStatusSchema.parse(row.status),
    actorUserId: row.actorUserId,
    targetUserId: row.targetUserId,
    scope: dataLifecycleScopeSchema.parse(row.scopeJson),
    previewCounts: dataLifecyclePreviewCountsSchema.parse(row.previewCountsJson),
    previewHash: row.previewHash,
    previewTokenHash: row.previewTokenHash,
    previewExpiresAt: row.previewExpiresAt,
    confirmationPhrase: row.confirmationPhrase,
    warningCodes: row.warningCodes,
    idempotencyKeyHash: row.idempotencyKeyHash,
    stopRequest: row.stopRequest,
    stopRequestedAt: row.stopRequestedAt,
    checkpoint: row.checkpointJson,
    workKey: row.workKey,
    claimedAt: row.claimedAt,
    heartbeatAt: row.heartbeatAt,
    firstDestructiveCommitAt: row.firstDestructiveCommitAt,
    verification: row.verificationJson,
    terminalResult: row.terminalResult === null
      ? null
      : dataLifecycleTerminalResultSchema.parse(row.terminalResult),
    errorCode: row.errorCode,
    receiptTokenHash: row.receiptTokenHash,
    receiptExpiresAt: row.receiptExpiresAt,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function validateCreatePreview(input: CreateDataLifecyclePreviewInput): void {
  dataLifecycleActionSchema.parse(input.action);
  dataLifecycleScopeSchema.parse(input.scope);
  dataLifecyclePreviewCountsSchema.parse(input.previewCounts);
  validatePositiveInteger(input.targetUserId, 'targetUserId');
  if (input.actorUserId != null) validatePositiveInteger(input.actorUserId, 'actorUserId');
  if (input.scope.userId !== input.targetUserId) {
    throw new Error('Lifecycle scope user must match targetUserId.');
  }
  validatePositiveInteger(input.actorKeyVersion, 'actorKeyVersion');
  validatePositiveInteger(input.targetKeyVersion, 'targetKeyVersion');
  validateSha256(input.actorKeyHash, 'actorKeyHash');
  validateSha256(input.targetKeyHash, 'targetKeyHash');
  validateSha256(input.previewHash, 'previewHash');
  validateSha256(input.previewTokenHash, 'previewTokenHash');
  validateDate(input.previewExpiresAt, 'previewExpiresAt');
  if (input.previewExpiresAt <= new Date()) throw new Error('Lifecycle preview must expire in the future.');
  if (!input.confirmationPhrase.trim() || input.confirmationPhrase.length > 120) {
    throw new Error('Lifecycle confirmation phrase must contain 1-120 characters.');
  }
  for (const code of input.warningCodes ?? []) validateCode(code, 'warningCode');
}

function validateStartExecution(input: StartDataLifecycleExecutionInput): void {
  validatePositiveInteger(input.operationId, 'operationId');
  validatePositiveInteger(input.targetUserId, 'targetUserId');
  validateSha256(input.previewTokenHash, 'previewTokenHash');
  validateSha256(input.previewHash, 'previewHash');
  validateSha256(input.idempotencyKeyHash, 'idempotencyKeyHash');
  if (input.receiptTokenHash != null) validateSha256(input.receiptTokenHash, 'receiptTokenHash');
  if (input.receiptExpiresAt != null) validateDate(input.receiptExpiresAt, 'receiptExpiresAt');
}

function validateAudit(input: AppendLifecycleAuditInput): void {
  validatePositiveInteger(input.operationId, 'operationId');
  dataLifecycleActionSchema.parse(input.action);
  if (input.status != null) dataLifecycleOperationStatusSchema.parse(input.status);
  if (input.terminalResult != null) dataLifecycleTerminalResultSchema.parse(input.terminalResult);
  if (!/^[A-Z0-9_]{1,80}$/.test(input.eventType)) {
    throw new Error('Lifecycle audit eventType must be a bounded machine-readable code.');
  }
  validatePositiveInteger(input.actorKeyVersion, 'actorKeyVersion');
  validatePositiveInteger(input.targetKeyVersion, 'targetKeyVersion');
  validateSha256(input.actorKeyHash, 'actorKeyHash');
  validateSha256(input.targetKeyHash, 'targetKeyHash');
  if (input.aggregateCounts != null) dataLifecyclePreviewCountsSchema.parse(input.aggregateCounts);
  if (input.reasonCode != null) validateCode(input.reasonCode, 'reasonCode');
  if (input.errorCode != null) validateCode(input.errorCode, 'errorCode');
  if (input.confirmationMethod != null) validateCode(input.confirmationMethod, 'confirmationMethod');
}

function validatePositiveInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${label} must be a positive integer.`);
}

function validateSha256(value: string, label: string): void {
  if (!/^[a-f0-9]{64}$/.test(value)) throw new Error(`${label} must be a lowercase SHA-256 hash.`);
}

function validateWorkKey(value: string): void {
  if (!value.trim() || value.length > 80) throw new Error('Lifecycle workKey must contain 1-80 characters.');
}

function validateCode(value: string, label: string): void {
  if (!/^[A-Z0-9_:-]{1,120}$/.test(value)) {
    throw new Error(`${label} must be a bounded machine-readable code.`);
  }
}

function validateDate(value: Date, label: string): void {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new Error(`${label} must be a valid Date.`);
  }
}
