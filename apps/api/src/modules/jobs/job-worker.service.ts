import type { JobRunKind } from '@chess-trainer/contracts/jobs';
import type { JobWorkerConfig } from './job-worker.config';
import type { JobWorkerRepository } from './job-worker.repository.prisma';
import {
  JobTaskExecutorRegistry,
  type ClaimedJobTask,
} from './job-task-executor';

export interface JobWorkerLogger {
  info(context: Record<string, unknown>, message: string): void;
  warn(context: Record<string, unknown>, message: string): void;
  error(context: Record<string, unknown>, message: string): void;
}

export interface CreateJobWorkerInput {
  repository: JobWorkerRepository;
  executors: JobTaskExecutorRegistry;
  config: JobWorkerConfig;
  logger?: JobWorkerLogger;
  now?: () => number;
}

export interface JobWorker {
  run(): Promise<void>;
  requestStop(reason?: string): void;
}

interface SchedulingSlice {
  jobRunId: number;
  priority: number;
  processed: number;
}

const consoleLogger: JobWorkerLogger = {
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

export function createJobWorker(input: CreateJobWorkerInput): JobWorker {
  const logger = input.logger ?? consoleLogger;
  const now = input.now ?? Date.now;
  let running = false;
  let stopRequested = false;
  let activeController: AbortController | null = null;
  let wakePoll: (() => void) | null = null;
  let loggedEmptyRegistry = false;

  const requestStop = (reason = 'Worker shutdown requested') => {
    stopRequested = true;
    activeController?.abort(new Error(reason));
    wakePoll?.();
  };

  return {
    requestStop,

    async run() {
      if (running) throw new Error('Persistent job worker is already running.');
      running = true;
      let slice: SchedulingSlice | null = null;
      let nextMaintenanceAt = 0;

      logger.info({}, 'Persistent job worker started');

      try {
        while (!stopRequested) {
          if (now() >= nextMaintenanceAt) {
            await runMaintenance(input.repository, input.config, logger, now);
            nextMaintenanceAt = now() + input.config.staleRecoveryIntervalMs;
          }

          const supportedKinds = input.executors.supportedKinds();
          if (supportedKinds.length === 0) {
            if (!loggedEmptyRegistry) {
              loggedEmptyRegistry = true;
              logger.info({}, 'No persistent job executors are registered; worker is idle');
            }
            await waitForPoll(input.config.pollIntervalMs);
            continue;
          }
          loggedEmptyRegistry = false;

          let claimedTask: ClaimedJobTask | null = null;
          if (slice && slice.processed < input.config.sliceSize) {
            const shouldPreempt = await input.repository.hasHigherPriorityRunnableWork(
              slice.priority,
              supportedKinds,
            );
            if (!shouldPreempt) {
              claimedTask = await input.repository.claimNextTask({
                supportedKinds,
                jobRunId: slice.jobRunId,
              });
            }
          }

          if (!claimedTask && slice) {
            await input.repository.touchJobRun(slice.jobRunId);
            slice = null;
          }

          if (!claimedTask) {
            claimedTask = await input.repository.claimNextTask({ supportedKinds });
            if (!claimedTask) {
              await waitForPoll(input.config.pollIntervalMs);
              continue;
            }
            slice = {
              jobRunId: claimedTask.jobRunId,
              priority: claimedTask.priority,
              processed: 0,
            };
          }

          await executeClaimedTask(
            claimedTask,
            supportedKinds,
            input.repository,
            input.executors,
            input.config,
            logger,
          );

          if (slice && slice.jobRunId === claimedTask.jobRunId) {
            slice.processed += 1;
            if (slice.processed >= input.config.sliceSize) {
              await input.repository.touchJobRun(slice.jobRunId);
              slice = null;
            }
          }
        }
      } finally {
        if (slice) {
          await input.repository.touchJobRun(slice.jobRunId).catch((error) => {
            logger.error({ err: error, jobRunId: slice?.jobRunId }, 'Could not close worker scheduling slice');
          });
        }
        activeController = null;
        running = false;
        logger.info({}, 'Persistent job worker stopped');
      }
    },
  };

  async function executeClaimedTask(
    task: ClaimedJobTask,
    supportedKinds: JobRunKind[],
    repository: JobWorkerRepository,
    executors: JobTaskExecutorRegistry,
    config: JobWorkerConfig,
    taskLogger: JobWorkerLogger,
  ): Promise<void> {
    const executor = executors.get(task.kind);
    if (!executor || !supportedKinds.includes(task.kind)) {
      await repository.releaseTask(task);
      throw new Error(`No executor registered for claimed job kind ${task.kind}.`);
    }

    const controller = new AbortController();
    activeController = controller;
    let claimLost = false;
    let heartbeatChain = Promise.resolve();

    const heartbeat = setInterval(() => {
      heartbeatChain = heartbeatChain
        .then(async () => {
          const retained = await repository.heartbeatTask(task);
          if (!retained) {
            claimLost = true;
            controller.abort(new Error('Persistent job task claim was lost.'));
          }
        })
        .catch((error) => {
          taskLogger.warn(
            { err: error, taskId: task.id, jobRunId: task.jobRunId },
            'Persistent job task heartbeat failed',
          );
        });
    }, config.heartbeatIntervalMs);
    heartbeat.unref();

    try {
      const result = await executor.execute(task, { signal: controller.signal });
      await heartbeatChain;
      const settled = await repository.finishTask(task, result);
      if (!settled) {
        taskLogger.warn(
          { taskId: task.id, jobRunId: task.jobRunId },
          'Persistent job task completed after its claim was lost',
        );
      }
    } catch (error) {
      await heartbeatChain;
      if (claimLost) {
        taskLogger.warn(
          { err: error, taskId: task.id, jobRunId: task.jobRunId },
          'Persistent job task stopped because its claim was lost',
        );
      } else if (stopRequested || controller.signal.aborted) {
        const released = await repository.releaseTask(task);
        taskLogger.info(
          { taskId: task.id, jobRunId: task.jobRunId, released },
          'Persistent job task released during worker shutdown',
        );
      } else {
        const failed = await repository.failTask(task, errorMessage(error));
        taskLogger.error(
          { err: error, taskId: task.id, jobRunId: task.jobRunId, failed },
          'Persistent job task failed',
        );
      }
    } finally {
      clearInterval(heartbeat);
      await heartbeatChain;
      if (activeController === controller) activeController = null;
    }
  }

  function waitForPoll(delayMs: number): Promise<void> {
    if (stopRequested) return Promise.resolve();

    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        if (wakePoll === wake) wakePoll = null;
        resolve();
      }, delayMs);
      timer.unref();

      const wake = () => {
        clearTimeout(timer);
        if (wakePoll === wake) wakePoll = null;
        resolve();
      };
      wakePoll = wake;
    });
  }
}

async function runMaintenance(
  repository: JobWorkerRepository,
  config: JobWorkerConfig,
  logger: JobWorkerLogger,
  now: () => number,
): Promise<void> {
  const staleBefore = new Date(now() - config.staleAfterMs);
  const [recovered, skipped] = await Promise.all([
    repository.recoverStaleTasks(staleBefore),
    repository.skipOrphanedTasks(),
  ]);

  if (recovered > 0 || skipped > 0) {
    logger.info(
      { recoveredStaleTasks: recovered, skippedOrphanedTasks: skipped },
      'Persistent job worker maintenance completed',
    );
  }
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
