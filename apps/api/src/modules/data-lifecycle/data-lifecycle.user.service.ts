import { createHash, randomBytes } from 'node:crypto';
import {
  dataLifecycleExecuteRequestSchema,
  dataLifecycleOperationResponseSchema,
  dataLifecyclePreviewResponseSchema,
  dataLifecycleReceiptStatusResponseSchema,
  wholeUserDataLifecycleExecuteResponseSchema,
  wholeUserDataLifecyclePreviewRequestSchema,
  type DataLifecycleExecuteRequest,
  type DataLifecycleOperationResponse,
  type DataLifecyclePreviewResponse,
  type DataLifecycleReceiptStatusResponse,
  type WholeUserDataLifecycleExecuteResponse,
  type WholeUserDataLifecyclePreviewRequest,
} from '@chess-trainer/contracts/data-lifecycle';
import {
  DataLifecycleInvalidStateError,
  DataLifecyclePreviewInvalidError,
  DataLifecycleRepository,
  type DataLifecycleRepository as LifecycleRepositoryBoundary,
  type StoredDataLifecycleOperation,
} from './data-lifecycle.repository.prisma';
import {
  UserDataLifecycleRepository,
  createUserDataLifecycleRepository,
  type UserDataLifecycleRepository as UserRepositoryBoundary,
} from './data-lifecycle.user.repository.prisma';
import {
  UserDataLifecycleOperationRepository,
  type UserDataLifecycleOperationRepository as OperationRepositoryBoundary,
} from './data-lifecycle.user-operation.repository.prisma';
import {
  DeletedIdentityLifecycleGuard,
  type DeletedIdentityGuard,
} from './deleted-identity.guard';
import {
  hashOpaqueLifecycleToken,
  LifecycleHmacKeyring,
  loadLifecycleAuditKeyring,
} from './data-lifecycle.hmac';

export const USER_DELETION_PREVIEW_TTL_MS = 10 * 60_000;

export class UserDataLifecycleOperationNotFoundError extends Error {
  readonly code = 'DATA_LIFECYCLE_OWNERSHIP_CHANGED' as const;

  constructor() {
    super('Whole-user deletion operation was not found.');
    this.name = 'UserDataLifecycleOperationNotFoundError';
  }
}

export interface UserDataLifecycleService {
  preview(
    userId: number,
    request: WholeUserDataLifecyclePreviewRequest,
  ): Promise<DataLifecyclePreviewResponse>;
  execute(
    userId: number,
    operationId: number,
    request: DataLifecycleExecuteRequest,
  ): Promise<WholeUserDataLifecycleExecuteResponse>;
  get(userId: number, operationId: number): Promise<DataLifecycleOperationResponse>;
  requestStop(userId: number, operationId: number): Promise<DataLifecycleOperationResponse>;
  getByReceipt(receiptToken: string): Promise<DataLifecycleReceiptStatusResponse | null>;
  requestStopByReceipt(
    operationId: number,
    receiptToken: string,
  ): Promise<DataLifecycleOperationResponse>;
  resumeByReceipt(
    operationId: number,
    receiptToken: string,
    request: DataLifecycleExecuteRequest,
  ): Promise<WholeUserDataLifecycleExecuteResponse>;
}

export interface CreateUserDataLifecycleServiceInput {
  lifecycleRepository?: LifecycleRepositoryBoundary;
  userRepository?: UserRepositoryBoundary;
  operationRepository?: OperationRepositoryBoundary;
  deletedIdentityGuard?: DeletedIdentityGuard;
  auditKeyring?: LifecycleHmacKeyring;
  now?: () => Date;
  randomToken?: () => string;
}

