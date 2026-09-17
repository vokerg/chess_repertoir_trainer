import { randomUUID } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import {
  AccountImportLifecycleRepository,
  type AccountImportLifecycleRepository as ImportRepositoryBoundary,
} from '../account-imports/account-import.lifecycle.repository.prisma';
import {
  PreparationReconcilerRepository,
  type PreparationReconcilerRepository as PreparationRepositoryBoundary,
} from '../preparation/preparation-reconciler.repository.prisma';
import { LichessConnectionService } from '../../services/lichessConnectionService';
import {
  AccountGameDataLifecycleCoordinatorRepository,
  type AccountGameDataLifecycleCoordinatorRepository as AccountCoordinatorBoundary,
} from './data-lifecycle.coordinator.repository.prisma';
import {
  AccountGameDataLifecycleExecutionRepository,
  type AccountGameDataLifecycleExecutionRepository as AccountExecutionBoundary,
} from './data-lifecycle.account-game-execution.repository.prisma';
import {
  DataLifecycleRepository,
  type DataLifecycleRepository as LifecycleRepositoryBoundary,
  type StoredDataLifecycleOperation,
} from './data-lifecycle.repository.prisma';
import {
  UserDataLifecycleOperationRepository,
  type UserDataLifecycleOperationRepository as OperationRepositoryBoundary,
} from './data-lifecycle.user-operation.repository.prisma';
import {
  USER_RESIDUAL_PHASES,
  UserDataLifecycleRepository,
  type UserDataLifecycleRepository as UserRepositoryBoundary,
  type UserResidualPhase,
} from './data-lifecycle.user.repository.prisma';
import {
  DeletedIdentityLifecycleGuard,
  type DeletedIdentityGuard,
} from './deleted-identity.guard';
import { lockDataLifecycleUserScope } from './data-lifecycle.guard';
import type { AccountGameDataLifecycleWorkerConfig } from './data-lifecycle.account-game.worker.config';

export interface UserDataLifecycleWorkerLogger {
  info(context: Record<string, unknown>, message: string): void;
  warn(context: Record<string, unknown>, message: string): void;
  error(context: Record<string, unknown>, message: string): void;
}

interface LichessRevoker {
  revokeUpstreamForUser(userId: number): Promise<{ attempted: boolean; revoked: boolean }>;
}

export interface CreateUserDataLifecycleWorkerInput {
  lifecycleRepository?: LifecycleRepositoryBoundary;
  operationRepository?: OperationRepositoryBoundary;
  userRepository?: UserRepositoryBoundary;
  accountCoordinatorRepository?: AccountCoordinatorBoundary;
  accountExecutionRepository?: AccountExecutionBoundary;
  importRepository?: ImportRepositoryBoundary;
  preparationRepository?: PreparationRepositoryBoundary;
  deletedIdentityGuard?: DeletedIdentityGuard;
  lichessRevoker?: LichessRevoker;
  config: AccountGameDataLifecycleWorkerConfig;
  logger?: UserDataLifecycleWorkerLogger;
  now?: () => number;
}

export interface UserDataLifecycleWorker {
  run(): Promise<void>;
  runOnce(): Promise<boolean>;
  requestStop(): void;
}

type UserDeletionPhase =
  | 'PURGE_ACCOUNT_GAMES'
  | 'PURGE_ACCOUNT_FINALIZE'
  | 'DELETE_ACCOUNT'
  | UserResidualPhase
  | 'DELETE_APP_USER'
  | 'DONE';

interface UserDeletionCheckpoint {
  version: 1;
  phase: UserDeletionPhase;
  afterAccountId: number | null;
  accountId: number | null;
  afterGameId: number | null;
}

class EmptyResidualPhaseError extends Error {
  constructor() {
    super('Whole-user residual phase had no rows to delete.');
    this.name = 'EmptyResidualPhaseError';
  }
}

const consoleLogger: UserDataLifecycleWorkerLogger = {
  info(context, message) { console.info(message, context); },
  warn(context, message) { console.warn(message, context); },
  error(context, message) { console.error(message, context); },
};

