import 'dotenv/config';
import prisma from './prisma';
import { defaultAccountImportExecutorRegistry } from './modules/account-imports/account-import.executor';
import { AccountImportLifecycleRepository } from './modules/account-imports/account-import.lifecycle.repository.prisma';
import { drainAccountImportPostCompletion } from './modules/account-imports/account-import.post-completion-drain';
import { AccountImportPostCompletionService } from './modules/account-imports/account-import.post-completion.service';
import { loadAccountImportWorkerConfig } from './modules/account-imports/account-import.worker.config';
import { createAccountImportWorker } from './modules/account-imports/account-import.worker.service';
import {
  ChessComAccountImportExecutor,
} from './modules/account-imports/providers/chess-com/chess-com-account-import.executor';
import {
  createLichessAccountImportExecutor,
} from './modules/account-imports/providers/lichess/lichess-account-import.executor';
import { loadAccountGameDataLifecycleWorkerConfig } from './modules/data-lifecycle/data-lifecycle.account-game.worker.config';
import { createAccountGameDataLifecycleWorker } from './modules/data-lifecycle/data-lifecycle.account-game.worker.service';
import { defaultJobTaskExecutorRegistry } from './modules/jobs/imported-game-job-executors';
import { JobRunRepository } from './modules/jobs/job-run.repository.prisma';
import { loadJobWorkerConfig } from './modules/jobs/job-worker.config';
import { JobWorkerRepository } from './modules/jobs/job-worker.repository.prisma';
import { settlesWithin } from './modules/jobs/job-worker-shutdown';
import { createJobWorker } from './modules/jobs/job-worker.service';
import { AccountImportPreparationHandoffRepository } from './modules/preparation/account-import-preparation-handoff.repository.prisma';
import { readPreparationConfig } from './modules/preparation/preparation.config';
import { createPreparationReconciler } from './modules/preparation/preparation-reconciler.service';

const DAY_MS = 24 * 60 * 60_000;
const TERMINAL_RETENTION_INTERVAL_MS = 60 * 60_000;

defaultAccountImportExecutorRegistry.register(ChessComAccountImportExecutor);
defaultAccountImportExecutorRegistry.register(createLichessAccountImportExecutor());

async function bootstrap() {
  const config = loadJobWorkerConfig();
  const accountImportConfig = loadAccountImportWorkerConfig();
  const lifecycleConfig = loadAccountGameDataLifecycleWorkerConfig();
  const preparationConfig = readPreparationConfig();
  const shutdownTimeoutMs = Math.max(
    config.shutdownTimeoutMs,
    accountImportConfig.shutdownTimeoutMs,
    lifecycleConfig.shutdownTimeoutMs,
  );
  const worker = createJobWorker({
    repository: JobWorkerRepository,
    executors: defaultJobTaskExecutorRegistry,
    config,
  });
  const accountImportWorker = createAccountImportWorker({
    repository: AccountImportLifecycleRepository,
    executors: defaultAccountImportExecutorRegistry,
    config: accountImportConfig,
    reconcilePreparationHandoff: () => AccountImportPreparationHandoffRepository.reconcileNext(),
    reconcilePostCompletion: async () => (
      await drainAccountImportPostCompletion(
        () => AccountImportPostCompletionService.reconcileNext(),
      )
    ) > 0,
  });
  const preparationWorker = createPreparationReconciler({ config: preparationConfig });
  const lifecycleWorker = createAccountGameDataLifecycleWorker({ config: lifecycleConfig });
  let shuttingDown = false;
  let retentionTimer: NodeJS.Timeout | undefined;
  let retentionInFlight: Promise<void> | null = null;
  let resolveCleanupCompleted: (() => void) | undefined;
  const cleanupCompleted = new Promise<void>((resolve) => {
    resolveCleanupCompleted = resolve;
  });

  const runTerminalRetention = (): Promise<void> => {
    if (retentionInFlight) return retentionInFlight;

    const task = (async () => {
      const completedBefore = new Date(Date.now() - config.terminalRetentionDays * DAY_MS);
      try {
        const deleted = await JobRunRepository.deleteTerminalCompletedBefore(completedBefore);
        if (deleted > 0) {
          console.info('Persistent job terminal retention completed', {
            deletedJobRuns: deleted,
            completedBefore: completedBefore.toISOString(),
          });
        }
      } catch (error) {
        console.error('Persistent job terminal retention failed', error);
      }
    })();
    retentionInFlight = task;
    void task.finally(() => {
      if (retentionInFlight === task) retentionInFlight = null;
    });
    return task;
  };

  await runTerminalRetention();
  retentionTimer = setInterval(() => void runTerminalRetention(), TERMINAL_RETENTION_INTERVAL_MS);
  retentionTimer.unref();

  const jobWorkerPromise = worker.run();
  const accountImportWorkerPromise = accountImportWorker.run();
  const preparationWorkerPromise = preparationWorker.run();
  const lifecycleWorkerPromise = lifecycleWorker.run();
  const workerPromises = [
    jobWorkerPromise,
    accountImportWorkerPromise,
    preparationWorkerPromise,
    lifecycleWorkerPromise,
  ];
  const runPromise = Promise.all(workerPromises);

  const shutdown = async (signal: NodeJS.Signals) => {
    if (shuttingDown) return;
    shuttingDown = true;
    if (retentionTimer) {
      clearInterval(retentionTimer);
      retentionTimer = undefined;
    }
    console.info('Shutting down persistent background workers', { signal });
    worker.requestStop(`Worker received ${signal}.`);
    accountImportWorker.requestStop(`Worker received ${signal}.`);
    preparationWorker.requestStop();
    lifecycleWorker.requestStop();

    const stopped = await settlesWithin(cleanupCompleted, shutdownTimeoutMs);
    if (!stopped) {
      console.error('Persistent worker cleanup exceeded the shutdown timeout', {
        signal,
        shutdownTimeoutMs,
      });
      process.exit(1);
    }
  };

  const onSigint = () => void shutdown('SIGINT');
  const onSigterm = () => void shutdown('SIGTERM');
  process.once('SIGINT', onSigint);
  process.once('SIGTERM', onSigterm);

  try {
    await runPromise;
  } catch (error) {
    console.error('Persistent worker failed', error);
    process.exitCode = 1;
    worker.requestStop('Peer worker failed.');
    accountImportWorker.requestStop('Peer worker failed.');
    preparationWorker.requestStop();
    lifecycleWorker.requestStop();
    const peerStopped = await settlesWithin(
      Promise.allSettled(workerPromises),
      shutdownTimeoutMs,
    );
    if (!peerStopped) {
      console.error('Peer worker cleanup exceeded the shutdown timeout', { shutdownTimeoutMs });
      process.exit(1);
    }
  } finally {
    if (retentionTimer) clearInterval(retentionTimer);
    try {
      await retentionInFlight;
      process.removeListener('SIGINT', onSigint);
      process.removeListener('SIGTERM', onSigterm);
      await disconnectPrisma();
    } finally {
      resolveCleanupCompleted?.();
    }
  }
}

async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect().catch((error) => {
    console.error('Persistent worker Prisma shutdown failed', error);
    process.exitCode = 1;
  });
}

void bootstrap().catch(async (error) => {
  console.error('Persistent worker bootstrap failed', error);
  process.exitCode = 1;
  await disconnectPrisma();
});
