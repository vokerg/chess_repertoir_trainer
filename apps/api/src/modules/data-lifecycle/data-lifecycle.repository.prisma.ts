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
import { lockDataLifecycleUserScope } from './data-lifecycle.guard';

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

type ClaimableStatus = typeof CLAIMABLE_STATUSES[number];

const ALLOWED_CURRENT_STATUSES_BY_TARGET: Record<ClaimableStatus, readonly ClaimableStatus[]> = {
  FENCING: ['FENCING'],
  CANCEL_REQUESTED: ['CANCEL_REQUESTED'],
  WAITING_FOR_DRAIN: ['FENCING', 'WAITING_FOR_DRAIN'],
  EXECUTING: ['WAITING_FOR_DRAIN', 'EXECUTING'],
  VERIFYING: ['EXECUTING', 'VERIFYING'],
};

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

export interface DataLifecycleDestructiveTransactionInput {
  operationId: number;
  targetUserId: number;
  workKey: string;
  checkpoint?: unknown;
  beforeUserLock?: (transaction: Prisma.TransactionClient) => Promise<void>;
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
  runDestructiveTransaction<T>(
    input: DataLifecycleDestructiveTransactionInput,
    work: (transaction: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T>;
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
      return database.$transaction(async (transaction) => {
        await lockDataLifecycleUserScope(transaction, input.targetUserId);
        await assertScopeStillOwned(transaction, input.scope);

        const row = await transaction.dataLifecycleOperation.create({
          data: {
            action: input.action,
            status: 'PREVIEWED',
            actorUserId: input.actorUserId ?? null,
            targetUserId: input.targetUserId,
            actorKeyVersion: input.actorKeyVersion,
            actorKeyHash: input.actorKeyHash,
            targetKeyVersion: input.targetKeyVersion,
            targetKeyHash: input.targetKeyHash,
            scopeResourceType: input.scope.resourceType,
            scopeJson: input.scope as Prisma.InputJsonValue,
            previewCountsJson: input.previewCounts as Prisma.InputJsonValue,
            previewHash: input.previewHash,
            previewTokenHash: input.previewTokenHash,
            previewExpiresAt: input.previewExpiresAt,
            confirmationPhrase: input.confirmationPhrase,
            warningCodes: input.warningCodes ?? [],
            stopRequest: 'NONE',
          },
        });
        return toStoredOperation(row);
      });
    },

    async startExecution(input) {
      validateStartExecution(input);
      return database.$transaction(async (transaction) => {
        await lockDataLifecycleUserScope(transaction, input.targetUserId);

        const duplicate = await transaction.dataLifecycleOperation.findFirst({
          where: {
            targetUserId: input.targetUserId,
            idempotencyKeyHash: input.idempotencyKeyHash,
          },
        });
        if (duplicate) {
          if (duplicate.id !== input.operationId) {
            throw new DataLifecycleInvalidStateError(
              'Lifecycle idempotency key is already bound to another operation.',
            );
          }
          if (
            duplicate.previewTokenHash !== input.previewTokenHash
            || duplicate.previewHash !== input.previewHash
          ) {
            throw new DataLifecyclePreviewInvalidError();
          }
          return toStoredOperation(duplicate);
        }

        const operation = await transaction.dataLifecycleOperation.findFirst({
          where: {
            id: input.operationId,
            targetUserId: input.targetUserId,
          },
        });
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

        const conflict = await transaction.dataLifecycleResourceFence.findFirst({
          where: {
            ownerUserId: input.targetUserId,
            releasedAt: null,
          },
          select: { id: true },
        });
        if (conflict) throw new DataLifecycleConflictError();

        await createScopeFences(transaction, operation.id, scope);
        const updatedCount = await transaction.$executeRaw(Prisma.sql`
          UPDATE "DataLifecycleOperation"
          SET "status" = 'FENCING',
              "idempotencyKeyHash" = ${input.idempotencyKeyHash},
              "receiptTokenHash" = ${input.receiptTokenHash ?? null},
              "receiptExpiresAt" = ${input.receiptExpiresAt ?? null},
              "startedAt" = COALESCE("startedAt", NOW()),
              "updatedAt" = NOW()
          WHERE "id" = ${operation.id}
            AND "targetUserId" = ${input.targetUserId}
            AND "status" = 'PREVIEWED'
            AND "idempotencyKeyHash" IS NULL
            AND "previewTokenHash" = ${input.previewTokenHash}
            AND "previewHash" = ${input.previewHash}
            AND "previewExpiresAt" > NOW()
        `);
        if (updatedCount !== 1) {
          const current = await transaction.dataLifecycleOperation.findUnique({
            where: { id: operation.id },
            select: { status: true, previewExpiresAt: true },
          });
          if (current?.status === 'PREVIEWED' && current.previewExpiresAt <= new Date()) {
            throw new DataLifecyclePreviewExpiredError();
          }
          throw new DataLifecycleInvalidStateError('Lifecycle preview changed before execution could start.');
        }
        return toStoredOperation(await readOperationById(transaction, operation.id));
      });
    },

    async getForTargetUser(targetUserId, operationId) {
      validatePositiveInteger(targetUserId, 'targetUserId');
      validatePositiveInteger(operationId, 'operationId');
      const row = await database.dataLifecycleOperation.findFirst({
        where: { id: operationId, targetUserId },
      });
      return row ? toStoredOperation(row) : null;
    },

    async claimNext(workKey) {
      validateWorkKey(workKey);
      const statuses = Prisma.join(CLAIMABLE_STATUSES.map((status) => Prisma.sql`${status}`));
      const rows = await database.$queryRaw<OperationRow[]>(Prisma.sql`
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
          AND operation."workKey" IS NULL
        RETURNING operation.*
      `);
      return rows[0] ? toStoredOperation(rows[0]) : null;
    },

    async heartbeat(operationId, workKey) {
      validatePositiveInteger(operationId, 'operationId');
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
      validatePositiveInteger(operationId, 'operationId');
      validateWorkKey(workKey);
      const parsedStatus = dataLifecycleOperationStatusSchema.parse(status);
      if (!CLAIMABLE_STATUSES.includes(parsedStatus as ClaimableStatus)) {
        throw new DataLifecycleInvalidStateError();
      }
      const targetStatus = parsedStatus as ClaimableStatus;
      const allowedCurrentStatuses = ALLOWED_CURRENT_STATUSES_BY_TARGET[targetStatus];

      return database.$transaction(async (transaction) => {
        const updated = await transaction.$executeRaw(Prisma.sql`
          UPDATE "DataLifecycleOperation"
          SET "status" = ${targetStatus},
              "updatedAt" = NOW()
          WHERE "id" = ${operationId}
            AND "workKey" = ${workKey}
            AND "status" IN (${Prisma.join(allowedCurrentStatuses.map((current) => Prisma.sql`${current}`))})
        `);
        if (updated !== 1) {
          const current = await transaction.dataLifecycleOperation.findUnique({
            where: { id: operationId },
            select: { status: true, workKey: true },
          });
          if (!current || current.workKey !== workKey) throw new DataLifecycleClaimLostError();
          throw new DataLifecycleInvalidStateError('Lifecycle execution state transitions are forward-only.');
        }
        return toStoredOperation(await readOperationById(transaction, operationId));
      });
    },

    async updateCheckpoint(operationId, workKey, checkpoint) {
      validatePositiveInteger(operationId, 'operationId');
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

    async runDestructiveTransaction(input, work) {
      validatePositiveInteger(input.operationId, 'operationId');
      validatePositiveInteger(input.targetUserId, 'targetUserId');
      validateWorkKey(input.workKey);
      if (input.beforeUserLock != null && typeof input.beforeUserLock !== 'function') {
        throw new Error('Lifecycle beforeUserLock callback must be a function.');
      }
      if (typeof work !== 'function') throw new Error('Lifecycle destructive work callback is required.');

      return database.$transaction(async (transaction) => {
        if (input.beforeUserLock) await input.beforeUserLock(transaction);
        await lockDataLifecycleUserScope(transaction, input.targetUserId);
        const checkpointSql = input.checkpoint === undefined
          ? Prisma.sql`"checkpointJson"`
          : Prisma.sql`${JSON.stringify(input.checkpoint)}::jsonb`;
        const updated = await transaction.$executeRaw(Prisma.sql`
          UPDATE "DataLifecycleOperation"
          SET "firstDestructiveCommitAt" = COALESCE("firstDestructiveCommitAt", NOW()),
              "checkpointJson" = ${checkpointSql},
              "updatedAt" = NOW()
          WHERE "id" = ${input.operationId}
            AND "targetUserId" = ${input.targetUserId}
            AND "workKey" = ${input.workKey}
            AND "status" = 'EXECUTING'
        `);
        if (updated !== 1) throw new DataLifecycleClaimLostError();

        await bindDataLifecycleOperation(transaction, input.operationId);
        return work(transaction);
      });
    },

    async requestStop(targetUserId, operationId) {
      validatePositiveInteger(targetUserId, 'targetUserId');
      validatePositiveInteger(operationId, 'operationId');
      return database.$transaction(async (transaction) => {
        await lockDataLifecycleUserScope(transaction, targetUserId);

        for (let attempt = 0; attempt < 3; attempt += 1) {
          const operation = await transaction.dataLifecycleOperation.findFirst({
            where: { id: operationId, targetUserId },
          });
          if (!operation) {
            throw new DataLifecycleInvalidStateError('Data lifecycle operation was not found.');
          }
          const status = dataLifecycleOperationStatusSchema.parse(operation.status);
          if (TERMINAL_STATUSES.includes(status as typeof TERMINAL_STATUSES[number])) {
            return toStoredOperation(operation);
          }

          if (operation.status === 'PREVIEWED') {
            const cancelled = await transaction.$executeRaw(Prisma.sql`
              UPDATE "DataLifecycleOperation"
              SET "status" = 'CANCELLED',
                  "stopRequest" = 'CANCEL',
                  "stopRequestedAt" = NOW(),
                  "terminalResult" = 'CANCELLED_BEFORE_MUTATION',
                  "completedAt" = NOW(),
                  "updatedAt" = NOW()
              WHERE "id" = ${operation.id}
                AND "targetUserId" = ${targetUserId}
                AND "status" = 'PREVIEWED'
                AND "firstDestructiveCommitAt" IS NULL
            `);
            if (cancelled === 1) {
              return toStoredOperation(await readOperationById(transaction, operation.id));
            }
            continue;
          }

          const afterMutation = operation.firstDestructiveCommitAt !== null;
          const stopRequest = afterMutation ? 'STOP_AFTER_BATCH' : 'CANCEL';
          const nextStatus = afterMutation ? operation.status : 'CANCEL_REQUESTED';
          const mutationPredicate = afterMutation
            ? Prisma.sql`"firstDestructiveCommitAt" IS NOT NULL`
            : Prisma.sql`"firstDestructiveCommitAt" IS NULL`;
          const updated = await transaction.$executeRaw(Prisma.sql`
            UPDATE "DataLifecycleOperation"
            SET "status" = ${nextStatus},
                "stopRequest" = ${stopRequest},
                "stopRequestedAt" = COALESCE("stopRequestedAt", NOW()),
                "updatedAt" = NOW()
            WHERE "id" = ${operation.id}
              AND "targetUserId" = ${targetUserId}
              AND "status" = ${operation.status}
              AND ${mutationPredicate}
          `);
          if (updated === 1) {
            return toStoredOperation(await readOperationById(transaction, operation.id));
          }
        }

        throw new DataLifecycleInvalidStateError(
          'Lifecycle operation changed concurrently while requesting a stop.',
        );
      });
    },

    async completeCancellationBeforeMutation(operationId, workKey) {
      validatePositiveInteger(operationId, 'operationId');
      validateWorkKey(workKey);
      await database.$transaction(async (transaction) => {
        const updated = await transaction.$executeRaw(Prisma.sql`
          UPDATE "DataLifecycleOperation"
          SET "status" = 'CANCELLED',
              "terminalResult" = 'CANCELLED_BEFORE_MUTATION',
              "workKey" = NULL,
              "claimedAt" = NULL,
              "heartbeatAt" = NULL,
              "completedAt" = NOW(),
              "updatedAt" = NOW()
          WHERE "id" = ${operationId}
            AND "workKey" = ${workKey}
            AND "status" = 'CANCEL_REQUESTED'
            AND "firstDestructiveCommitAt" IS NULL
        `);
        if (updated !== 1) {
          const current = await transaction.dataLifecycleOperation.findUnique({
            where: { id: operationId },
            select: { workKey: true, firstDestructiveCommitAt: true, status: true },
          });
          if (!current || current.workKey !== workKey) throw new DataLifecycleClaimLostError();
          if (current.firstDestructiveCommitAt !== null) {
            throw new DataLifecycleInvalidStateError(
              'An operation cannot be cancelled after destructive execution starts.',
            );
          }
          throw new DataLifecycleInvalidStateError();
        }
        await releaseOperationFences(transaction, operationId);
      });
    },

    async failClaimed(operationId, workKey, errorCode) {
      validatePositiveInteger(operationId, 'operationId');
      validateWorkKey(workKey);
      validateCode(errorCode, 'errorCode');
      await database.$transaction(async (transaction) => {
        const updated = await transaction.$executeRaw(Prisma.sql`
          UPDATE "DataLifecycleOperation"
          SET "status" = CASE
                WHEN "firstDestructiveCommitAt" IS NULL THEN 'FAILED'
                ELSE 'NEEDS_ATTENTION'
              END,
              "terminalResult" = CASE
                WHEN "firstDestructiveCommitAt" IS NULL THEN 'FAILED_BEFORE_MUTATION'
                ELSE 'NEEDS_ATTENTION'
              END,
              "errorCode" = ${errorCode},
              "workKey" = NULL,
              "claimedAt" = NULL,
              "heartbeatAt" = NULL,
              "completedAt" = CASE
                WHEN "firstDestructiveCommitAt" IS NULL THEN NOW()
                ELSE NULL
              END,
              "updatedAt" = NOW()
          WHERE "id" = ${operationId}
            AND "workKey" = ${workKey}
            AND "status" IN (${Prisma.join(CLAIMABLE_STATUSES.map((status) => Prisma.sql`${status}`))})
        `);
        if (updated !== 1) throw new DataLifecycleClaimLostError();

        const operation = await readOperationById(transaction, operationId);
        if (operation.firstDestructiveCommitAt === null) {
          await releaseOperationFences(transaction, operationId);
        }
      });
    },

    async completeVerified(operationId, workKey, verification) {
      validatePositiveInteger(operationId, 'operationId');
      validateWorkKey(workKey);
      await database.$transaction(async (transaction) => {
        const updated = await transaction.$executeRaw(Prisma.sql`
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
            AND "workKey" = ${workKey}
            AND "status" = 'VERIFYING'
        `);
        if (updated !== 1) throw new DataLifecycleClaimLostError();
        await releaseOperationFences(transaction, operationId);
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
            FROM "DataLifecycleResourceFence" AS fence
            WHERE fence."operationId" = operation."id"
              AND fence."releasedAt" IS NULL
          )
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
    const user = await transaction.appUser.findUnique({
      where: { id: scope.userId },
      select: { id: true },
    });
    if (!user) throw new DataLifecycleOwnershipChangedError();
    return;
  }

  const account = await transaction.externalAccount.findFirst({
    where: { id: scope.accountId, userId: scope.userId },
    select: { id: true },
  });
  if (!account) throw new DataLifecycleOwnershipChangedError();
  if (scope.resourceType === 'ACCOUNT') return;

  const uniqueGameIds = Array.from(new Set(scope.gameIds));
  const count = await transaction.importedGame.count({
    where: {
      userId: scope.userId,
      accountId: scope.accountId,
      id: { in: uniqueGameIds },
    },
  });
  if (count !== uniqueGameIds.length) throw new DataLifecycleOwnershipChangedError();
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

async function bindDataLifecycleOperation(
  transaction: Prisma.TransactionClient,
  operationId: number,
): Promise<void> {
  validatePositiveInteger(operationId, 'operationId');
  await transaction.$executeRaw(Prisma.sql`
    SELECT set_config('app.data_lifecycle_operation_id', ${String(operationId)}, TRUE)
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

async function readOperationById(
  transaction: Prisma.TransactionClient,
  operationId: number,
): Promise<OperationRow> {
  const row = await transaction.dataLifecycleOperation.findUnique({ where: { id: operationId } });
  if (!row) throw new Error('Data lifecycle operation disappeared during a transaction.');
  return row;
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
