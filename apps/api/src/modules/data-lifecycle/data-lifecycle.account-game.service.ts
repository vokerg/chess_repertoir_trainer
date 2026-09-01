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
  AccountGameDataLifecycleCoordinatorRepository,
  type AccountGameDataLifecycleAction,
  type AccountGameDataLifecycleScope,
  type AccountGameDataLifecycleCoordinatorRepository as CoordinatorRepositoryBoundary,
} from './data-lifecycle.coordinator.repository.prisma';
import {
  AccountGameDataLifecycleOperationRepository,
  type AccountGameDataLifecycleOperationRepository as OperationRepositoryBoundary,
} from './data-lifecycle.account-game-operation.repository.prisma';
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
}

export interface CreateAccountGameDataLifecycleServiceInput {
  lifecycleRepository?: DataLifecycleRepositoryBoundary;
  coordinatorRepository?: CoordinatorRepositoryBoundary;
  operationRepository?: OperationRepositoryBoundary;
  auditKeyring?: LifecycleHmacKeyring;
  now?: () => Date;
  randomToken?: () => string;
}

export function createAccountGameDataLifecycleService(
  input: CreateAccountGameDataLifecycleServiceInput = {},
): AccountGameDataLifecycleService {
  const lifecycleRepository = input.lifecycleRepository ?? DataLifecycleRepository;
  const coordinatorRepository = input.coordinatorRepository ?? AccountGameDataLifecycleCoordinatorRepository;
  const operationRepository = input.operationRepository ?? AccountGameDataLifecycleOperationRepository;
  const auditKeyring = input.auditKeyring ?? loadLifecycleAuditKeyring();
  const now = input.now ?? (() => new Date());
  const randomToken = input.randomToken ?? (() => randomBytes(32).toString('base64url'));

  return {
    async preview(userId, request) {
      validatePositiveInteger(userId, 'userId');
      const parsed = accountGameDataLifecyclePreviewRequestSchema.parse(request);
      const action = parsed.action;
      const scope = scopeForPreview(userId, parsed);
      const previewCounts = await coordinatorRepository.countAffectedRows(action, scope);
      const previewToken = randomToken();
      if (previewToken.length < 16) throw new Error('Lifecycle preview token generator returned an unsafe token.');
      const previewHash = hashPreview(action, scope, previewCounts);
      const principal = auditPrincipal(auditKeyring, userId);
      const previewExpiresAt = new Date(now().getTime() + ACCOUNT_GAME_LIFECYCLE_PREVIEW_TTL_MS);
      const confirmationPhrase = confirmationPhraseFor(action, scope);
      const warningCodes = warningCodesFor(action);

      const operation = await lifecycleRepository.createPreview({
        action,
        actorUserId: userId,
        targetUserId: userId,
        actorKeyVersion: principal.keyVersion,
        actorKeyHash: principal.digest,
        targetKeyVersion: principal.keyVersion,
        targetKeyHash: principal.digest,
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
    },

    async execute(userId, operationId, request) {
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
        started = await operationRepository.resumeNeedsAttention(userId, operationId);
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
    },

    async get(userId, operationId) {
      validatePositiveInteger(userId, 'userId');
      validatePositiveInteger(operationId, 'operationId');
      return toResponse(await requireAccountGameOperation(lifecycleRepository, userId, operationId));
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

function auditPrincipal(keyring: LifecycleHmacKeyring, userId: number) {
  return keyring.current(`APP_USER:${userId}`, 'audit-principal');
}

async function appendAudit(
  repository: DataLifecycleRepositoryBoundary,
  keyring: LifecycleHmacKeyring,
  operation: StoredDataLifecycleOperation,
  eventType: string,
): Promise<void> {
  const principal = auditPrincipal(keyring, operation.targetUserId);
  await repository.appendAudit({
    operationId: operation.id,
    eventType,
    action: operation.action,
    status: operation.status,
    actorKeyVersion: principal.keyVersion,
    actorKeyHash: principal.digest,
    targetKeyVersion: principal.keyVersion,
    targetKeyHash: principal.digest,
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

function validatePositiveInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`${label} must be a positive integer.`);
}

export const AccountGameDataLifecycleService = createAccountGameDataLifecycleService();
