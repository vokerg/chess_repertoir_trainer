import assert from 'node:assert/strict';
import {
  AccountImportExecutorRegistry,
} from '../../dist/modules/account-imports/account-import.executor.js';
import {
  createAccountImportWorker,
} from '../../dist/modules/account-imports/account-import.worker.service.js';

await settlementFailureLeavesClaimForRecoveryAndKeepsWorkerAlive();
await controlRequestStopsHeartbeatRenewal();

async function settlementFailureLeavesClaimForRecoveryAndKeepsWorkerAlive() {
  const run = claimedRun(1, 'ACCOUNT_IMPORT:test-settlement-failure');
  const errorEntries = [];
  let claimCalls = 0;
  let completeCalls = 0;
  let worker;

  const repository = repositoryStub({
    async claimNextRun() {
      claimCalls += 1;
      if (claimCalls === 1) return run;
      worker.requestStop('settlement failure resilience proved');
      return null;
    },
    async completeRun(importRunId, workKey) {
      assert.equal(importRunId, run.id);
      assert.equal(workKey, run.workKey);
      completeCalls += 1;
      const error = new Error('database connection dropped while settling');
      error.code = 'P1001';
      throw error;
    },
  });

  const executors = new AccountImportExecutorRegistry([{
    provider: 'LICHESS',
    async execute() {
      return { kind: 'COMPLETED' };
    },
  }]);

  worker = createAccountImportWorker({
    repository,
    executors,
    config: workerConfig(),
    logger: {
      info() {},
      warn() {},
      error(context, message) { errorEntries.push({ context, message }); },
    },
  });

  await worker.run();

  assert.equal(completeCalls, 1, 'the claimed run attempts completion exactly once');
  assert.equal(claimCalls, 2, 'the worker loop survives settlement persistence failure');

  const settlementFailure = errorEntries.find(
    (entry) => entry.message === 'Could not persist account import settlement; claim remains for stale recovery',
  );
  assert.ok(settlementFailure, 'settlement persistence failure is surfaced as worker telemetry');
  assert.equal(settlementFailure.context.importRunId, run.id);
  assert.equal(settlementFailure.context.provider, run.provider);
  assert.equal(settlementFailure.context.errorType, 'Error');
  assert.equal(settlementFailure.context.errorCode, 'P1001');
  assert.equal(
    JSON.stringify(settlementFailure).includes('database connection dropped while settling'),
    false,
    'settlement telemetry does not expose raw database/provider error messages',
  );
}

async function controlRequestStopsHeartbeatRenewal() {
  const run = claimedRun(2, 'ACCOUNT_IMPORT:test-control-stale-fallback');
  let claimed = false;
  let heartbeatCalls = 0;
  let acknowledged = false;
  let releaseExecutor;
  let worker;

  const repository = repositoryStub({
    async claimNextRun() {
      if (claimed) return null;
      claimed = true;
      return run;
    },
    async heartbeatRun(importRunId, workKey) {
      assert.equal(importRunId, run.id);
      assert.equal(workKey, run.workKey);
      heartbeatCalls += 1;
      return 'CANCEL_REQUESTED';
    },
    async acknowledgeRequestedControl(importRunId, workKey) {
      assert.equal(importRunId, run.id);
      assert.equal(workKey, run.workKey);
      acknowledged = true;
      worker.requestStop('control acknowledgement proved');
      return 'CANCELLED';
    },
  });

  const executors = new AccountImportExecutorRegistry([{
    provider: 'LICHESS',
    async execute() {
      await new Promise((resolve) => {
        releaseExecutor = resolve;
      });
      return { kind: 'COMPLETED' };
    },
  }]);

  worker = createAccountImportWorker({
    repository,
    executors,
    config: workerConfig({ heartbeatIntervalMs: 5, staleAfterMs: 20 }),
    logger: {
      info() {},
      warn() {},
      error() {},
    },
  });

  const runPromise = worker.run();
  await new Promise((resolve) => setTimeout(resolve, 30));
  assert.equal(heartbeatCalls, 1, 'control observation stops renewing the claim heartbeat');
  assert.equal(typeof releaseExecutor, 'function', 'executor is still running after the abort request');
  releaseExecutor();
  await runPromise;

  assert.equal(acknowledged, true, 'control is acknowledged after the executor eventually quiesces');
}

function repositoryStub(overrides) {
  return {
    async listRunsForUser() { return []; },
    async getRunForUser() { return null; },
    async requestPause() { return false; },
    async resume() { return false; },
    async requestCancel() { return false; },
    async claimNextRun() { return null; },
    async heartbeatRun() { return 'RUNNING'; },
    async checkpointRun() { return true; },
    async completeRun() { return true; },
    async failRun() { return true; },
    async deferRun() { return true; },
    async acknowledgeRequestedControl() { return null; },
    async releaseRun() { return true; },
    async recoverStaleClaims() { return 0; },
    async getQueueStats() { return { queuedCount: 0, oldestQueuedAt: null }; },
    ...overrides,
  };
}

function claimedRun(id, workKey) {
  const now = new Date('2026-08-11T05:00:00.000Z');
  return {
    id,
    userId: 1,
    accountId: id,
    provider: 'LICHESS',
    mode: 'BOUNDED_INITIAL',
    source: 'USER_ACTION',
    status: 'RUNNING',
    scopeVersion: 1,
    scopeHash: 'a'.repeat(64),
    scope: { variant: 'STANDARD', speeds: ['BLITZ'], rated: 'BOTH' },
    requestedFrom: new Date('2026-05-01T00:00:00.000Z'),
    requestedTo: new Date('2026-08-01T00:00:00.000Z'),
    retryOfImportRunId: null,
    priority: 100,
    windowsTotal: 1,
    windowsCompleted: 0,
    gamesSeen: 0,
    gamesMatchedScope: 0,
    gamesImported: 0,
    gamesDuplicate: 0,
    gamesUpdated: 0,
    gamesSkipped: 0,
    gamesSkippedOutOfScope: 0,
    gamesFailed: 0,
    lastProgressAt: null,
    workKey,
    claimedAt: now,
    heartbeatAt: now,
    pauseRequestedAt: null,
    cancelRequestedAt: null,
    retryAt: null,
    rateLimitUntil: null,
    startedAt: now,
    completedAt: null,
    errorCode: null,
    error: null,
    createdAt: now,
    updatedAt: now,
  };
}

function workerConfig(overrides = {}) {
  return {
    pollIntervalMs: 1,
    heartbeatIntervalMs: 50,
    staleAfterMs: 120,
    staleRecoveryIntervalMs: 30,
    shutdownTimeoutMs: 50,
    backlogRunThreshold: 20,
    backlogAgeMs: 300_000,
    backlogSustainedMs: 300_000,
    ...overrides,
  };
}
