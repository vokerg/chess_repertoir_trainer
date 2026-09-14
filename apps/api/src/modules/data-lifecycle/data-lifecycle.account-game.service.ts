import { createHash, randomBytes } from 'node:crypto';
import {
  accountGameDataLifecyclePreviewRequestSchema,
  dataLifecycleExecuteRequestSchema,
  dataLifecycleOperationResponseSchema,
  dataLifecyclePreviewResponseSchema,
  type AccountGameDataLifecyclePreviewRequest,
  type DataLifecycleExecuteRequest,
  type DataLifecycleOperationResponse,
  type DataLifecyclePreviewResponse,
} from '@chess-trainer/contracts/data-lifecycle';
import {
  AccountImportLifecycleRepository,
  type AccountImportLifecycleRepository as ImportRepositoryBoundary,
} from '../account-imports/account-import.lifecycle.repository.prisma';
import {
  PreparationReconcilerRepository,
  type PreparationReconcilerRepository as PreparationRepositoryBoundary,
} from '../preparation/preparation-reconciler.repository.prisma';
import {
  AccountGameDataLifecycleCoordinatorRepository,
  createAccountGameDataLifecycleCoordinatorRepository,
  type AccountGameDataLifecycleAction,
  type AccountGameDataLifecycleScope,
  type AccountGameDataLifecycleCoordinatorRepository as CoordinatorRepositoryBoundary,
} from './data-lifecycle.coordinator.repository.prisma';
import {
  AccountGameDataLifecycleOperationRepository,
  type AccountGameDataLifecycleOperationRepository as OperationRepositoryBoundary,
} from './data-lifecycle.account-game-operation.repository.prisma';
import {
  AccountGameDataLifecycleExecutionRepository,
  type AccountGameDataLifecycleExecutionRepository as ExecutionRepositoryBoundary,
} from './data-lifecycle.account-game-execution.repository.prisma';
import {
  DataLifecycleInvalidStateError,
  DataLifecyclePreviewInvalidError,
  DataLifecycleRepository,
  type DataLifecycleRepository as DataLifecycleRepositoryBoundary,
  type StoredDataLifecycleOperation,
} from './data-lifecycle.repository.prisma';
import {
  hashOpaqueLifecycleToken,
  LifecycleHmacKeyring,
  loadLifecycleAuditKeyring,
} from './data-lifecycle.hmac';

export const ACCOUNT_GAME_LIFECYCLE_PREVIEW_TTL_MS = 10 * 60_000;
const ADMIN_DIRECT_PURGE_DRAIN_POLL_INTERVAL_MS = 100;
const ADMIN_DIRECT_PURGE_DRAIN_TIMEOUT_MS = 30_000;

const ACCOUNT_GAME_ACTIONS = new Set<AccountGameDataLifecycleAction>([
  'UNANALYSE_GAMES',
  'UNINDEX_GAMES',
  'PURGE_ACCOUNT_DATA',
  'DELETE_EXTERNAL_ACCOUNT',
]);

export class DataLifecycleOperationNotFoundError extends Error {
  readonly code = 'DATA_LIFECYCLE_OWNERSHIP_CHANGED' as const;

  constructor() {
    super('Data lifecycle operation was not found.');
    this.name = 'DataLifecycleOperationNotFoundError';
  }
}

export interface AccountGameDataLifecycleService {
  preview(
    userId: number,
    request: AccountGameDataLifecyclePreviewRequest,
  ): Promise<DataLifecyclePreviewResponse>;
  execute(
    userId: number,
    operationId: number,
    request: DataLifecycleExecuteRequest,
  ): Promise<DataLifecycleOperationResponse>;
  get(userId: number, operationId: number): Promise<DataLifecycleOperationResponse>;
  requestStop(userId: number, operationId: number): Promise<DataLifecycleOperationResponse>;
  previewForAdmin(
    actorUserId: number,
    targetUserId: number,
    actor: LifecycleAuditIdentity,
    target: LifecycleAuditIdentity,
    request: AccountGameDataLifecyclePreviewRequest,
  ): Promise<DataLifecyclePreviewResponse>;
  executeForAdmin(
    targetUserId: number,
    operationId: number,
    request: DataLifecycleExecuteRequest,
    verification?: Record<string, unknown>,
  ): Promise<DataLifecycleOperationResponse>;
}

