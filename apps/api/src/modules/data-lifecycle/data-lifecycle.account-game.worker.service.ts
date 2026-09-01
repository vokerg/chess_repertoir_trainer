import { randomUUID } from 'node:crypto';
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
  type AccountGameDataLifecycleCoordinatorRepository as CoordinatorRepositoryBoundary,
  type AccountGameDataLifecycleScope,
} from './data-lifecycle.coordinator.repository.prisma';
import {
  AccountGameDataLifecycleExecutionRepository,
  type AccountGameDataLifecycleExecutionRepository as ExecutionRepositoryBoundary,
  type DataLifecycleVerification,
} from './data-lifecycle.account-game-execution.repository.prisma';
import {
  AccountGameDataLifecycleOperationRepository,
  type AccountGameDataLifecycleOperationRepository as OperationRepositoryBoundary,
} from './data-lifecycle.account-game-operation.repository.prisma';
import {
  DataLifecycleRepository,
  type DataLifecycleRepository as LifecycleRepositoryBoundary,
  type StoredDataLifecycleOperation,
} from './data-lifecycle.repository.prisma';
import {
  LifecycleHmacKeyring,
  loadLifecycleAuditKeyring,
} from './data-lifecycle.hmac';
import type { AccountGameDataLifecycleWorkerConfig } from './data-lifecycle.account-game.worker.config';

export interface AccountGameDataLifecycleWorkerLogger {
  info(context: Record<string, unknown>, message: string): void;
  warn(context: Record<string, unknown>, message: string): void;
  error(context: Record<string, unknown>, message: string): void;
}

export interface CreateAccountGameDataLifecycleWorkerInput {
  lifecycleRepository?: LifecycleRepositoryBoundary;
  coordinatorRepository?: CoordinatorRepositoryBoundary;
  executionRepository?: ExecutionRepositoryBoundary;
  operationRepository?: OperationRepositoryBoundary;
  importRepository?: ImportRepositoryBoundary;
  preparationRepository?: PreparationRepositoryBoundary;
  auditKeyring?: LifecycleHmacKeyring;
  config: AccountGameDataLifecycleWorkerConfig;
  logger?: AccountGameDataLifecycleWorkerLogger;
  now?: () => number;
}

export interface AccountGameDataLifecycleWorker {
  run(): Promise<void>;
  runOnce(): Promise<boolean>;
  requestStop(): void;
}

type LifecyclePhase =
  | 'UNANALYSE'
  | 'UNINDEX'
  | 'PURGE_GAMES'
  | 'PURGE_FINALIZE'
  | 'ACCOUNT_DELETE'
  | 'DONE';

interface LifecycleCheckpoint {
  version: 1;
  phase: LifecyclePhase;
  afterGameId: number | null;
}

const consoleLogger: AccountGameDataLifecycleWorkerLogger = {
  info(context, message) { console.info(message, context); },
  warn(context, message) { console.warn(message, context); },
  error(context, message) { console.error(message, context); },
};

