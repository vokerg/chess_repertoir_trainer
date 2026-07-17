import assert from 'node:assert/strict';
import {
  JobTaskExecutorRegistry,
} from '../../dist/modules/jobs/job-task-executor.js';
import {
  createJobWorker,
} from '../../dist/modules/jobs/job-worker.service.js';

const config = {
  pollIntervalMs: 5,
  heartbeatIntervalMs: 100,
  staleAfterMs: 1_000,
  staleRecoveryIntervalMs: 1_000,
  sliceSize: 2,
  shutdownTimeoutMs: 1_000,
};
const logger = {
  info() {},
  warn() {},
  error() {},
};

{
  const claimInputs = [];
  const touchedJobRuns = [];
  const finishedTasks = [];
  const tasksByJob = new Map([
    [1, [task(1, 1, 100), task(2, 1, 100)]],
    [2, [task(3, 2, 100)]],
  ]);

  const repository = fakeRepository({
    claimNextTask: async (input) => {
      claimInputs.push(input.jobRunId);
      if (input.jobRunId !== undefined) {
        return tasksByJob.get(input.jobRunId)?.shift() ?? null;
      }
      for (const jobRunId of [1, 2]) {
        const claimed = tasksByJob.get(jobRunId)?.shift();
        if (claimed) return claimed;
      }
      return null;
    },
    finishTask: async (claim, status) => {
      finishedTasks.push([claim.id, status]);
      return true;
    },
    touchJobRun: async (jobRunId) => {
      touchedJobRuns.push(jobRunId);
    },
  });

  let executions = 0;
  let worker;
  const executors = new JobTaskExecutorRegistry([{
    kind: 'INDEX_GAMES',
    async execute() {
      executions += 1;
      if (executions === 3) worker.requestStop('Scheduling test complete.');
      return 'COMPLETED';
    },
  }]);
  worker = createJobWorker({ repository, executors, config, logger });
  await worker.run();

  assert.deepEqual(claimInputs.slice(0, 3), [undefined, 1, undefined]);
  assert.deepEqual(finishedTasks, [
    [1, 'COMPLETED'],
    [2, 'COMPLETED'],
    [3, 'COMPLETED'],
  ]);
  assert.equal(touchedJobRuns.includes(1), true, 'the first job is touched after its two-task slice');
}

{
  let releaseCount = 0;
  let executionStartedResolve;
  const executionStarted = new Promise((resolve) => {
    executionStartedResolve = resolve;
  });
  let claimed = false;

  const repository = fakeRepository({
    claimNextTask: async () => {
      if (claimed) return null;
      claimed = true;
      return task(10, 10, 200);
    },
    releaseTask: async () => {
      releaseCount += 1;
      return true;
    },
  });
  const executors = new JobTaskExecutorRegistry([{
    kind: 'INDEX_GAMES',
    async execute(_task, context) {
      executionStartedResolve();
      await new Promise((resolve, reject) => {
        context.signal.addEventListener('abort', () => reject(context.signal.reason), { once: true });
      });
      return 'COMPLETED';
    },
  }]);
  const worker = createJobWorker({ repository, executors, config, logger });
  const runPromise = worker.run();
  await executionStarted;
  worker.requestStop('Graceful shutdown test.');
  await runPromise;

  assert.equal(releaseCount, 1, 'the active claim is returned to the queue during shutdown');
}

{
  let maintenanceStartedResolve;
  const maintenanceStarted = new Promise((resolve) => {
    maintenanceStartedResolve = resolve;
  });
  let continueMaintenanceResolve;
  const continueMaintenance = new Promise((resolve) => {
    continueMaintenanceResolve = resolve;
  });
  let claimCount = 0;
  let executionCount = 0;

  const repository = fakeRepository({
    recoverStaleTasks: async () => {
      maintenanceStartedResolve();
      await continueMaintenance;
      return 0;
    },
    claimNextTask: async () => {
      claimCount += 1;
      return task(20, 20, 200);
    },
  });
  const executors = new JobTaskExecutorRegistry([{
    kind: 'INDEX_GAMES',
    async execute() {
      executionCount += 1;
      return 'COMPLETED';
    },
  }]);
  const worker = createJobWorker({ repository, executors, config, logger });
  const runPromise = worker.run();
  await maintenanceStarted;
  worker.requestStop('Shutdown during maintenance.');
  continueMaintenanceResolve();
  await runPromise;

  assert.equal(claimCount, 0, 'shutdown after maintenance prevents another claim');
  assert.equal(executionCount, 0, 'shutdown after maintenance prevents execution');
}

{
  let claimStartedResolve;
  const claimStarted = new Promise((resolve) => {
    claimStartedResolve = resolve;
  });
  let continueClaimResolve;
  const continueClaim = new Promise((resolve) => {
    continueClaimResolve = resolve;
  });
  let releaseCount = 0;
  let executionCount = 0;

  const repository = fakeRepository({
    claimNextTask: async () => {
      claimStartedResolve();
      await continueClaim;
      return task(30, 30, 200);
    },
    releaseTask: async () => {
      releaseCount += 1;
      return true;
    },
  });
  const executors = new JobTaskExecutorRegistry([{
    kind: 'INDEX_GAMES',
    async execute() {
      executionCount += 1;
      return 'COMPLETED';
    },
  }]);
  const worker = createJobWorker({ repository, executors, config, logger });
  const runPromise = worker.run();
  await claimStarted;
  worker.requestStop('Shutdown during claim.');
  continueClaimResolve();
  await runPromise;

  assert.equal(releaseCount, 1, 'a claim acquired during shutdown is released');
  assert.equal(executionCount, 0, 'a claim acquired during shutdown is never executed');
}

{
  let failCount = 0;
  let releaseCount = 0;
  let worker;
  let claimed = false;

  const repository = fakeRepository({
    claimNextTask: async () => {
      if (claimed) return null;
      claimed = true;
      return task(40, 40, 200);
    },
    finishTask: async () => {
      throw new Error('Transient settlement failure');
    },
    failTask: async () => {
      failCount += 1;
      return true;
    },
    releaseTask: async () => {
      releaseCount += 1;
      return true;
    },
  });
  const executors = new JobTaskExecutorRegistry([{
    kind: 'INDEX_GAMES',
    async execute() {
      worker.requestStop('Settlement test complete.');
      return 'COMPLETED';
    },
  }]);
  worker = createJobWorker({ repository, executors, config, logger });
  await worker.run();

  assert.equal(failCount, 0, 'a successful executor is not marked failed when completion settlement throws');
  assert.equal(releaseCount, 0, 'a successful executor is not requeued when completion settlement throws');
}

console.log('Persistent job worker scheduling tests passed.');

function task(id, jobRunId, priority) {
  return {
    id,
    jobRunId,
    userId: 1,
    kind: 'INDEX_GAMES',
    priority,
    importedGameId: id,
    ordinal: id - 1,
    force: false,
    workKey: `GAME_WORK:test-${id}`,
  };
}

function fakeRepository(overrides = {}) {
  return {
    claimNextTask: async () => null,
    hasHigherPriorityRunnableWork: async () => false,
    heartbeatTask: async () => true,
    finishTask: async () => true,
    failTask: async () => true,
    releaseTask: async () => true,
    touchJobRun: async () => {},
    recoverStaleTasks: async () => 0,
    skipOrphanedTasks: async () => 0,
    ...overrides,
  };
}