export interface LifecycleAuditIdentity {
  keyVersion: number;
  digest: string;
}

export interface CreateAccountGameDataLifecycleServiceInput {
  lifecycleRepository?: DataLifecycleRepositoryBoundary;
  coordinatorRepository?: CoordinatorRepositoryBoundary;
  operationRepository?: OperationRepositoryBoundary;
  executionRepository?: ExecutionRepositoryBoundary;
  importRepository?: ImportRepositoryBoundary;
  preparationRepository?: PreparationRepositoryBoundary;
  auditKeyring?: LifecycleHmacKeyring;
  now?: () => Date;
  randomToken?: () => string;
}

export function createAccountGameDataLifecycleService(
  input: CreateAccountGameDataLifecycleServiceInput = {},
): AccountGameDataLifecycleService {
  const lifecycleRepository = input.lifecycleRepository ?? DataLifecycleRepository;
  const coordinatorRepository =
    input.coordinatorRepository ?? AccountGameDataLifecycleCoordinatorRepository;
  const operationRepository =
    input.operationRepository ?? AccountGameDataLifecycleOperationRepository;
  const executionRepository =
    input.executionRepository ?? AccountGameDataLifecycleExecutionRepository;
  const importRepository = input.importRepository ?? AccountImportLifecycleRepository;
  const preparationRepository =
    input.preparationRepository ?? PreparationReconcilerRepository;
  const auditKeyring = input.auditKeyring ?? loadLifecycleAuditKeyring();
  const now = input.now ?? (() => new Date());
  const randomToken = input.randomToken ?? (() => randomBytes(32).toString('base64url'));

  async function preview(
    actorUserId: number,
    targetUserId: number,
    actor: LifecycleAuditIdentity,
    target: LifecycleAuditIdentity,
    request: AccountGameDataLifecyclePreviewRequest,
  ) {
    validatePositiveInteger(actorUserId, 'actorUserId');
    validatePositiveInteger(targetUserId, 'targetUserId');
    const parsed = accountGameDataLifecyclePreviewRequestSchema.parse(request);
    const action = parsed.action;
    const scope = scopeForPreview(targetUserId, parsed);
    const previewCounts = await coordinatorRepository.countAffectedRows(action, scope);
    const previewToken = randomToken();
    if (previewToken.length < 16)
      throw new Error('Lifecycle preview token generator returned an unsafe token.');
    const previewHash = hashPreview(action, scope, previewCounts);
    const previewExpiresAt = new Date(now().getTime() + ACCOUNT_GAME_LIFECYCLE_PREVIEW_TTL_MS);
    const confirmationPhrase = confirmationPhraseFor(action, scope);
    const warningCodes = warningCodesFor(action);

    const operation = await lifecycleRepository.createPreview({
      action,
      actorUserId,
      targetUserId,
      actorKeyVersion: actor.keyVersion,
      actorKeyHash: actor.digest,
      targetKeyVersion: target.keyVersion,
      targetKeyHash: target.digest,
      scope,
      previewCounts,
      previewHash,
      previewTokenHash: hashOpaqueLifecycleToken(previewToken),
      previewExpiresAt,
      confirmationPhrase,
      warningCodes,
    });
    await appendAudit(lifecycleRepository, auditKeyring, operation, 'PREVIEW_CREATED');

    return dataLifecyclePreviewResponseSchema.parse({
      ...toResponse(operation),
      previewToken,
    });
  }

  async function execute(
    userId: number,
    operationId: number,
    request: DataLifecycleExecuteRequest,
    verification?: Record<string, unknown>,
  ) {
    validatePositiveInteger(userId, 'userId');
    validatePositiveInteger(operationId, 'operationId');
    const parsed = dataLifecycleExecuteRequestSchema.parse(request);
    const operation = await requireAccountGameOperation(lifecycleRepository, userId, operationId);
    assertExecutionCredentials(operation, parsed);
    const idempotencyKeyHash = hashOpaqueLifecycleToken(parsed.idempotencyKey);

    let started: StoredDataLifecycleOperation;
    if (operation.status === 'PREVIEWED') {
      started = await lifecycleRepository.startExecution({
        operationId,
        targetUserId: userId,
        previewTokenHash: hashOpaqueLifecycleToken(parsed.previewToken),
        previewHash: operation.previewHash,
        idempotencyKeyHash,
        verification,
        validateBeforeFence: async (transaction, lockedOperation) => {
          const action = lockedOperation.action as AccountGameDataLifecycleAction;
          const scope = accountGameScope(lockedOperation);
          const lockedCoordinator =
            createAccountGameDataLifecycleCoordinatorRepository(transaction);
          const currentCounts = await lockedCoordinator.countAffectedRows(action, scope);
          const currentPreviewHash = hashPreview(action, scope, currentCounts);
          if (currentPreviewHash !== lockedOperation.previewHash) {
            throw new DataLifecyclePreviewInvalidError();
          }
        },
      });
      await appendAudit(lifecycleRepository, auditKeyring, started, 'EXECUTION_REQUESTED');
    } else if (operation.status === 'NEEDS_ATTENTION') {
      if (operation.firstDestructiveCommitAt === null) {
        throw new DataLifecycleInvalidStateError(
          'A lifecycle operation that failed before mutation requires a new preview.',
        );
      }
      if (operation.idempotencyKeyHash !== idempotencyKeyHash) {
        throw new DataLifecycleInvalidStateError(
          'The original lifecycle idempotency key is required to resume partial execution.',
        );
      }
      started = await operationRepository.resumeNeedsAttention(
        userId,
        operationId,
        idempotencyKeyHash,
        verification,
      );
      await appendAudit(lifecycleRepository, auditKeyring, started, 'EXECUTION_RESUMED');
    } else {
      if (operation.idempotencyKeyHash !== idempotencyKeyHash) {
        throw new DataLifecycleInvalidStateError(
          'Lifecycle idempotency key is already bound to another execution request.',
        );
      }
      started = operation;
    }

    return toResponse(started);
  }

  async function executeForAdmin(
    targetUserId: number,
    operationId: number,
    request: DataLifecycleExecuteRequest,
    verification?: Record<string, unknown>,
  ) {
    validatePositiveInteger(targetUserId, 'targetUserId');
    validatePositiveInteger(operationId, 'operationId');
    const parsed = dataLifecycleExecuteRequestSchema.parse(request);
    const operation = await requireAccountGameOperation(
      lifecycleRepository,
      targetUserId,
      operationId,
    );
    assertExecutionCredentials(operation, parsed);

    if (
      operation.action !== 'PURGE_ACCOUNT_DATA'
      || (operation.status === 'NEEDS_ATTENTION' && operation.firstDestructiveCommitAt !== null)
    ) {
      return execute(targetUserId, operationId, parsed, verification);
    }

    const scope = accountGameScope(operation);
    if (scope.resourceType !== 'ACCOUNT') {
      throw new DataLifecycleInvalidStateError(
        'PURGE_ACCOUNT_DATA requires an account lifecycle scope.',
      );
    }

    const idempotencyKeyHash = hashOpaqueLifecycleToken(parsed.idempotencyKey);
    const alreadyCompleted = operation.status === 'COMPLETED';
    const completedReplay = await executionRepository.prepareSynchronousAccountPurge({
      operationId,
      targetUserId,
      previewTokenHash: hashOpaqueLifecycleToken(parsed.previewToken),
      previewHash: operation.previewHash,
      idempotencyKeyHash,
      verification,
    });

    if (!completedReplay) {
      await quiesceAccountForDirectPurge(scope, operationId, targetUserId);
      await executionRepository.completeSynchronousAccountPurge({
        operationId,
        targetUserId,
        idempotencyKeyHash,
      });
    }

    const completed = await requireAccountGameOperation(
      lifecycleRepository,
      targetUserId,
      operationId,
    );
    if (!alreadyCompleted && completed.status === 'COMPLETED') {
      await appendAudit(lifecycleRepository, auditKeyring, completed, 'COMPLETED');
    }
    return toResponse(completed);
  }

  async function quiesceAccountForDirectPurge(
    scope: Extract<AccountGameDataLifecycleScope, { resourceType: 'ACCOUNT' }>,
    operationId: number,
    targetUserId: number,
  ): Promise<void> {
    const deadline = Date.now() + ADMIN_DIRECT_PURGE_DRAIN_TIMEOUT_MS;

    try {
      while (true) {
        const targets = await coordinatorRepository.listCancellationTargets(scope);
        for (const importRunId of targets.importRunIds) {
          await importRepository.requestCancel(targetUserId, importRunId);
        }
        for (const preparationRunId of targets.preparationRunIds) {
          await preparationRepository.requestCancel(targetUserId, preparationRunId);
        }
        await executionRepository.cancelScopedJobTasks(targetUserId, targets.jobTaskIds);

        const snapshot = await coordinatorRepository.loadDrainSnapshot(scope);
        if (snapshot.legacyImportBlockers > 0) {
          await executionRepository.markSynchronousAccountPurgeNeedsAttention({
            operationId,
            targetUserId,
            errorCode: 'DATA_LIFECYCLE_LEGACY_IMPORT_BLOCKED',
          });
          throw new DataLifecycleInvalidStateError(
            'Account purge is blocked by active legacy import work.',
          );
        }
        if (snapshot.drained) return;
        if (Date.now() >= deadline) {
          await executionRepository.markSynchronousAccountPurgeNeedsAttention({
            operationId,
            targetUserId,
            errorCode: 'DATA_LIFECYCLE_DRAIN_TIMEOUT',
          });
          throw new DataLifecycleInvalidStateError(
            'Account work did not drain before the synchronous purge deadline.',
          );
        }

        await wait(ADMIN_DIRECT_PURGE_DRAIN_POLL_INTERVAL_MS);
      }
    } catch (error) {
      if (
        error instanceof DataLifecycleInvalidStateError
        && (
          error.message === 'Account purge is blocked by active legacy import work.'
          || error.message === 'Account work did not drain before the synchronous purge deadline.'
        )
      ) {
        throw error;
      }
      await executionRepository.markSynchronousAccountPurgeNeedsAttention({
        operationId,
        targetUserId,
        errorCode: 'DATA_LIFECYCLE_DRAIN_FAILED',
      });
      throw error;
    }
  }

  return {
    async preview(userId, request) {
      const identity = auditPrincipal(auditKeyring, userId);
      return preview(userId, userId, identity, identity, request);
    },
    execute,
    previewForAdmin: preview,
    executeForAdmin,

    async get(userId, operationId) {
      validatePositiveInteger(userId, 'userId');
      validatePositiveInteger(operationId, 'operationId');
      return toResponse(
        await requireAccountGameOperation(lifecycleRepository, userId, operationId),
      );
    },

    async requestStop(userId, operationId) {
      validatePositiveInteger(userId, 'userId');
      validatePositiveInteger(operationId, 'operationId');
      await requireAccountGameOperation(lifecycleRepository, userId, operationId);
      const operation = await lifecycleRepository.requestStop(userId, operationId);
      await appendAudit(lifecycleRepository, auditKeyring, operation, 'STOP_REQUESTED');
      return toResponse(operation);
    },
  };
}

