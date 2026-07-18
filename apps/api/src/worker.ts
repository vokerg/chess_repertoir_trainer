import 'dotenv/config';
import prisma from './prisma';
import { defaultJobTaskExecutorRegistry } from './modules/jobs/imported-game-job-executors';
import { JobRunRepository } from './modules/jobs/job-run.repository.prisma';
import { loadJobWorkerConfig } from './modules/jobs/job-worker.config';
import { JobWorkerRepository } from './modules/jobs/job-worker.repository.prisma';
import { createJobWorker } from './modules/jobs/job-worker.service';

const DAY_MS = 24 * 60 * 60_000;
const TERMINAL_RETENTION_INTERVAL_MS = 60 * 60_000;

async function bootstrap() {
  const config = loadJobWorkerConfig();
  const worker = createJobWorker({
    repository: JobWorkerRepository,
    executors: defaultJobTaskExecutorRegistry,
    config,
  });
  let shuttingDown = false;
  let retentionTimer: NodeJS.Timeout | undefined;
  let retentionInFlight: Promise<void> | null = null;

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

  const runPromise = worker.run();

  const shutdown = async (signal: NodeJS.Signals) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.info('Shutting down persistent job worker', { signal });
    worker.requestStop(`Worker received ${signal}.`);

    const stopped = await settlesWithin(runPromise, config.shutdownTimeoutMs);
    if (!stopped) {
      console.error('Persistent job worker did not stop within the shutdown timeout', {
        signal,
        shutdownTimeoutMs: config.shutdownTimeoutMs,
      });
      process.exitCode = 1;
    }
  };

  const onSigint = () => void shutdown('SIGINT');
  const onSigterm = () => void shutdown('SIGTERM');
  process.once('SIGINT', onSigint);
  process.once('SIGTERM', onSigterm);

  try {
    await runPromise;
  } catch (error) {
    console.error('Persistent job worker failed', error);
    process.exitCode = 1;
  } finally {
    if (retentionTimer) clearInterval(retentionTimer);
    await retentionInFlight;
    process.removeListener('SIGINT', onSigint);
    process.removeListener('SIGTERM', onSigterm);
    await disconnectPrisma();
  }
}

async function settlesWithin(promise: Promise<void>, timeoutMs: number): Promise<boolean> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<false>((resolve) => {
    timer = setTimeout(() => resolve(false), timeoutMs);
    timer.unref();
  });

  const settled = await Promise.race([
    promise.then(() => true, () => true),
    timeout,
  ]);
  if (timer) clearTimeout(timer);
  return settled;
}

async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect().catch((error) => {
    console.error('Persistent job worker Prisma shutdown failed', error);
    process.exitCode = 1;
  });
}

void bootstrap().catch(async (error) => {
  console.error('Persistent job worker bootstrap failed', error);
  process.exitCode = 1;
  await disconnectPrisma();
});