export function createUserDataLifecycleService(
  input: CreateUserDataLifecycleServiceInput = {},
): UserDataLifecycleService {
  const lifecycleRepository = input.lifecycleRepository ?? DataLifecycleRepository;
  const userRepository = input.userRepository ?? UserDataLifecycleRepository;
  const operationRepository = input.operationRepository ?? UserDataLifecycleOperationRepository;
  const deletedIdentityGuard = input.deletedIdentityGuard ?? DeletedIdentityLifecycleGuard;
  const auditKeyring = input.auditKeyring ?? loadLifecycleAuditKeyring();
  const now = input.now ?? (() => new Date());
  const randomToken = input.randomToken ?? (() => randomBytes(32).toString('base64url'));

  async function executeForUser(
    userId: number,
    operationId: number,
    request: DataLifecycleExecuteRequest,
  ): Promise<WholeUserDataLifecycleExecuteResponse> {
    validatePositiveInteger(userId, 'userId');
    validatePositiveInteger(operationId, 'operationId');
    const parsed = dataLifecycleExecuteRequestSchema.parse(request);
    const operation = await requireUserDeletion(lifecycleRepository, userId, operationId);
    assertExecutionCredentials(operation, parsed);
    const idempotencyKeyHash = hashOpaqueLifecycleToken(parsed.idempotencyKey);
    const receiptToken = deriveReceiptToken(
      auditKeyring,
      operation.actorKeyVersion,
      operation.id,
      parsed.idempotencyKey,
    );
    const receiptTokenHash = hashOpaqueLifecycleToken(receiptToken);
    let started: StoredDataLifecycleOperation;

    if (operation.receiptTokenHash && operation.receiptTokenHash !== receiptTokenHash) {
      throw new DataLifecycleInvalidStateError(
        'Lifecycle receipt is already bound to another execution request.',
      );
    }

    if (operation.status === 'PREVIEWED') {
      started = await lifecycleRepository.startExecution({
        operationId,
        targetUserId: userId,
        previewTokenHash: hashOpaqueLifecycleToken(parsed.previewToken),
        previewHash: operation.previewHash,
        idempotencyKeyHash,
        receiptTokenHash,
        receiptExpiresAt: null,
        validateBeforeFence: async (transaction, lockedOperation) => {
          const lockedUserRepository = createUserDataLifecycleRepository(transaction);
          if (lockedOperation.scope.resourceType !== 'USER') {
            throw new DataLifecyclePreviewInvalidError();
          }
          const counts = await lockedUserRepository.countAffectedRows(userId);
          const currentHash = hashPreview(lockedOperation.scope, counts);
          if (currentHash !== lockedOperation.previewHash) {
            throw new DataLifecyclePreviewInvalidError();
          }
        },
      });
      await appendAudit(lifecycleRepository, started, 'EXECUTION_REQUESTED');
    } else if (operation.status === 'NEEDS_ATTENTION') {
      if (operation.firstDestructiveCommitAt === null) {
        throw new DataLifecycleInvalidStateError(
          'A user deletion that failed before mutation requires a new preview.',
        );
      }
      if (operation.idempotencyKeyHash !== idempotencyKeyHash) {
        throw new DataLifecycleInvalidStateError(
          'The original lifecycle idempotency key is required to resume partial deletion.',
        );
      }
      started = await operationRepository.resumeNeedsAttention(
        userId,
        operationId,
        idempotencyKeyHash,
      );
      await appendAudit(lifecycleRepository, started, 'EXECUTION_RESUMED');
    } else {
      if (operation.idempotencyKeyHash !== idempotencyKeyHash) {
        throw new DataLifecycleInvalidStateError(
          'Lifecycle idempotency key is already bound to another execution request.',
        );
      }
      started = operation;
    }

    return wholeUserDataLifecycleExecuteResponseSchema.parse({
      ...toResponse(started),
      receiptToken,
    });
  }

  async function requireReceipt(operationId: number, receiptToken: string) {
    validatePositiveInteger(operationId, 'operationId');
    const status = await deletedIdentityGuard.findOperationByReceipt(receiptToken);
    if (!status || status.operationId !== operationId || status.action !== 'DELETE_APP_USER') {
      throw new UserDataLifecycleOperationNotFoundError();
    }
    return status;
  }

  return {
    async preview(userId, request) {
      validatePositiveInteger(userId, 'userId');
      wholeUserDataLifecyclePreviewRequestSchema.parse(request);
      const counts = await userRepository.countAffectedRows(userId);
      const scope = { resourceType: 'USER' as const, userId };
      const previewToken = randomToken();
      if (previewToken.length < 16) {
        throw new Error('Lifecycle preview token generator returned an unsafe token.');
      }
      const previewHash = hashPreview(scope, counts);
      const auditIdentity = auditKeyring.current(`APP_USER:${userId}`, 'audit-principal');
      const operation = await lifecycleRepository.createPreview({
        action: 'DELETE_APP_USER',
        actorUserId: userId,
        targetUserId: userId,
        actorKeyVersion: auditIdentity.keyVersion,
        actorKeyHash: auditIdentity.digest,
        targetKeyVersion: auditIdentity.keyVersion,
        targetKeyHash: auditIdentity.digest,
        scope,
        previewCounts: counts,
        previewHash,
        previewTokenHash: hashOpaqueLifecycleToken(previewToken),
        previewExpiresAt: new Date(now().getTime() + USER_DELETION_PREVIEW_TTL_MS),
        confirmationPhrase: 'DELETE MY ACCOUNT',
        warningCodes: [
          'DESTRUCTIVE_OPERATION',
          'APPLICATION_ACCOUNT_DELETION',
          'OFFLINE_DATA_PURGE_REQUIRED',
        ],
      });
      await appendAudit(lifecycleRepository, operation, 'PREVIEW_CREATED');
      return dataLifecyclePreviewResponseSchema.parse({
        ...toResponse(operation),
        previewToken,
      });
    },

    execute: executeForUser,

    async get(userId, operationId) {
      validatePositiveInteger(userId, 'userId');
      validatePositiveInteger(operationId, 'operationId');
      return toResponse(await requireUserDeletion(lifecycleRepository, userId, operationId));
    },

    async requestStop(userId, operationId) {
      await requireUserDeletion(lifecycleRepository, userId, operationId);
      const operation = await lifecycleRepository.requestStop(userId, operationId);
      await appendAudit(lifecycleRepository, operation, 'STOP_REQUESTED');
      return toResponse(operation);
    },

    async getByReceipt(receiptToken) {
      const status = await deletedIdentityGuard.findOperationByReceipt(receiptToken);
      if (!status || status.action !== 'DELETE_APP_USER') return null;
      return dataLifecycleReceiptStatusResponseSchema.parse({
        operationId: status.operationId,
        action: status.action,
        status: status.status,
        terminalResult: status.terminalResult,
        completedAt: status.completedAt?.toISOString() ?? null,
        purgeLocalData: true,
      });
    },

    async requestStopByReceipt(operationId, receiptToken) {
      await requireReceipt(operationId, receiptToken);
      const targetUserId = await targetUserIdForReceipt(operationRepository, operationId);
      const operation = await lifecycleRepository.getForTargetUser(
        targetUserId,
        operationId,
      );
      if (!operation) throw new UserDataLifecycleOperationNotFoundError();
      const stopped = await lifecycleRepository.requestStop(operation.targetUserId, operation.id);
      await appendAudit(lifecycleRepository, stopped, 'STOP_REQUESTED');
      return toResponse(stopped);
    },

    async resumeByReceipt(operationId, receiptToken, request) {
      await requireReceipt(operationId, receiptToken);
      const targetUserId = await targetUserIdForReceipt(operationRepository, operationId);
      return executeForUser(targetUserId, operationId, request);
    },
  };
}