export function createAccountGameDataLifecycleWorker(
  input: CreateAccountGameDataLifecycleWorkerInput,
): AccountGameDataLifecycleWorker {
  const lifecycleRepository = input.lifecycleRepository ?? DataLifecycleRepository;
  const coordinatorRepository = input.coordinatorRepository ?? AccountGameDataLifecycleCoordinatorRepository;
  const executionRepository = input.executionRepository ?? AccountGameDataLifecycleExecutionRepository;
  const operationRepository = input.operationRepository ?? AccountGameDataLifecycleOperationRepository;
  const importRepository = input.importRepository ?? AccountImportLifecycleRepository;
  const preparationRepository = input.preparationRepository ?? PreparationReconcilerRepository;
  const auditKeyring = input.auditKeyring ?? loadLifecycleAuditKeyring();
  const logger = input.logger ?? consoleLogger;
  const now = input.now ?? Date.now;
  let running = false;
  let stopRequested = false;
  let wakePoll: (() => void) | null = null;
  let nextMaintenanceAt = 0;

  const requestStop = () => {
    stopRequested = true;
    wakePoll?.();
  };

  const runOnce = async (): Promise<boolean> => {
    if (now() >= nextMaintenanceAt) {
      const recovered = await operationRepository.recoverStaleClaims(
        new Date(now() - input.config.staleAfterMs),
      );
      if (recovered > 0) logger.warn({ recovered }, 'Recovered stale data lifecycle claims');
      nextMaintenanceAt = now() + input.config.staleRecoveryIntervalMs;
    }

    const workKey = `DATA_LIFECYCLE:${randomUUID()}`;
    const operation = await operationRepository.claimNext(workKey);
    if (!operation) return false;
    if (stopRequested) {
      await operationRepository.releaseClaim(operation.id, workKey);
      return false;
    }

    let heartbeatChain = Promise.resolve();
    const heartbeat = setInterval(() => {
      heartbeatChain = heartbeatChain
        .then(async () => {
          const retained = await lifecycleRepository.heartbeat(operation.id, workKey);
          if (!retained) {
            logger.warn({ operationId: operation.id }, 'Data lifecycle claim heartbeat was rejected');
          }
        })
        .catch((error) => logger.warn(safeErrorContext(error, operation), 'Data lifecycle heartbeat failed'));
    }, input.config.heartbeatIntervalMs);
    heartbeat.unref();

    try {
      await processClaim(operation, workKey);
    } catch (error) {
      logger.error(safeErrorContext(error, operation), 'Data lifecycle operation step failed');
      try {
        await lifecycleRepository.failClaimed(operation.id, workKey, errorCode(error));
      } catch (settleError) {
        logger.warn(
          safeErrorContext(settleError, operation),
          'Data lifecycle failure could not settle because the claim changed',
        );
      }
    } finally {
      clearInterval(heartbeat);
      await heartbeatChain;
    }
    return true;
  };

  const worker: AccountGameDataLifecycleWorker = {
    requestStop,
    runOnce,
    async run() {
      if (running) throw new Error('Data lifecycle worker is already running.');
      running = true;
      logger.info({}, 'Account/game data lifecycle worker started');
      try {
        while (!stopRequested) {
          let didWork = false;
          try {
            didWork = await runOnce();
          } catch (error) {
            logger.warn(safeErrorContext(error), 'Data lifecycle worker iteration failed');
          }
          if (!didWork && !stopRequested) await waitForPoll(input.config.pollIntervalMs);
        }
      } finally {
        running = false;
        wakePoll = null;
        logger.info({}, 'Account/game data lifecycle worker stopped');
      }
    },
  };
  return worker;

  async function processClaim(operation: StoredDataLifecycleOperation, workKey: string): Promise<void> {
    switch (operation.status) {
      case 'FENCING': {
        const next = await lifecycleRepository.advanceClaimed(operation.id, workKey, 'CANCEL_REQUESTED');
        await appendAudit(next, 'FENCE_INSTALLED');
        await release(operation, workKey);
        return;
      }
      case 'CANCEL_REQUESTED':
        await processCancellation(operation, workKey);
        return;
      case 'WAITING_FOR_DRAIN':
        await processDrain(operation, workKey);
        return;
      case 'EXECUTING':
        await processExecution(operation, workKey);
        return;
      case 'VERIFYING':
        await processVerification(operation, workKey);
        return;
      default:
        await release(operation, workKey);
    }
  }

  async function processCancellation(operation: StoredDataLifecycleOperation, workKey: string) {
    if (canCancelBeforeMutation(operation)) {
      await lifecycleRepository.completeCancellationBeforeMutation(operation.id, workKey);
      return;
    }
    const targets = await coordinatorRepository.listCancellationTargets(accountGameScope(operation));
    for (const importRunId of targets.importRunIds) {
      await importRepository.requestCancel(operation.targetUserId, importRunId);
    }
    for (const preparationRunId of targets.preparationRunIds) {
      await preparationRepository.requestCancel(operation.targetUserId, preparationRunId);
    }
    await executionRepository.cancelScopedJobTasks(operation.targetUserId, targets.jobTaskIds);

    if (targets.hasMore || targets.jobTaskIds.length > 0) {
      await release(operation, workKey);
      return;
    }
    const next = await lifecycleRepository.advanceClaimed(operation.id, workKey, 'WAITING_FOR_DRAIN');
    await appendAudit(next, 'CANCELLATION_REQUESTED');
    await release(operation, workKey);
  }

  async function processDrain(operation: StoredDataLifecycleOperation, workKey: string) {
    if (canCancelBeforeMutation(operation)) {
      await lifecycleRepository.completeCancellationBeforeMutation(operation.id, workKey);
      return;
    }
    const snapshot = await coordinatorRepository.loadDrainSnapshot(accountGameScope(operation));
    if (snapshot.legacyImportBlockers > 0) throw new Error('DATA_LIFECYCLE_LEGACY_IMPORT_BLOCKED');
    if (!snapshot.drained) {
      await release(operation, workKey);
      return;
    }
    const next = await lifecycleRepository.advanceClaimed(operation.id, workKey, 'EXECUTING');
    await appendAudit(next, 'DRAIN_CONFIRMED');
    await release(operation, workKey);
  }

  async function processExecution(operation: StoredDataLifecycleOperation, workKey: string) {
    if (operation.firstDestructiveCommitAt !== null && operation.stopRequest === 'STOP_AFTER_BATCH') {
      await lifecycleRepository.failClaimed(operation.id, workKey, 'DATA_LIFECYCLE_STOPPED_AFTER_BATCH');
      return;
    }
    if (canCancelBeforeMutation(operation)) {
      await lifecycleRepository.completeCancellationBeforeMutation(operation.id, workKey);
      return;
    }

    const checkpoint = parseCheckpoint(operation);
    switch (operation.action) {
      case 'UNANALYSE_GAMES':
        await executeUnanalyseStep(operation, workKey, checkpoint);
        return;
      case 'UNINDEX_GAMES':
        await executeUnindexStep(operation, workKey, checkpoint);
        return;
      case 'PURGE_ACCOUNT_DATA':
        await executePurgeStep(operation, workKey, checkpoint, false);
        return;
      case 'DELETE_EXTERNAL_ACCOUNT':
        await executePurgeStep(operation, workKey, checkpoint, true);
        return;
      default:
        throw new Error(`Unsupported account/game lifecycle action: ${operation.action}`);
    }
  }

  async function executeUnanalyseStep(
    operation: StoredDataLifecycleOperation,
    workKey: string,
    checkpoint: LifecycleCheckpoint,
  ) {
    const scope = gameScope(operation);
    if (checkpoint.phase !== 'UNANALYSE') throw new Error('Invalid un-analysis lifecycle checkpoint.');
    const gameIds = await coordinatorRepository.nextGameBatch(
      scope,
      checkpoint.afterGameId,
      input.config.gameBatchLimit,
    );
    if (gameIds.length === 0) {
      await lifecycleRepository.updateCheckpoint(operation.id, workKey, doneCheckpoint());
      await moveToVerify(operation, workKey);
      return;
    }
    await lifecycleRepository.runDestructiveTransaction({
      operationId: operation.id,
      targetUserId: operation.targetUserId,
      workKey,
      checkpoint: { version: 1, phase: 'UNANALYSE', afterGameId: lastId(gameIds) },
    }, (transaction) => executionRepository.unanalyseGameBatch(transaction, scope, gameIds));
    await release(operation, workKey);
  }

  async function executeUnindexStep(
    operation: StoredDataLifecycleOperation,
    workKey: string,
    checkpoint: LifecycleCheckpoint,
  ) {
    const scope = gameScope(operation);
    if (checkpoint.phase === 'UNANALYSE') {
      const gameIds = await coordinatorRepository.nextGameBatch(
        scope,
        checkpoint.afterGameId,
        input.config.gameBatchLimit,
      );
      if (gameIds.length === 0) {
        await lifecycleRepository.updateCheckpoint(operation.id, workKey, {
          version: 1,
          phase: 'UNINDEX',
          afterGameId: null,
        });
        await release(operation, workKey);
        return;
      }
      await lifecycleRepository.runDestructiveTransaction({
        operationId: operation.id,
        targetUserId: operation.targetUserId,
        workKey,
        checkpoint: { version: 1, phase: 'UNANALYSE', afterGameId: lastId(gameIds) },
      }, (transaction) => executionRepository.unanalyseGameBatch(transaction, scope, gameIds));
      await release(operation, workKey);
      return;
    }
    if (checkpoint.phase !== 'UNINDEX') throw new Error('Invalid un-index lifecycle checkpoint.');
    const gameIds = await coordinatorRepository.nextGameBatch(
      scope,
      checkpoint.afterGameId,
      input.config.gameBatchLimit,
    );
    if (gameIds.length === 0) {
      await lifecycleRepository.updateCheckpoint(operation.id, workKey, doneCheckpoint());
      await moveToVerify(operation, workKey);
      return;
    }
    await lifecycleRepository.runDestructiveTransaction({
      operationId: operation.id,
      targetUserId: operation.targetUserId,
      workKey,
      checkpoint: { version: 1, phase: 'UNINDEX', afterGameId: lastId(gameIds) },
    }, (transaction) => executionRepository.unindexGameBatch(transaction, scope, gameIds));
    await release(operation, workKey);
  }

  async function executePurgeStep(
    operation: StoredDataLifecycleOperation,
    workKey: string,
    checkpoint: LifecycleCheckpoint,
    deleteAccount: boolean,
  ) {
    const scope = accountScope(operation);
    if (checkpoint.phase === 'PURGE_GAMES') {
      const gameIds = await coordinatorRepository.nextGameBatch(
        scope,
        checkpoint.afterGameId,
        input.config.gameBatchLimit,
      );
      if (gameIds.length === 0) {
        await lifecycleRepository.updateCheckpoint(operation.id, workKey, {
          version: 1,
          phase: 'PURGE_FINALIZE',
          afterGameId: null,
        });
        await release(operation, workKey);
        return;
      }
      await lifecycleRepository.runDestructiveTransaction({
        operationId: operation.id,
        targetUserId: operation.targetUserId,
        workKey,
        checkpoint: { version: 1, phase: 'PURGE_GAMES', afterGameId: lastId(gameIds) },
      }, (transaction) => executionRepository.purgeAccountGameBatch(transaction, scope, gameIds));
      await release(operation, workKey);
      return;
    }

    if (checkpoint.phase === 'PURGE_FINALIZE') {
      const nextCheckpoint: LifecycleCheckpoint = deleteAccount
        ? { version: 1, phase: 'ACCOUNT_DELETE', afterGameId: null }
        : doneCheckpoint();
      await lifecycleRepository.runDestructiveTransaction({
        operationId: operation.id,
        targetUserId: operation.targetUserId,
        workKey,
        checkpoint: nextCheckpoint,
      }, (transaction) => executionRepository.finalizeAccountPurge(transaction, scope));
      await release(operation, workKey);
      return;
    }

    if (deleteAccount && checkpoint.phase === 'ACCOUNT_DELETE') {
      await appendAuditOnce(operation, 'ACCOUNT_DELETE_AGGREGATE_SNAPSHOT');
      await lifecycleRepository.runDestructiveTransaction({
        operationId: operation.id,
        targetUserId: operation.targetUserId,
        workKey,
        checkpoint: doneCheckpoint(),
      }, (transaction) => executionRepository.deleteExternalAccount(transaction, scope));
      await release(operation, workKey);
      return;
    }

    if (checkpoint.phase === 'DONE') {
      await moveToVerify(operation, workKey);
      return;
    }
    throw new Error('Invalid account lifecycle checkpoint.');
  }

  async function processVerification(operation: StoredDataLifecycleOperation, workKey: string) {
    let verification: DataLifecycleVerification;
    switch (operation.action) {
      case 'UNANALYSE_GAMES':
        verification = await executionRepository.verifyUnanalysed(gameScope(operation));
        break;
      case 'UNINDEX_GAMES':
        verification = await executionRepository.verifyUnindexed(gameScope(operation));
        break;
      case 'PURGE_ACCOUNT_DATA':
        verification = await executionRepository.verifyAccountPurged(accountScope(operation));
        break;
      case 'DELETE_EXTERNAL_ACCOUNT':
        verification = await executionRepository.verifyAccountDeleted(accountScope(operation));
        break;
      default:
        throw new Error(`Unsupported account/game lifecycle action: ${operation.action}`);
    }
    if (!verification.ok) {
      await lifecycleRepository.failClaimed(operation.id, workKey, 'DATA_LIFECYCLE_VERIFICATION_FAILED');
      return;
    }
    await lifecycleRepository.completeVerified(operation.id, workKey, verification);
  }

  async function moveToVerify(operation: StoredDataLifecycleOperation, workKey: string) {
    const next = await lifecycleRepository.advanceClaimed(operation.id, workKey, 'VERIFYING');
    await appendAudit(next, 'DESTRUCTIVE_PHASES_COMPLETED');
    await release(operation, workKey);
  }

  async function release(operation: StoredDataLifecycleOperation, workKey: string) {
    await operationRepository.releaseClaim(operation.id, workKey);
  }

  async function appendAuditOnce(operation: StoredDataLifecycleOperation, eventType: string) {
    if (await operationRepository.hasAuditEvent(operation.id, eventType)) return;
    await appendAudit(operation, eventType);
  }

  async function appendAudit(operation: StoredDataLifecycleOperation, eventType: string) {
    const principal = auditKeyring.current(`APP_USER:${operation.targetUserId}`, 'audit-principal');
    await lifecycleRepository.appendAudit({
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

  function waitForPoll(delayMs: number): Promise<void> {
    return new Promise((resolve) => {
      const wake = () => {
        clearTimeout(timer);
        if (wakePoll === wake) wakePoll = null;
        resolve();
      };
      const timer = setTimeout(wake, delayMs);
      wakePoll = wake;
    });
  }
}

function canCancelBeforeMutation(operation: StoredDataLifecycleOperation): boolean {
  return operation.stopRequest === 'CANCEL' && operation.firstDestructiveCommitAt === null;
}

function parseCheckpoint(operation: StoredDataLifecycleOperation): LifecycleCheckpoint {
  if (operation.checkpoint === null || operation.checkpoint === undefined) {
    switch (operation.action) {
      case 'UNANALYSE_GAMES':
      case 'UNINDEX_GAMES':
        return { version: 1, phase: 'UNANALYSE', afterGameId: null };
      case 'PURGE_ACCOUNT_DATA':
      case 'DELETE_EXTERNAL_ACCOUNT':
        return { version: 1, phase: 'PURGE_GAMES', afterGameId: null };
      default:
        throw new Error(`Unsupported lifecycle action checkpoint: ${operation.action}`);
    }
  }
  const checkpoint = operation.checkpoint as Partial<LifecycleCheckpoint>;
  const validPhase = [
    'UNANALYSE',
    'UNINDEX',
    'PURGE_GAMES',
    'PURGE_FINALIZE',
    'ACCOUNT_DELETE',
    'DONE',
  ].includes(checkpoint.phase ?? '');
  const validAfterGameId = checkpoint.afterGameId === null
    || (Number.isSafeInteger(checkpoint.afterGameId) && Number(checkpoint.afterGameId) > 0);
  if (checkpoint.version !== 1 || !validPhase || !validAfterGameId) {
    throw new Error('Invalid data lifecycle checkpoint.');
  }
  return checkpoint as LifecycleCheckpoint;
}

function doneCheckpoint(): LifecycleCheckpoint {
  return { version: 1, phase: 'DONE', afterGameId: null };
}

function lastId(gameIds: number[]): number {
  const value = gameIds.at(-1);
  if (!value) throw new Error('Lifecycle game batch unexpectedly had no final id.');
  return value;
}

function accountGameScope(operation: StoredDataLifecycleOperation): AccountGameDataLifecycleScope {
  if (operation.scope.resourceType === 'USER') throw new Error('Whole-user lifecycle belongs to ONB-021.');
  return operation.scope;
}

function gameScope(operation: StoredDataLifecycleOperation) {
  const scope = accountGameScope(operation);
  if (scope.resourceType !== 'GAME') throw new Error('Lifecycle operation requires GAME scope.');
  return scope;
}

function accountScope(operation: StoredDataLifecycleOperation) {
  const scope = accountGameScope(operation);
  if (scope.resourceType !== 'ACCOUNT') throw new Error('Lifecycle operation requires ACCOUNT scope.');
  return scope;
}

function errorCode(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error && typeof error.code === 'string') {
    return error.code;
  }
  if (error instanceof Error && /^[A-Z0-9_:-]{1,120}$/.test(error.message)) return error.message;
  return 'DATA_LIFECYCLE_EXECUTION_FAILED';
}

function safeErrorContext(
  error: unknown,
  operation?: Pick<StoredDataLifecycleOperation, 'id' | 'action' | 'status'>,
): Record<string, unknown> {
  return {
    ...(operation ? {
      operationId: operation.id,
      action: operation.action,
      status: operation.status,
    } : {}),
    errorName: error instanceof Error ? error.name : 'UnknownError',
    errorMessage: error instanceof Error ? error.message : String(error),
  };
}
