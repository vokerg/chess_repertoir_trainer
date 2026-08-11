import assert from 'node:assert/strict';
import {
  AccountImportExecutorRegistry,
} from '../../dist/modules/account-imports/account-import.executor.js';
import {
  createAccountImportWorker,
} from '../../dist/modules/account-imports/account-import.worker.service.js';

await cancellationAcknowledgesOnlyAfterExecutorStops();
await shutdownReleasesExactClaim();
await retryAtDefersWithoutFalseFailure();
await unexpectedFailureDoesNotLeakProviderPayload();
await backlogAgeEmitsTelemetry();

async function cancellationAcknowledgesOnlyAfterExecutorStops() {
  const run = claimedRun(1, 'ACCOUNT_IMPORT:test-cancel');
  let claimed = false;
  let signalObserved = false;
  let acknowledged = false;
  let completed = false;
  let worker;

  const repository = repositoryStub({
    async claimNextRun() {
      if (claimed) return null;
      claimed = true;
      return run;
    },
    async heartbeatRun() {
      return 'CANCEL_REQUESTED';
    },
    async acknowledgeRequestedControl(importRunId, workKey) {
      assert.equal(importRunId, run.id);
      assert.equal(workKey, run.workKey);
      assert.equal(signalObserved, true, 'executor has quiesced before cancellation acknowledgement');
      acknowledged = true;
      worker.requestStop();
      return 'CANCELLED';
    },
    async completeRun() {
      completed = true;
      return true;
    },
  });
  const executors = new AccountImportExecutorRegistry([{
    provider: 'LICHESS',
    async execute(_run, context) {
      await new Promise((resolve) => {
        if (context.signal.aborted) return resolve();
        context.signal.addEventListener('abort', resolve, { once: true });
      });
      signalObserved = context.signal.aborted;
      return { kind: 'COMPLETED' };
    },
  }]);

  worker = createAccountImportWorker({
    repository,
    executors,
    config: workerConfig({ heartbeatIntervalMs: 5, staleAfterMs: 20 }),
    logger: silentLogger,
  });
  await worker.run();

  assert.equal(signalObserved, true);
  assert.equal(acknowledged, true);
  assert.equal(completed, false, 'cancel-requested work cannot settle as completed');
}

async function shutdownReleasesExactClaim() {
  const run = claimedRun(2, 'ACCOUNT_IMPORT:test-shutdown');
  let claimed = false;
  let released = false;
  let worker;

  const repository = repositoryStub({
    async claimNextRun() {
      if (claimed) return null;
      claimed = true;
      return run;
    },
    async releaseRun(importRunId, workKey) {
      assert.equal(importRunId, run.id);
      assert.equal(workKey, run.workKey);
      released = true;
      return true;
    },
  });
  const executors = new AccountImportExecutorRegistry([{
    provider: 'LICHESS',
    async execute(_run, context) {
      await new Promise((resolve) => {
        if (context.signal.aborted) return resolve();
        context.signal.addEventListener('abort', resolve, { once: true });
      });
      throw context.signal.reason;
    },
  }]);

  worker = createAccountImportWorker({
    repository,
    executors,
    config: workerConfig({ heartbeatIntervalMs: 50, staleAfterMs: 120 }),
    logger: silentLogger,
  });
  const runPromise = worker.run();
  setTimeout(() => worker.requestStop('test shutdown'), 10);
  await runPromise;
  assert.equal(released, true, 'shutdown releases the exact active account-import claim');
}

