import {
  AccountImportIncompleteCoverageError,
  type AccountImportLifecycleRepository,
} from './account-import.lifecycle.repository.prisma';
import type { AccountImportWorkerConfig } from './account-import.worker.config';
import type {
  AccountImportExecutionResult,
  AccountImportExecutionStage,
  AccountImportExecutorRegistry,
} from './account-import.executor';
import type { StoredAccountImportRun } from './account-import.types';

export interface AccountImportWorkerLogger {
  info(context: Record<string, unknown>, message: string): void;
  warn(context: Record<string, unknown>, message: string): void;
  error(context: Record<string, unknown>, message: string): void;
}

export interface CreateAccountImportWorkerInput {
  repository: AccountImportLifecycleRepository;
  executors: AccountImportExecutorRegistry;
  config: AccountImportWorkerConfig;
  logger?: AccountImportWorkerLogger;
  now?: () => number;
}

export interface AccountImportWorker {
  run(): Promise<void>;
  requestStop(reason?: string): void;
}

type ClaimedRun = StoredAccountImportRun & { workKey: string };
type ExecutionOutcome =
  | { ok: true; result: AccountImportExecutionResult }
  | { ok: false; error: unknown };

class AccountImportControlRequestedError extends Error {
  constructor(readonly status: 'PAUSE_REQUESTED' | 'CANCEL_REQUESTED') {
    super(`Account import control requested: ${status}.`);
    this.name = 'AccountImportControlRequestedError';
  }
}

class AccountImportClaimLostError extends Error {
  constructor() {
    super('Account import worker claim was lost.');
    this.name = 'AccountImportClaimLostError';
  }
}

const consoleLogger: AccountImportWorkerLogger = {
  info(context, message) {
    console.info(message, context);
  },
  warn(context, message) {
    console.warn(message, context);
  },
  error(context, message) {
    console.error(message, context);
  },
};