export function createUserDataLifecycleWorker(
  input: CreateUserDataLifecycleWorkerInput,
): UserDataLifecycleWorker {
  const lifecycleRepository = input.lifecycleRepository ?? DataLifecycleRepository;
  const operationRepository = input.operationRepository ?? UserDataLifecycleOperationRepository;
  const userRepository = input.userRepository ?? UserDataLifecycleRepository;
  const accountCoordinatorRepository =
    input.accountCoordinatorRepository ?? AccountGameDataLifecycleCoordinatorRepository;
  const accountExecutionRepository =
    input.accountExecutionRepository ?? AccountGameDataLifecycleExecutionRepository;
  const importRepository = input.importRepository ?? AccountImportLifecycleRepository;
  const preparationRepository = input.preparationRepository ?? PreparationReconcilerRepository;
  const deletedIdentityGuard = input.deletedIdentityGuard ?? DeletedIdentityLifecycleGuard;
  const lichessRevoker = input.lichessRevoker ?? LichessConnectionService;
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

  async function runOnce(): Promise<boolean> {
    if (now() >= nextMaintenanceAt) {
      const recovered = await operationRepository.recoverStaleClaims(
        new Date(now() - input.config.staleAfterMs),
      );
      if (recovered > 0) {
        logger.warn({ recovered }, 'Recovered stale whole-user lifecycle claims');
      }
      nextMaintenanceAt = now() + input.config.staleRecoveryIntervalMs;
    }

    const workKey = `USER_DATA_LIFECYCLE:${randomUUID()}`;
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
            logger.warn({ operationId: operation.id }, 'Whole-user lifecycle heartbeat was rejected');
          }
        })
        .catch((error) => logger.warn(
          safeErrorContext(error, operation),
          'Whole-user lifecycle heartbeat failed',
        ));
    }, input.config.heartbeatIntervalMs);
    heartbeat.unref();

    try {
      await processClaim(operation, workKey);
    } catch (error) {
      try {
        if (await settleRequestedStop(operation, workKey)) return true;
      } catch (stopError) {
        logger.warn(
          safeErrorContext(stopError, operation),
          'Whole-user lifecycle stop could not settle because the claim changed',
        );
      }
      logger.error(safeErrorContext(error, operation), 'Whole-user lifecycle operation step failed');
      try {
        await lifecycleRepository.failClaimed(operation.id, workKey, errorCode(error));
      } catch (settleError) {
        logger.warn(
          safeErrorContext(settleError, operation),
          'Whole-user lifecycle failure could not settle because the claim changed',
        );
      }
    } finally {
      clearInterval(heartbeat);
      await heartbeatChain;
    }
    return true;
  }

  return {
    requestStop,
    runOnce,
    async run() {
      if (running) throw new Error('Whole-user lifecycle worker is already running.');
      running = true;
      logger.info({}, 'Whole-user data lifecycle worker started');
      try {
        while (!stopRequested) {
          let didWork = false;
          try {
            didWork = await runOnce();
          } catch (error) {
            logger.warn(safeErrorContext(error), 'Whole-user lifecycle worker iteration failed');
          }
          if (!didWork && !stopRequested) await waitForPoll(input.config.pollIntervalMs);
        }
      } finally {
        running = false;
        wakePoll = null;
        logger.info({}, 'Whole-user data lifecycle worker stopped');
      }
    },
  };

  async function processClaim(
    operation: StoredDataLifecycleOperation,
    workKey: string,
  ): Promise<void> {
    assertUserDeletion(operation);
    switch (operation.status) {
      case 'FENCING':
        await appendAuditOnce(operation, 'FENCE_INSTALLED');
        await processCancellation(operation, workKey);
        return;
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

  async function processCancellation(
    operation: StoredDataLifecycleOperation,
    workKey: string,
  ): Promise<void> {
    if (canCancelBeforeMutation(operation)) {
      await lifecycleRepository.completeCancellationBeforeMutation(operation.id, workKey);
      return;
    }

    const targets = await userRepository.listCancellationTargets(operation.targetUserId);
    for (const importRunId of targets.importRunIds) {
      await importRepository.requestCancel(operation.targetUserId, importRunId);
    }
    for (const preparationRunId of targets.preparationRunIds) {
      await preparationRepository.requestCancel(operation.targetUserId, preparationRunId);
    }
    await accountExecutionRepository.cancelScopedJobTasks(
      operation.targetUserId,
      targets.jobTaskIds,
    );

    if (
      targets.hasMore
      || targets.importRunIds.length > 0
      || targets.preparationRunIds.length > 0
      || targets.jobTaskIds.length > 0
    ) {
      await release(operation, workKey);
      return;
    }

    const next = await lifecycleRepository.advanceClaimed(
      operation.id,
      workKey,
      'WAITING_FOR_DRAIN',
    );
    await appendAudit(next, 'CANCELLATION_REQUESTED');
    await release(operation, workKey);
  }

  async function processDrain(
    operation: StoredDataLifecycleOperation,
    workKey: string,
  ): Promise<void> {
    if (canCancelBeforeMutation(operation)) {
      await lifecycleRepository.completeCancellationBeforeMutation(operation.id, workKey);
      return;
    }
    const snapshot = await userRepository.loadDrainSnapshot(operation.targetUserId);
    if (snapshot.legacyImportBlockers > 0) {
      throw new Error('DATA_LIFECYCLE_LEGACY_IMPORT_BLOCKED');
    }
    if (!snapshot.drained) {
      await release(operation, workKey);
      return;
    }
    const next = await lifecycleRepository.advanceClaimed(operation.id, workKey, 'EXECUTING');
    await appendAudit(next, 'DRAIN_CONFIRMED');
    await release(operation, workKey);
  }

  async function processExecution(
    operation: StoredDataLifecycleOperation,
    workKey: string,
  ): Promise<void> {
    if (
      operation.firstDestructiveCommitAt !== null
      && operation.stopRequest === 'STOP_AFTER_BATCH'
    ) {
      await lifecycleRepository.failClaimed(
        operation.id,
        workKey,
        'DATA_LIFECYCLE_STOPPED_AFTER_BATCH',
      );
      return;
    }
    if (canCancelBeforeMutation(operation)) {
      await lifecycleRepository.completeCancellationBeforeMutation(operation.id, workKey);
      return;
    }

    const checkpoint = parseCheckpoint(operation);
    if (
      checkpoint.phase === 'PURGE_ACCOUNT_GAMES'
      || checkpoint.phase === 'PURGE_ACCOUNT_FINALIZE'
      || checkpoint.phase === 'DELETE_ACCOUNT'
    ) {
      await processAccountPurge(operation, workKey, checkpoint);
      return;
    }

    if (isResidualPhase(checkpoint.phase)) {
      await processResidualPhase(operation, workKey, checkpoint);
      return;
    }

    if (checkpoint.phase === 'DELETE_APP_USER') {
      await deleteAppUser(operation, workKey, checkpoint);
      return;
    }

    if (checkpoint.phase === 'DONE') {
      await appendAuditOnce(operation, 'DELETED_IDENTITY_TOMBSTONED');
      await moveToVerify(operation, workKey);
      return;
    }

    throw new Error('Invalid whole-user lifecycle checkpoint.');
  }

  async function processAccountPurge(
    operation: StoredDataLifecycleOperation,
    workKey: string,
    checkpoint: UserDeletionCheckpoint,
  ): Promise<void> {
    let accountId = checkpoint.accountId;
    if (checkpoint.phase === 'PURGE_ACCOUNT_GAMES' && accountId === null) {
      accountId = await userRepository.nextAccountId(
        operation.targetUserId,
        checkpoint.afterAccountId,
      );
      if (accountId === null) {
        await lifecycleRepository.updateCheckpoint(
          operation.id,
          workKey,
          residualCheckpoint(USER_RESIDUAL_PHASES[0]!),
        );
        await release(operation, workKey);
        return;
      }
      await lifecycleRepository.updateCheckpoint(operation.id, workKey, {
        ...checkpoint,
        accountId,
        afterGameId: null,
      });
      await release(operation, workKey);
      return;
    }
    if (accountId === null) throw new Error('Whole-user account purge lost its account id.');

    const scope = {
      resourceType: 'ACCOUNT' as const,
      userId: operation.targetUserId,
      accountId,
    };

    if (checkpoint.phase === 'PURGE_ACCOUNT_GAMES') {
      const gameIds = await accountCoordinatorRepository.nextGameBatch(
        scope,
        checkpoint.afterGameId,
        input.config.gameBatchLimit,
      );
      if (gameIds.length === 0) {
        await lifecycleRepository.updateCheckpoint(operation.id, workKey, {
          ...checkpoint,
          phase: 'PURGE_ACCOUNT_FINALIZE',
          afterGameId: null,
        });
        await release(operation, workKey);
        return;
      }
      await runDestructiveBatch(
        operation,
        workKey,
        {
          ...checkpoint,
          afterGameId: lastId(gameIds),
        },
        (transaction) => accountExecutionRepository.purgeAccountGameBatch(
          transaction,
          scope,
          gameIds,
        ),
      );
      await release(operation, workKey);
      return;
    }

    if (checkpoint.phase === 'PURGE_ACCOUNT_FINALIZE') {
      await runDestructiveBatch(
        operation,
        workKey,
        { ...checkpoint, phase: 'DELETE_ACCOUNT' },
        (transaction) => accountExecutionRepository.finalizeAccountPurge(transaction, scope),
      );
      await release(operation, workKey);
      return;
    }

    if (checkpoint.phase === 'DELETE_ACCOUNT') {
      await runDestructiveBatch(
        operation,
        workKey,
        accountPurgeCheckpoint(accountId),
        (transaction) => accountExecutionRepository.deleteExternalAccount(transaction, scope),
      );
      await release(operation, workKey);
      return;
    }

    throw new Error('Invalid whole-user account purge phase.');
  }

  async function processResidualPhase(
    operation: StoredDataLifecycleOperation,
    workKey: string,
    checkpoint: UserDeletionCheckpoint,
  ): Promise<void> {
    const phase = checkpoint.phase as UserResidualPhase;
    if (phase === 'LICHESS_CONNECTION') {
      const alreadyAttempted = await operationRepository.hasAuditEvent(
        operation.id,
        'PROVIDER_CREDENTIAL_REVOKED',
      ) || await operationRepository.hasAuditEvent(
        operation.id,
        'PROVIDER_CREDENTIAL_REVOKE_BEST_EFFORT',
      );
      if (!alreadyAttempted) {
        const revocation = await lichessRevoker.revokeUpstreamForUser(operation.targetUserId);
        logger.info(
          { operationId: operation.id, attempted: revocation.attempted, revoked: revocation.revoked },
          'Whole-user lifecycle completed best-effort upstream credential revocation',
        );
        await appendAuditOnce(operation, revocation.revoked
          ? 'PROVIDER_CREDENTIAL_REVOKED'
          : 'PROVIDER_CREDENTIAL_REVOKE_BEST_EFFORT');
      }
    }

    let deleted = 0;
    try {
      await runDestructiveBatch(
        operation,
        workKey,
        checkpoint,
        async (transaction) => {
          deleted = await userRepository.deleteResidualBatch(
            transaction,
            operation.targetUserId,
            phase,
            input.config.gameBatchLimit,
          );
          if (deleted === 0) throw new EmptyResidualPhaseError();
        },
      );
    } catch (error) {
      if (!(error instanceof EmptyResidualPhaseError)) throw error;
    }

    if (deleted > 0) {
      await release(operation, workKey);
      return;
    }

    const index = USER_RESIDUAL_PHASES.indexOf(phase);
    const nextPhase = USER_RESIDUAL_PHASES[index + 1];
    await lifecycleRepository.updateCheckpoint(
      operation.id,
      workKey,
      nextPhase ? residualCheckpoint(nextPhase) : finalDeleteCheckpoint(),
    );
    await release(operation, workKey);
  }

  async function deleteAppUser(
    operation: StoredDataLifecycleOperation,
    workKey: string,
    checkpoint: UserDeletionCheckpoint,
  ): Promise<void> {
    await lifecycleRepository.runDestructiveTransaction({
      operationId: operation.id,
      targetUserId: operation.targetUserId,
      workKey,
      checkpoint: { ...checkpoint, phase: 'DONE' },
      beforeUserLock: async (transaction) => {
        const identity = await userRepository.getIdentity(transaction, operation.targetUserId);
        await deletedIdentityGuard.createTombstone(transaction, {
          provider: identity.provider,
          externalSubject: identity.externalSubject,
          operationId: operation.id,
        });
      },
    }, async (transaction) => {
      await assertDestructiveStepAllowed(transaction, operation, workKey);
      await transaction.oAuthLoginState.deleteMany({
        where: { userId: operation.targetUserId },
      });
      const deleted = await transaction.appUser.deleteMany({
        where: { id: operation.targetUserId },
      });
      if (deleted.count !== 1) {
        throw new Error('DATA_LIFECYCLE_OWNERSHIP_CHANGED');
      }
    });
    await appendAuditOnce(operation, 'DELETED_IDENTITY_TOMBSTONED');
    await release(operation, workKey);
  }

  async function processVerification(
    operation: StoredDataLifecycleOperation,
    workKey: string,
  ): Promise<void> {
    const verification = await userRepository.verifyDeleted(operation.targetUserId);
    if (!verification.ok) {
      await lifecycleRepository.failClaimed(
        operation.id,
        workKey,
        'DATA_LIFECYCLE_VERIFICATION_FAILED',
      );
      return;
    }
    await lifecycleRepository.completeVerified(operation.id, workKey, verification);
  }

  async function moveToVerify(
    operation: StoredDataLifecycleOperation,
    workKey: string,
  ): Promise<void> {
    const next = await lifecycleRepository.advanceClaimed(operation.id, workKey, 'VERIFYING');
    await appendAudit(next, 'DESTRUCTIVE_PHASES_COMPLETED');
    await release(operation, workKey);
  }

  async function runDestructiveBatch(
    operation: StoredDataLifecycleOperation,
    workKey: string,
    checkpoint: UserDeletionCheckpoint,
    work: (transaction: Prisma.TransactionClient) => Promise<unknown>,
  ): Promise<void> {
    await lifecycleRepository.runDestructiveTransaction({
      operationId: operation.id,
      targetUserId: operation.targetUserId,
      workKey,
      checkpoint,
      beforeUserLock: async (transaction) => {
        await lockDataLifecycleUserScope(transaction, operation.targetUserId);
        await assertDestructiveStepAllowed(transaction, operation, workKey);
      },
    }, work);
  }

  async function settleRequestedStop(
    operation: StoredDataLifecycleOperation,
    workKey: string,
  ): Promise<boolean> {
    const current = await lifecycleRepository.getForTargetUser(
      operation.targetUserId,
      operation.id,
    );
    if (!current || current.workKey !== workKey) return false;

    if (
      current.stopRequest === 'CANCEL'
      && current.firstDestructiveCommitAt === null
      && current.status === 'CANCEL_REQUESTED'
    ) {
      await lifecycleRepository.completeCancellationBeforeMutation(operation.id, workKey);
      return true;
    }
    if (
      current.stopRequest === 'STOP_AFTER_BATCH'
      && current.firstDestructiveCommitAt !== null
    ) {
      await lifecycleRepository.failClaimed(
        operation.id,
        workKey,
        'DATA_LIFECYCLE_STOPPED_AFTER_BATCH',
      );
      return true;
    }
    return false;
  }

  async function release(operation: StoredDataLifecycleOperation, workKey: string) {
    await operationRepository.releaseClaim(operation.id, workKey);
  }

  async function appendAuditOnce(
    operation: StoredDataLifecycleOperation,
    eventType: string,
  ) {
    if (await operationRepository.hasAuditEvent(operation.id, eventType)) return;
    await appendAudit(operation, eventType);
  }

  async function appendAudit(
    operation: StoredDataLifecycleOperation,
    eventType: string,
  ) {
    await lifecycleRepository.appendAudit({
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

async function assertDestructiveStepAllowed(
  transaction: Prisma.TransactionClient,
  operation: StoredDataLifecycleOperation,
  workKey: string,
): Promise<void> {
  const current = await transaction.dataLifecycleOperation.findUnique({
    where: { id: operation.id },
    select: {
      targetUserId: true,
      status: true,
      workKey: true,
      stopRequest: true,
      firstDestructiveCommitAt: true,
    },
  });
  if (
    !current
    || current.targetUserId !== operation.targetUserId
    || current.workKey !== workKey
    || current.status !== 'EXECUTING'
  ) {
    throw new Error('DATA_LIFECYCLE_CLAIM_LOST');
  }
  if (current.stopRequest === 'CANCEL' && current.firstDestructiveCommitAt === null) {
    throw new Error('DATA_LIFECYCLE_CANCEL_REQUESTED');
  }
  if (
    current.stopRequest === 'STOP_AFTER_BATCH'
    && current.firstDestructiveCommitAt !== null
  ) {
    throw new Error('DATA_LIFECYCLE_STOPPED_AFTER_BATCH');
  }
}

function canCancelBeforeMutation(operation: StoredDataLifecycleOperation): boolean {
  return operation.stopRequest === 'CANCEL' && operation.firstDestructiveCommitAt === null;
}

function assertUserDeletion(operation: StoredDataLifecycleOperation): void {
  if (
    operation.action !== 'DELETE_APP_USER'
    || operation.scope.resourceType !== 'USER'
    || operation.scope.userId !== operation.targetUserId
  ) {
    throw new Error('Whole-user lifecycle worker claimed an invalid operation.');
  }
}

function parseCheckpoint(operation: StoredDataLifecycleOperation): UserDeletionCheckpoint {
  if (operation.checkpoint === null || operation.checkpoint === undefined) {
    return {
      version: 1,
      phase: 'PURGE_ACCOUNT_GAMES',
      afterAccountId: null,
      accountId: null,
      afterGameId: null,
    };
  }
  const checkpoint = operation.checkpoint as Partial<UserDeletionCheckpoint>;
  const phases: readonly string[] = [
    'PURGE_ACCOUNT_GAMES',
    'PURGE_ACCOUNT_FINALIZE',
    'DELETE_ACCOUNT',
    ...USER_RESIDUAL_PHASES,
    'DELETE_APP_USER',
    'DONE',
  ];
  const validId = (value: unknown) =>
    value === null || (Number.isSafeInteger(value) && Number(value) > 0);
  if (
    checkpoint.version !== 1
    || typeof checkpoint.phase !== 'string'
    || !phases.includes(checkpoint.phase)
    || !validId(checkpoint.afterAccountId)
    || !validId(checkpoint.accountId)
    || !validId(checkpoint.afterGameId)
  ) {
    throw new Error('Invalid whole-user lifecycle checkpoint.');
  }
  return checkpoint as UserDeletionCheckpoint;
}

function accountPurgeCheckpoint(afterAccountId: number | null): UserDeletionCheckpoint {
  return {
    version: 1,
    phase: 'PURGE_ACCOUNT_GAMES',
    afterAccountId,
    accountId: null,
    afterGameId: null,
  };
}

function residualCheckpoint(phase: UserResidualPhase): UserDeletionCheckpoint {
  return {
    version: 1,
    phase,
    afterAccountId: null,
    accountId: null,
    afterGameId: null,
  };
}

function finalDeleteCheckpoint(): UserDeletionCheckpoint {
  return {
    version: 1,
    phase: 'DELETE_APP_USER',
    afterAccountId: null,
    accountId: null,
    afterGameId: null,
  };
}

function isResidualPhase(phase: UserDeletionPhase): phase is UserResidualPhase {
  return USER_RESIDUAL_PHASES.includes(phase as UserResidualPhase);
}

function lastId(ids: number[]): number {
  const value = ids.at(-1);
  if (!value) throw new Error('Lifecycle batch unexpectedly had no final id.');
  return value;
}

function errorCode(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error && typeof error.code === 'string') {
    return error.code;
  }
  if (error instanceof Error && /^[A-Z0-9_:-]{1,120}$/.test(error.message)) {
    return error.message;
  }
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