async function retryAtDefersWithoutFalseFailure() {
  const run = claimedRun(3, 'ACCOUNT_IMPORT:test-retry');
  const retryAt = new Date('2026-08-11T05:10:00.000Z');
  const rateLimitUntil = new Date('2026-08-11T05:09:00.000Z');
  const infoEntries = [];
  let claimed = false;
  let deferred = false;
  let failed = false;
  let completed = false;
  let worker;

  const repository = repositoryStub({
    async claimNextRun() {
      if (claimed) return null;
      claimed = true;
      return run;
    },
    async checkpointRun(importRunId, workKey) {
      assert.equal(importRunId, run.id);
      assert.equal(workKey, run.workKey);
      return true;
    },
    async deferRun(input) {
      assert.equal(input.importRunId, run.id);
      assert.equal(input.workKey, run.workKey);
      assert.equal(input.retryAt, retryAt);
      assert.equal(input.rateLimitUntil, rateLimitUntil);
      assert.equal(input.errorCode, 'HTTP_429');
      assert.equal(input.error, 'rate limited');
      deferred = true;
      worker.requestStop();
      return true;
    },
    async failRun() {
      failed = true;
      return true;
    },
    async completeRun() {
      completed = true;
      return true;
    },
  });
  const executors = new AccountImportExecutorRegistry([{
    provider: 'LICHESS',
    async execute(_run, context) {
      context.recordStageTiming('PROVIDER', 12);
      context.recordStageTiming('PARSE', 4);
      context.recordStageTiming('WRITE', 7);
      await context.checkpoint({ windowsCompleted: 1 });
      return {
        kind: 'RETRY_AT',
        retryAt,
        rateLimitUntil,
        errorCode: 'HTTP_429',
        safeError: 'rate limited',
      };
    },
  }]);

  worker = createAccountImportWorker({
    repository,
    executors,
    config: workerConfig(),
    now: () => new Date('2026-08-11T05:00:00.000Z').getTime(),
    logger: {
      info(context, message) { infoEntries.push({ context, message }); },
      warn() {},
      error() {},
    },
  });
  await worker.run();

  assert.equal(deferred, true, 'retry-at outcomes return the exact claim to the durable queue');
  assert.equal(failed, false, 'provider retry-at is not reported as a worker failure');
  assert.equal(completed, false, 'provider retry-at is not reported as completion');
  assert.deepEqual(
    infoEntries
      .filter((entry) => entry.message === 'Account import stage timing')
      .map((entry) => entry.context.stage)
      .filter((stage) => ['PROVIDER', 'PARSE', 'WRITE', 'CHECKPOINT'].includes(stage)),
    ['PROVIDER', 'PARSE', 'WRITE', 'CHECKPOINT'],
    'provider-neutral stage timing covers provider, parse, write and checkpoint work',
  );
  const retryTiming = infoEntries.find((entry) => entry.message === 'Account import retry timing');
  assert.equal(retryTiming?.context.retryDelayMs, 600_000);
  assert.equal(retryTiming?.context.rateLimitDelayMs, 540_000);
}

async function unexpectedFailureDoesNotLeakProviderPayload() {
  const run = claimedRun(4, 'ACCOUNT_IMPORT:test-private-error');
  const sensitiveMessage = 'https://provider.example/game/private?token=secret-value';
  const errorEntries = [];
  let claimed = false;
  let persistedError = null;
  let worker;

  const repository = repositoryStub({
    async claimNextRun() {
      if (claimed) return null;
      claimed = true;
      return run;
    },
    async failRun(importRunId, workKey, errorCode, error) {
      assert.equal(importRunId, run.id);
      assert.equal(workKey, run.workKey);
      assert.equal(errorCode, 'EXECUTION_FAILED');
      persistedError = error;
      worker.requestStop();
      return true;
    },
  });
  const executors = new AccountImportExecutorRegistry([{
    provider: 'LICHESS',
    async execute() {
      throw new Error(sensitiveMessage);
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

  assert.equal(persistedError, 'Account import execution failed unexpectedly.');
  const failure = errorEntries.find((entry) => entry.message === 'Account import execution failed');
  assert.ok(failure);
  assert.equal(failure.context.errorType, 'Error');
  assert.equal(JSON.stringify(failure).includes(sensitiveMessage), false);
  assert.equal(JSON.stringify(failure).includes('secret-value'), false);
}

async function backlogAgeEmitsTelemetry() {
  const current = new Date('2026-08-11T05:00:00.000Z').getTime();
  const warnings = [];
  let worker;
  const repository = repositoryStub({
    async getQueueStats() {
      worker.requestStop();
      return {
        queuedCount: 1,
        oldestQueuedAt: new Date(current - 300_001),
      };
    },
  });

  worker = createAccountImportWorker({
    repository,
    executors: new AccountImportExecutorRegistry(),
    config: workerConfig(),
    now: () => current,
    logger: {
      info() {},
      warn(context, message) { warnings.push({ context, message }); },
      error() {},
    },
  });
  await worker.run();

  const backlog = warnings.find((entry) => entry.message === 'Account import backlog threshold exceeded');
  assert.ok(backlog, 'old queue age emits the account-import backlog signal');
  assert.equal(backlog.context.queuedRuns, 1);
  assert.equal(backlog.context.oldestQueueAgeMs, 300_001);
  assert.equal(backlog.context.ageExceeded, true);
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
    heartbeatIntervalMs: 5,
    staleAfterMs: 20,
    staleRecoveryIntervalMs: 10,
    shutdownTimeoutMs: 50,
    backlogRunThreshold: 20,
    backlogAgeMs: 300_000,
    backlogSustainedMs: 300_000,
    ...overrides,
  };
}

const silentLogger = {
  info() {},
  warn() {},
  error() {},
};
