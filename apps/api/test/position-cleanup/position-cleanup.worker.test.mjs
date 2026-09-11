import assert from 'node:assert/strict';
import { Prisma } from '@prisma/client';
import { loadPositionCleanupConfig } from '../../dist/modules/position-cleanup/position-cleanup.config.js';
import { createPositionCleanupWorker } from '../../dist/modules/position-cleanup/position-cleanup.worker.service.js';

const config = loadPositionCleanupConfig({
  POSITION_CLEANUP_ENABLED: 'true',
  POSITION_CLEANUP_HEARTBEAT_INTERVAL_MS: '1000',
  POSITION_CLEANUP_STALE_AFTER_MS: '5000',
});
const lockTimeout = new Prisma.PrismaClientKnownRequestError(
  'position cleanup lock timeout',
  { code: 'P2010', clientVersion: 'test', meta: { code: '55P03' } },
);
const claimedRun = {
  id: 42,
  mode: 'EXECUTE',
  phase: 'EVALUATE',
  status: 'RUNNING',
  workKey: 'POSITION_CLEANUP:TEST:CANCEL-RACE',
  cancelRequestedAt: null,
};
let lockTimeoutSettlements = 0;
let cancellationSettlements = 0;
let activeWorkKey;

const repository = {
  async recoverStaleClaims() { return 0; },
  async claimNext(workKey) {
    activeWorkKey = workKey;
    return { ...claimedRun, workKey };
  },
  async getRun() { return { ...claimedRun, workKey: activeWorkKey, cancelRequestedAt: new Date() }; },
  async settleCancellation() {
    cancellationSettlements += 1;
    return true;
  },
  async executeDeleteBatch() { throw lockTimeout; },
  async recordLockTimeout() { lockTimeoutSettlements += 1; },
  async releaseClaim() { return true; },
  async heartbeat() { return true; },
  async reconcileBatch() { throw new Error('not used'); },
  async observeBatch() { throw new Error('not used'); },
  async evaluateDryRunBatch() { throw new Error('not used'); },
  async failClaimed() { throw new Error('not expected'); },
};

const worker = createPositionCleanupWorker({
  config,
  repository,
  logger: { info() {}, warn() {}, error() {} },
});

assert.equal(await worker.runOnce(), true);
assert.equal(cancellationSettlements, 1, 'cancellation must win after an atomic batch error');
assert.equal(lockTimeoutSettlements, 0, 'a cancelled run must not consume a lock-timeout retry');

console.log('Position cleanup worker cancellation-race tests passed.');
