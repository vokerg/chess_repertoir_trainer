import assert from 'node:assert/strict';
import { AccountImportExecutorRegistry } from '../../dist/modules/account-imports/account-import.executor.js';
import { createAccountImportWorker } from '../../dist/modules/account-imports/account-import.worker.service.js';
import {
  createLichessAccountImportExecutor,
} from '../../dist/modules/account-imports/providers/lichess/lichess-account-import.executor.js';

await workerExecutesRegisteredLichessAdapter();
await workerPersistsProviderFailure();

async function workerExecutesRegisteredLichessAdapter() {
  const run = claimedRun();
  let claimed = false;
  let completed = false;
  let coverage = null;
  let worker;

  const lichess = createLichessAccountImportExecutor({
    repository: { async getCoverage() { return coverage; } },
    commitRepository: {
      async initializePlan() {},
      async persistBatch() { assert.fail('empty provider window must not persist a batch'); },
      async completeWindow(input) {
        coverage = coverageRecord(run, input.coveredFrom, input.coveredThrough);
      },
    },
    config: { windowDays: 14, databaseWriteBatchSize: 100 },
    fetch: async () => new Response('', { status: 200 }),
    baseUrl: 'https://example.invalid/api/games/user',
    loadAccount: async () => ({ username: 'FixtureUser' }),
    reconcileCommittedRange: async () => assert.fail('empty provider window has no activity range'),
  });
  const executors = new AccountImportExecutorRegistry([lichess]);
  const lifecycleRepository = repositoryStub({
    async claimNextRun(supportedProviders) {
      assert.deepEqual(supportedProviders, ['LICHESS']);
      if (claimed) return null;
      claimed = true;
      return run;
    },
    async completeRun(importRunId, workKey) {
      assert.equal(importRunId, run.id);
      assert.equal(workKey, run.workKey);
      assert.equal(coverage?.coveredFrom.toISOString(), run.requestedFrom.toISOString());
      assert.equal(coverage?.coveredThrough.toISOString(), run.requestedTo.toISOString());
      completed = true;
      worker.requestStop();
      return true;
    },
  });

  worker = createAccountImportWorker({
    repository: lifecycleRepository,
    executors,
    config: workerConfig(),
    logger: { info() {}, warn() {}, error() {} },
  });
  await worker.run();
  assert.equal(completed, true);
}

async function workerPersistsProviderFailure() {
  const run = claimedRun({ id: 202, workKey: 'ACCOUNT_IMPORT:test-lichess-worker-failure' });
  let claimed = false;
  let failure = null;
  let worker;

  const lichess = createLichessAccountImportExecutor({
    repository: { async getCoverage() { return null; } },
    commitRepository: {
      async initializePlan() {},
      async persistBatch() { assert.fail('HTTP failure must not persist a batch'); },
      async completeWindow() { assert.fail('HTTP failure must not advance coverage'); },
    },
    config: { windowDays: 14, databaseWriteBatchSize: 100 },
    fetch: async () => new Response('private upstream detail', { status: 503 }),
    baseUrl: 'https://example.invalid/api/games/user',
    loadAccount: async () => ({ username: 'FixtureUser' }),
    reconcileCommittedRange: async () => assert.fail('HTTP failure has no activity range'),
  });
  const lifecycleRepository = repositoryStub({
    async claimNextRun() {
      if (claimed) return null;
      claimed = true;
      return run;
    },
    async failRun(importRunId, workKey, errorCode, error) {
      failure = { importRunId, workKey, errorCode, error };
      worker.requestStop();
      return true;
    },
    async completeRun() { assert.fail('typed provider failure must not complete the import'); },
  });
  worker = createAccountImportWorker({
    repository: lifecycleRepository,
    executors: new AccountImportExecutorRegistry([lichess]),
    config: workerConfig(),
    logger: { info() {}, warn() {}, error() {} },
  });
  await worker.run();

  assert.deepEqual(failure, {
    importRunId: run.id,
    workKey: run.workKey,
    errorCode: 'LICHESS_HTTP_503',
    error: 'Lichess account import request failed with HTTP 503.',
  });
}

function repositoryStub(overrides = {}) {
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

function claimedRun(overrides = {}) {
  const now = new Date('2026-08-11T09:00:00.000Z');
  return {
    id: 201,
    userId: 1,
    accountId: 2,
    provider: 'LICHESS',
    mode: 'BOUNDED_INITIAL',
    source: 'USER_ACTION',
    status: 'RUNNING',
    scopeVersion: 1,
    scopeHash: 'a'.repeat(64),
    scope: { variant: 'STANDARD', speeds: ['BLITZ', 'RAPID'], rated: 'BOTH' },
    requestedFrom: new Date('2026-07-01T00:00:00.000Z'),
    requestedTo: new Date('2026-07-15T00:00:00.000Z'),
    retryOfImportRunId: null,
    priority: 100,
    windowsTotal: null,
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
    checkpoint: null,
    workKey: 'ACCOUNT_IMPORT:test-lichess-worker',
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
    ...overrides,
  };
}

function coverageRecord(run, coveredFrom, coveredThrough) {
  return {
    id: 1,
    accountId: run.accountId,
    scopeVersion: 1,
    scopeHash: run.scopeHash,
    scope: run.scope,
    coveredFrom,
    coveredThrough,
    lastCompletedImportRunId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function workerConfig() {
  return {
    pollIntervalMs: 1,
    heartbeatIntervalMs: 5,
    staleAfterMs: 20,
    staleRecoveryIntervalMs: 10,
    shutdownTimeoutMs: 50,
    backlogRunThreshold: 20,
    backlogAgeMs: 300_000,
    backlogSustainedMs: 300_000,
  };
}

console.log('Bounded Lichess worker integration test passed.');
