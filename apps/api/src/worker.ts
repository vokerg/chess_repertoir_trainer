import 'dotenv/config';
import prisma from './prisma';
import { defaultJobTaskExecutorRegistry } from './modules/jobs/job-task-executor';
import { loadJobWorkerConfig } from './modules/jobs/job-worker.config';
import { JobWorkerRepository } from './modules/jobs/job-worker.repository.prisma';
import { createJobWorker } from './modules/jobs/job-worker.service';

async function bootstrap() {
  const config = loadJobWorkerConfig();
  const worker = createJobWorker({
    repository: JobWorkerRepository,
    executors: defaultJobTaskExecutorRegistry,
    config,
  });
  let shuttingDown = false;

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
