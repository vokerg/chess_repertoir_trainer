import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import type { PositionCleanupConfig } from './position-cleanup.config';
import {
  PositionCleanupInvalidStateError,
  PositionCleanupRepository,
  type PositionCleanupRepository as PositionCleanupRepositoryBoundary,
} from './position-cleanup.repository.prisma';
import type { PositionCleanupRun } from './position-cleanup.types';

const MAX_LOCK_TIMEOUT_RETRIES = 3;

export interface PositionCleanupWorkerLogger {
  info(context: Record<string, unknown>, message: string): void;
  warn(context: Record<string, unknown>, message: string): void;
  error(context: Record<string, unknown>, message: string): void;
}

export interface PositionCleanupWorker {
  run(): Promise<void>;
  runOnce(): Promise<boolean>;
  requestStop(): void;
}

const consoleLogger: PositionCleanupWorkerLogger = {
  info(context, message) { console.info(message, context); },
  warn(context, message) { console.warn(message, context); },
  error(context, message) { console.error(message, context); },
};

export function createPositionCleanupWorker(input: {
  config: PositionCleanupConfig;
  repository?: PositionCleanupRepositoryBoundary;
  logger?: PositionCleanupWorkerLogger;
  now?: () => number;
}): PositionCleanupWorker {
  const repository = input.repository ?? PositionCleanupRepository;
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
      const recovered = await repository.recoverStaleClaims(new Date(now() - input.config.staleAfterMs));
      if (recovered > 0) logger.warn({ recovered }, 'Recovered stale position cleanup claims');
      nextMaintenanceAt = now() + input.config.staleRecoveryIntervalMs;
    }

    const workKey = `POSITION_CLEANUP:${randomUUID()}`;
    const run = await repository.claimNext(workKey);
    if (!run) return false;
    if (stopRequested) {
      await repository.releaseClaim(run.id, workKey);
      return false;
    }

    if (run.cancelRequestedAt !== null) {
      await repository.settleCancellation(run.id, workKey);
      return true;
    }

    let heartbeatChain = Promise.resolve();
    const heartbeat = setInterval(() => {
      heartbeatChain = heartbeatChain
        .then(async () => {
          const retained = await repository.heartbeat(run.id, workKey);
          if (!retained) logger.warn({ runId: run.id }, 'Position cleanup heartbeat was rejected');
        })
        .catch((error) => logger.warn(safeContext(error, run), 'Position cleanup heartbeat failed'));
    }, input.config.heartbeatIntervalMs);
    heartbeat.unref();

    try {
      await processClaim(run, workKey);
      await repository.releaseClaim(run.id, workKey);
    } catch (error) {
      if (isLockTimeout(error)) {
        logger.warn(safeContext(error, run), 'Position cleanup delete batch hit lock timeout');
        await repository.recordLockTimeout(run.id, workKey, MAX_LOCK_TIMEOUT_RETRIES);
      } else if (await settleCancellationRace(run.id, workKey)) {
        logger.info({ runId: run.id }, 'Position cleanup cancellation settled between batches');
      } else {
        logger.error(safeContext(error, run), 'Position cleanup iteration failed');
        try {
          await repository.failClaimed(run.id, workKey, errorCode(error));
        } catch (settleError) {
          logger.warn(safeContext(settleError, run), 'Position cleanup failure lost its work-key fence');
        }
      }
    } finally {
      clearInterval(heartbeat);
      await heartbeatChain;
    }
    return true;
  };

  return {
    requestStop,
    runOnce,
    async run() {
      if (!input.config.enabled) {
        logger.info({}, 'Position cleanup worker disabled by configuration');
        return;
      }
      if (running) throw new Error('Position cleanup worker is already running.');
      running = true;
      logger.info({}, 'Position cleanup worker started');
      try {
        while (!stopRequested) {
          let didWork = false;
          try {
            didWork = await runOnce();
          } catch (error) {
            logger.warn(safeContext(error), 'Position cleanup worker iteration failed before claim settlement');
          }
          if (!didWork && !stopRequested) await waitForPoll(input.config.pollIntervalMs);
        }
      } finally {
        running = false;
        wakePoll = null;
        logger.info({}, 'Position cleanup worker stopped');
      }
    },
  };

  async function processClaim(run: PositionCleanupRun, workKey: string): Promise<void> {
    switch (run.phase) {
      case 'RECONCILE':
        await repository.reconcileBatch(run.id, workKey);
        return;
      case 'OBSERVE':
        await repository.observeBatch(run.id, workKey);
        return;
      case 'EVALUATE':
        if (run.mode === 'DRY_RUN') await repository.evaluateDryRunBatch(run.id, workKey);
        else await repository.executeDeleteBatch(run.id, workKey);
        return;
      case 'DONE':
        await repository.releaseClaim(run.id, workKey);
        return;
    }
  }

  async function settleCancellationRace(runId: number, workKey: string): Promise<boolean> {
    const current = await repository.getRun(runId);
    if (
      current?.status === 'RUNNING'
      && current.workKey === workKey
      && current.cancelRequestedAt !== null
    ) {
      return repository.settleCancellation(runId, workKey);
    }
    return false;
  }

  function waitForPoll(delayMs: number): Promise<void> {
    return new Promise((resolve) => {
      let wake: () => void;
      const timer = setTimeout(() => {
        if (wakePoll === wake) wakePoll = null;
        resolve();
      }, delayMs);
      timer.unref();
      wake = () => {
        clearTimeout(timer);
        if (wakePoll === wake) wakePoll = null;
        resolve();
      };
      wakePoll = wake;
    });
  }
}

function isLockTimeout(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
  if (error.code !== 'P2010') return false;
  const meta = error.meta as Record<string, unknown> | undefined;
  return meta?.['code'] === '55P03';
}

function errorCode(error: unknown): string {
  if (error instanceof PositionCleanupInvalidStateError) return 'POSITION_CLEANUP_INVALID_STATE';
  if (error instanceof Prisma.PrismaClientKnownRequestError) return `POSITION_CLEANUP_PRISMA_${error.code}`;
  return 'POSITION_CLEANUP_WORKER_FAILED';
}

function safeContext(error: unknown, run?: PositionCleanupRun): Record<string, unknown> {
  return {
    ...(run ? { runId: run.id, mode: run.mode, phase: run.phase } : {}),
    errorName: error instanceof Error ? error.name : typeof error,
    errorCode: errorCode(error),
  };
}
