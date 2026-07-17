import assert from 'node:assert/strict';
import { JobTaskExecutorRegistry } from '../../dist/modules/jobs/job-task-executor.js';
import { createJobWorker } from '../../dist/modules/jobs/job-worker.service.js';

let claimed = false;
let heartbeatCalls = 0;
let finishCalls = 0;
let failCalls = 0;
let releaseCalls = 0;
let executorAborted = false;
let worker;

const task = {
  id: 1,
  jobRunId: 10,
  userId: 100,
  kind: 'INDEX_GAMES',
  priority: 400,
  force: false,
  importedGameId: 1_000,
  ordinal: 0,
  workKey: 'GAME_WORK:cancellation-test',
};

const repository = {
  async recoverStaleTasks() { return 0; },
  async skipOrphanedTasks() { return 0; },
  async claimNextTask() {
    if (claimed) return null;
    claimed = true;
    return task;
  },
  async claimNextTaskInJob() { return null; },
  async hasHigherPriorityWork() { return false; },
  async heartbeatTask() {
    heartbeatCalls += 1;
    return false;
  },
  async finishTask() {
    finishCalls += 1;
    return true;
  },
  async failTask() {
    failCalls += 1;
    return true;
  },
  async releaseTask() {
    releaseCalls += 1;
    return true;
  },
  async touchJobRun() {},
};

const executors = new JobTaskExecutorRegistry([{
  kind: 'INDEX_GAMES',
  async execute(_task, context) {
    await new Promise((resolve, reject) => {
      const safetyTimer = setTimeout(() => {
        reject(new Error('Timed out waiting for cancellation-driven claim loss.'));
      }, 1_000);
      context.signal.addEventListener('abort', () => {
        clearTimeout(safetyTimer);
        executorAborted = true;
        worker.requestStop('Cancellation claim-loss test completed.');
        reject(context.signal.reason);
      }, { once: true });
    });
    return 'COMPLETED';
  },
}]);

worker = createJobWorker({
  repository,
  executors,
  config: {
    pollIntervalMs: 50,
    heartbeatIntervalMs: 5,
    staleAfterMs: 1_000,
    staleRecoveryIntervalMs: 1_000,
    terminalRetentionDays: 30,
    sliceSize: 25,
    shutdownTimeoutMs: 1_000,
  },
  logger: {
    info() {},
    warn() {},
    error() {},
  },
});

await worker.run();

assert.equal(executorAborted, true);
assert.ok(heartbeatCalls >= 1);
assert.equal(finishCalls, 0);
assert.equal(failCalls, 0);
assert.equal(releaseCalls, 0);

console.log('Persistent job cancellation claim-loss tests passed.');