export function createAccountImportWorker(input: CreateAccountImportWorkerInput): AccountImportWorker {
  const logger = input.logger ?? consoleLogger;
  const now = input.now ?? Date.now;
  let running = false;
  let stopRequested = false;
  let activeController: AbortController | null = null;
  let wakePoll: (() => void) | null = null;
  let loggedEmptyRegistry = false;
  let backlogAboveThresholdSince: number | null = null;
  let lastBacklogWarningAt = 0;

  const requestStop = (reason = 'Account import worker shutdown requested') => {
    stopRequested = true;
    activeController?.abort(new Error(reason));
    wakePoll?.();
  };

  return {
    requestStop,

    async run() {
      if (running) throw new Error('Account import worker is already running.');
      running = true;
      let nextMaintenanceAt = 0;
      logger.info({}, 'Account import worker started');

      try {
        while (!stopRequested) {
          if (now() >= nextMaintenanceAt) {
            try {
              await runMaintenance();
            } catch (error) {
              logger.warn(safeErrorContext(error), 'Account import worker maintenance failed');
            }
            nextMaintenanceAt = now() + input.config.staleRecoveryIntervalMs;
            if (stopRequested) break;
          }

          const supportedProviders = input.executors.supportedProviders();
          if (supportedProviders.length === 0) {
            if (!loggedEmptyRegistry) {
              loggedEmptyRegistry = true;
              logger.info({}, 'No account import provider executors are registered; worker is idle');
            }
            await waitForPoll(input.config.pollIntervalMs);
            continue;
          }
          loggedEmptyRegistry = false;

          let claimed: ClaimedRun | null = null;
          try {
            claimed = await input.repository.claimNextRun(supportedProviders);
          } catch (error) {
            logger.warn(safeErrorContext(error), 'Account import claim attempt failed');
            await waitForPoll(input.config.pollIntervalMs);
            continue;
          }

          if (!claimed) {
            await waitForPoll(input.config.pollIntervalMs);
            continue;
          }

          logger.info(
            {
              importRunId: claimed.id,
              provider: claimed.provider,
              queueWaitMs: Math.max(0, now() - claimed.createdAt.getTime()),
            },
            'Account import run claimed',
          );

          if (stopRequested) {
            await releaseDuringShutdown(claimed);
            break;
          }

          await executeClaimedRun(claimed);
        }
      } finally {
        activeController = null;
        running = false;
        logger.info({}, 'Account import worker stopped');
      }
    },
  };

  async function executeClaimedRun(run: ClaimedRun): Promise<void> {
    const executor = input.executors.get(run.provider);
    if (!executor) {
      await input.repository.releaseRun(run.id, run.workKey);
      logger.warn(
        { importRunId: run.id, provider: run.provider },
        'Account import run was released because its executor disappeared',
      );
      return;
    }

    const controller = new AbortController();
    activeController = controller;
    const executionStartedAt = now();
    let claimLost = false;
    let requestedControl: 'PAUSE_REQUESTED' | 'CANCEL_REQUESTED' | null = null;
    let controlObservedAt: number | null = null;
    let heartbeatChain = Promise.resolve();

    const heartbeat = setInterval(() => {
      heartbeatChain = heartbeatChain
        .then(async () => {
          const heartbeatStartedAt = now();
          const status = await input.repository.heartbeatRun(run.id, run.workKey);
          recordTiming(run, 'HEARTBEAT', heartbeatStartedAt);
          if (status === null) {
            claimLost = true;
            controller.abort(new AccountImportClaimLostError());
            return;
          }
          if (status === 'PAUSE_REQUESTED' || status === 'CANCEL_REQUESTED') {
            requestedControl = status;
            controlObservedAt ??= now();
            controller.abort(new AccountImportControlRequestedError(status));
          }
        })
        .catch((error) => {
          logger.warn(
            { ...safeErrorContext(error), importRunId: run.id },
            'Account import heartbeat failed',
          );
        });
    }, input.config.heartbeatIntervalMs);
    heartbeat.unref();

    let outcome: ExecutionOutcome;
    try {
      const result = await executor.execute(run, {
        signal: controller.signal,
        checkpoint: async (checkpoint) => {
          if (controller.signal.aborted) {
            throw controller.signal.reason instanceof Error
              ? controller.signal.reason
              : new Error('Account import execution was aborted.');
          }
          const checkpointStartedAt = now();
          const retained = await input.repository.checkpointRun(run.id, run.workKey, checkpoint);
          recordTiming(run, 'CHECKPOINT', checkpointStartedAt);
          if (!retained) {
            claimLost = true;
            const error = new AccountImportClaimLostError();
            controller.abort(error);
            throw error;
          }
        },
        recordStageTiming: (stage, durationMs) => {
          validateDuration(durationMs);
          logger.info(
            { importRunId: run.id, provider: run.provider, stage, durationMs },
            'Account import stage timing',
          );
        },
      });
      outcome = { ok: true, result };
    } catch (error) {
      outcome = { ok: false, error };
    } finally {
      clearInterval(heartbeat);
      await heartbeatChain;
      logger.info(
        {
          importRunId: run.id,
          provider: run.provider,
          stage: 'TOTAL',
          durationMs: Math.max(0, now() - executionStartedAt),
        },
        'Account import stage timing',
      );
    }

    try {
      if (requestedControl !== null) {
        await acknowledgeControl(run, requestedControl, controlObservedAt);
        return;
      }

      if (claimLost) {
        await input.repository.acknowledgeRequestedControl(run.id, run.workKey).catch(() => null);
        logger.warn(
          { importRunId: run.id, provider: run.provider },
          'Account import executor stopped after losing its claim',
        );
        return;
      }

      if (stopRequested || controller.signal.aborted) {
        await releaseDuringShutdown(run);
        return;
      }

      if (!outcome.ok) {
        const settled = await input.repository.failRun(
          run.id,
          run.workKey,
          'EXECUTION_FAILED',
          'Account import execution failed unexpectedly.',
        );
        if (!settled) await settleLostOrControlled(run);
        logger.error(
          {
            ...safeErrorContext(outcome.error),
            importRunId: run.id,
            provider: run.provider,
            settled,
          },
          'Account import execution failed',
        );
        return;
      }

      if (outcome.result.kind === 'RETRY_AT') {
        const current = now();
        logger.info(
          {
            importRunId: run.id,
            provider: run.provider,
            retryDelayMs: Math.max(0, outcome.result.retryAt.getTime() - current),
            rateLimitDelayMs: outcome.result.rateLimitUntil
              ? Math.max(0, outcome.result.rateLimitUntil.getTime() - current)
              : null,
          },
          'Account import retry timing',
        );
        const deferred = await input.repository.deferRun({
          importRunId: run.id,
          workKey: run.workKey,
          retryAt: outcome.result.retryAt,
          rateLimitUntil: outcome.result.rateLimitUntil,
          errorCode: outcome.result.errorCode ?? 'PROVIDER_RETRY',
          error: outcome.result.safeError ?? null,
        });
        if (!deferred) await settleLostOrControlled(run);
        return;
      }

      try {
        const completed = await input.repository.completeRun(run.id, run.workKey);
        if (!completed) await settleLostOrControlled(run);
      } catch (error) {
        if (error instanceof AccountImportIncompleteCoverageError) {
          const failed = await input.repository.failRun(
            run.id,
            run.workKey,
            'INCOMPLETE_COVERAGE',
            error.message,
          );
          if (!failed) await settleLostOrControlled(run);
          logger.error(
            { importRunId: run.id, provider: run.provider },
            'Account import executor reported completion without exact requested coverage',
          );
          return;
        }
        throw error;
      }
    } catch (error) {
      logger.error(
        {
          ...safeErrorContext(error),
          importRunId: run.id,
          provider: run.provider,
        },
        'Could not persist account import settlement; claim remains for stale recovery',
      );
    } finally {
      if (activeController === controller) activeController = null;
    }
  }

  async function acknowledgeControl(
    run: ClaimedRun,
    expectedStatus: 'PAUSE_REQUESTED' | 'CANCEL_REQUESTED',
    observedAt: number | null,
  ): Promise<void> {
    const acknowledged = await input.repository.acknowledgeRequestedControl(run.id, run.workKey);
    const expectedAcknowledgedStatus = expectedStatus === 'PAUSE_REQUESTED' ? 'PAUSED' : 'CANCELLED';
    if (acknowledged !== expectedAcknowledgedStatus && acknowledged !== null) {
      logger.warn(
        { importRunId: run.id, expectedStatus, acknowledgedStatus: acknowledged },
        'Account import control settled to an unexpected state',
      );
    }
    logger.info(
      {
        importRunId: run.id,
        requestedStatus: expectedStatus,
        acknowledgedStatus: acknowledged,
        controlQuiescenceMs: observedAt === null ? null : Math.max(0, now() - observedAt),
      },
      'Account import control request acknowledged after executor quiescence',
    );
  }

  async function settleLostOrControlled(run: ClaimedRun): Promise<void> {
    const status = await input.repository.acknowledgeRequestedControl(run.id, run.workKey);
    if (status !== null) {
      logger.info(
        { importRunId: run.id, status },
        'Account import control request acknowledged instead of stale executor settlement',
      );
      return;
    }
    logger.warn(
      { importRunId: run.id },
      'Account import result was rejected because the exact claim no longer owns the run',
    );
  }

  async function releaseDuringShutdown(run: ClaimedRun): Promise<void> {
    try {
      const released = await input.repository.releaseRun(run.id, run.workKey);
      logger.info(
        { importRunId: run.id, released },
        'Account import claim released during worker shutdown',
      );
    } catch (error) {
      logger.error(
        { ...safeErrorContext(error), importRunId: run.id },
        'Account import claim could not be released during shutdown; stale recovery will fence it',
      );
    }
  }

  async function runMaintenance(): Promise<void> {
    const current = now();
    const staleBefore = new Date(current - input.config.staleAfterMs);
    const [recovered, queue] = await Promise.all([
      input.repository.recoverStaleClaims(staleBefore),
      input.repository.getQueueStats(),
    ]);

    if (recovered > 0) {
      logger.info({ recoveredStaleImports: recovered }, 'Account import stale-claim recovery completed');
    }

    const oldestQueueAgeMs = queue.oldestQueuedAt === null
      ? 0
      : Math.max(0, current - queue.oldestQueuedAt.getTime());
    const aboveCountThreshold = queue.queuedCount > input.config.backlogRunThreshold;
    if (aboveCountThreshold) {
      backlogAboveThresholdSince ??= current;
    } else {
      backlogAboveThresholdSince = null;
    }

    const countSustained = backlogAboveThresholdSince !== null
      && current - backlogAboveThresholdSince >= input.config.backlogSustainedMs;
    const ageExceeded = oldestQueueAgeMs > input.config.backlogAgeMs;
    if (
      (countSustained || ageExceeded)
      && current - lastBacklogWarningAt >= input.config.staleRecoveryIntervalMs
    ) {
      lastBacklogWarningAt = current;
      logger.warn(
        {
          queuedRuns: queue.queuedCount,
          oldestQueueAgeMs,
          countSustained,
          ageExceeded,
        },
        'Account import backlog threshold exceeded',
      );
    }
  }

  function recordTiming(
    run: ClaimedRun,
    stage: 'HEARTBEAT' | 'CHECKPOINT',
    startedAt: number,
  ): void {
    logger.info(
      {
        importRunId: run.id,
        provider: run.provider,
        stage,
        durationMs: Math.max(0, now() - startedAt),
      },
      'Account import stage timing',
    );
  }

  function waitForPoll(delayMs: number): Promise<void> {
    if (stopRequested) return Promise.resolve();
    return new Promise((resolve) => {
      let timer: NodeJS.Timeout;
      const wake = () => {
        clearTimeout(timer);
        if (wakePoll === wake) wakePoll = null;
        resolve();
      };
      timer = setTimeout(wake, delayMs);
      wakePoll = wake;
    });
  }
}

function validateDuration(durationMs: number): void {
  if (!Number.isFinite(durationMs) || durationMs < 0) {
    throw new Error('Account import stage duration must be a non-negative finite number.');
  }
}

function safeErrorContext(error: unknown): Record<string, unknown> {
  if (!(error instanceof Error)) {
    return { errorType: typeof error };
  }
  const code = (error as Error & { code?: unknown }).code;
  return {
    errorType: error.name,
    ...(typeof code === 'string' ? { errorCode: code } : {}),
  };
}