async function targetUserIdForReceipt(
  repository: OperationRepositoryBoundary,
  operationId: number,
): Promise<number> {
  const target = await repository.getTargetUserId(operationId);
  if (target === null) throw new UserDataLifecycleOperationNotFoundError();
  return target;
}

async function requireUserDeletion(
  repository: LifecycleRepositoryBoundary,
  userId: number,
  operationId: number,
): Promise<StoredDataLifecycleOperation> {
  const operation = await repository.getForTargetUser(userId, operationId);
  if (!operation || operation.action !== 'DELETE_APP_USER' || operation.scope.resourceType !== 'USER') {
    throw new UserDataLifecycleOperationNotFoundError();
  }
  return operation;
}

function deriveReceiptToken(
  keyring: LifecycleHmacKeyring,
  keyVersion: number,
  operationId: number,
  idempotencyKey: string,
): string {
  const digest = keyring
    .candidates(`${operationId}:${idempotencyKey}`, 'user-deletion-receipt')
    .find((candidate) => candidate.keyVersion === keyVersion);
  if (!digest) {
    throw new Error(
      `Lifecycle HMAC key version ${keyVersion} is required to reproduce the deletion receipt.`,
    );
  }
  return `udr_${digest.digest}`;
}

function hashPreview(
  scope: { resourceType: 'USER'; userId: number },
  counts: StoredDataLifecycleOperation['previewCounts'],
): string {
  return createHash('sha256')
    .update(JSON.stringify({ version: 1, action: 'DELETE_APP_USER', scope, previewCounts: counts }), 'utf8')
    .digest('hex');
}

function assertExecutionCredentials(
  operation: StoredDataLifecycleOperation,
  request: DataLifecycleExecuteRequest,
): void {
  if (operation.confirmationPhrase !== request.confirmationPhrase) {
    throw new DataLifecyclePreviewInvalidError();
  }
  if (operation.previewTokenHash !== hashOpaqueLifecycleToken(request.previewToken)) {
    throw new DataLifecyclePreviewInvalidError();
  }
}

async function appendAudit(
  repository: LifecycleRepositoryBoundary,
  operation: StoredDataLifecycleOperation,
  eventType: string,
): Promise<void> {
  await repository.appendAudit({
    operationId: operation.id,
    eventType,
    action: operation.action,
    status: operation.status,
    actorKeyVersion: operation.actorKeyVersion,
    actorKeyHash: operation.actorKeyHash,
    targetKeyVersion: operation.targetKeyVersion,
    targetKeyHash: operation.targetKeyHash,
    resourceType: 'USER',
    aggregateCounts: operation.previewCounts,
    terminalResult: operation.terminalResult,
  });
}

function toResponse(operation: StoredDataLifecycleOperation): DataLifecycleOperationResponse {
  return dataLifecycleOperationResponseSchema.parse({
    operationId: operation.id,
    action: operation.action,
    status: operation.status,
    scope: operation.scope,
    previewCounts: operation.previewCounts,
    previewExpiresAt: operation.previewExpiresAt.toISOString(),
    confirmationPhrase: operation.confirmationPhrase,
    warningCodes: operation.warningCodes,
    stopRequest: operation.stopRequest,
    firstDestructiveCommitAt: operation.firstDestructiveCommitAt?.toISOString() ?? null,
    checkpoint: operation.checkpoint ?? null,
    verification: operation.verification ?? null,
    terminalResult: operation.terminalResult,
    errorCode: operation.errorCode,
    startedAt: operation.startedAt?.toISOString() ?? null,
    completedAt: operation.completedAt?.toISOString() ?? null,
    createdAt: operation.createdAt.toISOString(),
    updatedAt: operation.updatedAt.toISOString(),
  });
}

function validatePositiveInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive integer.`);
  }
}

export const UserDataLifecycleService = createUserDataLifecycleService();
