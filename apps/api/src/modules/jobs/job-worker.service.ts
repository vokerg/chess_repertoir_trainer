import type { JobWorkerConfig } from './job-worker.config';
import type { JobWorkerRepository } from './job-worker.repository.prisma';
import {
  JobTaskExecutorRegistry,
  type ClaimedJobTask,
  type JobTaskExecutionStatus,
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

type ExecutionOutcome =
  | { ok: true; status: JobTaskExecutionStatus }
  | { ok: false; error: unknown };

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
            if (stopRequested) break;
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
            if (stopRequested) break;

            if (!shouldPreempt) {
              claimedTask = await input.repository.claimNextTask({
                supportedKinds,
                jobRunId: slice.jobRunId,
              });
              if (stopRequested) {
                if (claimedTask) await releaseClaimDuringShutdown(claimedTask);
                break;
              }
            }
          }

          if (!claimedTask && slice) {
            await input.repository.touchJobRun(slice.jobRunId);
            slice = null;
            if (stopRequested) break;
          }

          if (!claimedTask) {
            claimedTask = await input.repository.claimNextTask({ supportedKinds });
            if (stopRequested) {
              if (claimedTask) await releaseClaimDuringShutdown(claimedTask);
              break;
            }
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

          if (stopRequested) {
            await releaseClaimDuringShutdown(claimedTask);
            break;
          }

          await executeClaimedTask(
            claimedTask,
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
          const jobRunId = slice.jobRunId;
          await input.repository.touchJobRun(jobRunId).catch((error) => {
            logger.error({ err: error, jobRunId }, 'Could not close worker scheduling slice');
          });
        }
        activeController = null;
        running = false;
        logger.info({}, 'Persistent job worker stopped');
      }
    },
  };

  async function releaseClaimDuringShutdown(task: ClaimedJobTask): Promise<void> {
    try {
      const released = await input.repository.releaseTask(task);
      logger.info(
        { taskId: task.id, jobRunId: task.jobRunId, released },
        'Persistent job task released before execution during worker shutdown',
      );
    } catch (error) {
      logger.error(
        { err: error, taskId: task.id, jobRunId: task.jobRunId },
        'Could not release persistent job task during worker shutdown; stale recovery will retry it',
      );
    }
  }

  async function acknowledgeCancelledClaim(
    task: ClaimedJobTask,
    repository: JobWorkerRepository,
    taskLogger: JobWorkerLogger,
  ): Promise<boolean> {
    try {
      const acknowledged = await repository.acknowledgeCancelledTask(task);
      if (acknowledged) {
        taskLogger.info(
          { taskId: task.id, jobRunId: task.jobRunId },
          'Persistent job task cancellation acknowledged after executor stop',
        );
      }
      return acknowledged;
    } catch (error) {
      taskLogger.error(
        { err: error, taskId: task.id, jobRunId: task.jobRunId },
        'Could not release cancelled task claim; stale recovery will clear it',
      );
      return false;
    }
  }

  async function executeClaimedTask(
    task: ClaimedJobTask,
    repository: JobWorkerRepository,
    executors: JobTaskExecutorRegistry,
    config: JobWorkerConfig,
    taskLogger: JobWorkerLogger,
  ): Promise<void> {
    const executor = executors.get(task.kind);
    if (!executor) {
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

    let outcome: ExecutionOutcome;
    try {
      const status = await executor.execute(task, { signal: controller.signal });
      outcome = { ok: true, status };
    } catch (error) {
      outcome = { ok: false, error };
    } finally {
      clearInterval(heartbeat);
      await heartbeatChain;
    }

    try {
      if (outcome.ok) {
        if (claimLost) {
          await acknowledgeCancelledClaim(task, repository, taskLogger);
          taskLogger.warn(
            { taskId: task.id, jobRunId: task.jobRunId },
            'Persistent job task completed after its claim was lost',
          );
          return;
        }

        try {
          const settled = await repository.finishTask(task, outcome.status);
          if (!settled) {
            await acknowledgeCancelledClaim(task, repository, taskLogger);
            taskLogger.warn(
              { taskId: task.id, jobRunId: task.jobRunId },
              'Persistent job task completed after its claim was lost',
            );
          }
        } catch (error) {
          taskLogger.error(
            { err: error, taskId: task.id, jobRunId: task.jobRunId, status: outcome.status },
            'Could not persist successful task completion; claim remains running for stale recovery',
          );
        }
        return;
      }

      if (claimLost) {
        await acknowledgeCancelledClaim(task, repository, taskLogger);
        taskLogger.warn(
          { err: outcome.error, taskId: task.id, jobRunId: task.jobRunId },
          'Persistent job task stopped because its claim was lost',
        );
        return;
      }

      if (stopRequested || controller.signal.aborted) {
        try {
          const released = await repository.releaseTask(task);
          if (!released) {
            await acknowledgeCancelledClaim(task, repository, taskLogger);
          }
          taskLogger.info(
            { taskId: task.id, jobRunId: task.jobRunId, released },
            'Persistent job task released during worker shutdown',
          );
        } catch (error) {
          taskLogger.error(
            { err: error, taskId: task.id, jobRunId: task.jobRunId },
            'Could not release persistent job task during worker shutdown; stale recovery will retry it',
          );
        }
        return;
      }

      try {
        const failed = await repository.failTask(task, errorMessage(outcome.error));
        if (!failed) {
          await acknowledgeCancelledClaim(task, repository, taskLogger);
        }
        taskLogger.error(
          { err: outcome.error, taskId: task.id, jobRunId: task.jobRunId, failed },
          'Persistent job task failed',
        );
      } catch (error) {
        taskLogger.error(
          {
            err: error,
            executionError: outcome.error,
            taskId: task.id,
            jobRunId: task.jobRunId,
          },
          'Could not persist task failure; claim remains running for stale recovery',
        );
      }
    } finally {
      if (activeController === controller) activeController = null;
    }
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