function scopeForPreview(
  userId: number,
  request: AccountGameDataLifecyclePreviewRequest,
): AccountGameDataLifecycleScope {
  switch (request.action) {
    case 'UNANALYSE_GAMES':
    case 'UNINDEX_GAMES':
      return {
        resourceType: 'GAME',
        userId,
        accountId: request.accountId,
        gameIds: uniqueSortedIds(request.gameIds),
      };
    case 'PURGE_ACCOUNT_DATA':
    case 'DELETE_EXTERNAL_ACCOUNT':
      return {
        resourceType: 'ACCOUNT',
        userId,
        accountId: request.accountId,
      };
  }
}

function confirmationPhraseFor(
  action: AccountGameDataLifecycleAction,
  scope: AccountGameDataLifecycleScope,
): string {
  switch (action) {
    case 'UNANALYSE_GAMES':
      return `UNANALYSE ${scope.resourceType === 'GAME' ? scope.gameIds.length : 0} GAMES`;
    case 'UNINDEX_GAMES':
      return `UNINDEX ${scope.resourceType === 'GAME' ? scope.gameIds.length : 0} GAMES`;
    case 'PURGE_ACCOUNT_DATA':
      return `PURGE ACCOUNT ${scope.accountId}`;
    case 'DELETE_EXTERNAL_ACCOUNT':
      return `DELETE ACCOUNT ${scope.accountId}`;
  }
}

