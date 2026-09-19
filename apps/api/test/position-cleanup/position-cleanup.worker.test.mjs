import assert from 'node:assert/strict';
import { loadPositionCleanupConfig } from '../../dist/modules/position-cleanup/position-cleanup.config.js';
import { createPositionCleanupWorker } from '../../dist/modules/position-cleanup/position-cleanup.worker.service.js';

function unused(name) {
  return async () => {
    throw new Error(`Unexpected repository call: ${name}`);
  };
}

let claimCalls = 0;
let markClaimAttempted;
const claimAttempted = new Promise((resolve) => { markClaimAttempted = resolve; });
const repository = {
  assertDatabaseCapability: unused('assertDatabaseCapability'),
  getGraceCutoff: unused('getGraceCutoff'),
  createRun: unused('createRun'),
  getRun: unused('getRun'),
  claimNext: async () => {
    claimCalls += 1;
    markClaimAttempted();
    return null;
  },
  releaseClaim: unused('releaseClaim'),
  heartbeat: unused('heartbeat'),
  recoverStaleClaims: async () => 0,
  requestCancel: unused('requestCancel'),
  settleCancellation: unused('settleCancellation'),
  reconcileBatch: unused('reconcileBatch'),
  observeBatch: unused('observeBatch'),
  evaluateDryRunBatch: unused('evaluateDryRunBatch'),
  executeDeleteBatch: unused('executeDeleteBatch'),
  recordLockTimeout: unused('recordLockTimeout'),
  failClaimed: unused('failClaimed'),
};
const logger = { info() {}, warn() {}, error() {} };

const config = loadPositionCleanupConfig({
  POSITION_CLEANUP_ENABLED: 'true',
  POSITION_CLEANUP_POLL_INTERVAL_MS: '10000',
  POSITION_CLEANUP_HEARTBEAT_INTERVAL_MS: '1000',
  POSITION_CLEANUP_STALE_AFTER_MS: '5000',
});
const worker = createPositionCleanupWorker({ config, repository, logger });
const runPromise = worker.run();
await claimAttempted;
worker.requestStop();

await Promise.race([
  runPromise,
  new Promise((_, reject) => setTimeout(
    () => reject(new Error('Position cleanup worker did not wake promptly during shutdown.')),
    500,
  )),
]);
assert.equal(claimCalls, 1, 'shutdown must wake the idle poll without another claim iteration');

let disabledClaimCalls = 0;
const disabledWorker = createPositionCleanupWorker({
  config: loadPositionCleanupConfig({}),
  repository: {
    ...repository,
    claimNext: async () => {
      disabledClaimCalls += 1;
      return null;
    },
  },
  logger,
});
await disabledWorker.run();
assert.equal(disabledClaimCalls, 0, 'disabled cleanup must never enter the claim loop');

console.log('Position cleanup worker shutdown tests passed.');