function warningCodesFor(action: AccountGameDataLifecycleAction): string[] {
  switch (action) {
    case 'UNANALYSE_GAMES':
      return ['DESTRUCTIVE_OPERATION', 'ANALYSIS_DATA_REMOVAL'];
    case 'UNINDEX_GAMES':
      return ['DESTRUCTIVE_OPERATION', 'INDEX_AND_ANALYSIS_DATA_REMOVAL'];
    case 'PURGE_ACCOUNT_DATA':
      return ['DESTRUCTIVE_OPERATION', 'ACCOUNT_DATA_REMOVAL'];
    case 'DELETE_EXTERNAL_ACCOUNT':
      return ['DESTRUCTIVE_OPERATION', 'ACCOUNT_DELETION'];
  }
}

function hashPreview(
  action: AccountGameDataLifecycleAction,
  scope: AccountGameDataLifecycleScope,
  previewCounts: StoredDataLifecycleOperation['previewCounts'],
): string {
  return createHash('sha256')
    .update(JSON.stringify({ version: 1, action, scope, previewCounts }), 'utf8')
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

async function requireAccountGameOperation(
  repository: DataLifecycleRepositoryBoundary,
  userId: number,
  operationId: number,
): Promise<StoredDataLifecycleOperation> {
  const operation = await repository.getForTargetUser(userId, operationId);
  if (!operation || !ACCOUNT_GAME_ACTIONS.has(operation.action as AccountGameDataLifecycleAction)) {
    throw new DataLifecycleOperationNotFoundError();
  }
  return operation;
}

function accountGameScope(operation: StoredDataLifecycleOperation): AccountGameDataLifecycleScope {
  if (operation.scope.resourceType === 'USER') {
    throw new DataLifecycleInvalidStateError('Whole-user lifecycle operations belong to ONB-021.');
  }
  return operation.scope;
}

function auditPrincipal(keyring: LifecycleHmacKeyring, userId: number) {
  return keyring.current(`APP_USER:${userId}`, 'audit-principal');
}

async function appendAudit(
  repository: DataLifecycleRepositoryBoundary,
  _keyring: LifecycleHmacKeyring,
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
    resourceType: operation.scope.resourceType,
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

function uniqueSortedIds(values: number[]): number[] {
  return Array.from(new Set(values)).sort((left, right) => left - right);
}

function wait(delayMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

function validatePositiveInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value <= 0)
    throw new Error(`${label} must be a positive integer.`);
}

export const AccountGameDataLifecycleService = createAccountGameDataLifecycleService();
