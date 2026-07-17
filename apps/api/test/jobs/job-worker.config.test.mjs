import assert from 'node:assert/strict';
import {
  loadJobWorkerConfig,
} from '../../dist/modules/jobs/job-worker.config.js';

assert.deepEqual(loadJobWorkerConfig({}), {
  pollIntervalMs: 1_000,
  heartbeatIntervalMs: 30_000,
  staleAfterMs: 900_000,
  staleRecoveryIntervalMs: 60_000,
  sliceSize: 25,
  shutdownTimeoutMs: 30_000,
});

assert.deepEqual(loadJobWorkerConfig({
  JOB_WORKER_POLL_INTERVAL_MS: '250',
  JOB_WORKER_HEARTBEAT_INTERVAL_MS: '1000',
  JOB_WORKER_STALE_AFTER_MS: '3000',
  JOB_WORKER_STALE_RECOVERY_INTERVAL_MS: '500',
  JOB_WORKER_SLICE_SIZE: '10',
  JOB_WORKER_SHUTDOWN_TIMEOUT_MS: '2000',
}), {
  pollIntervalMs: 250,
  heartbeatIntervalMs: 1_000,
  staleAfterMs: 3_000,
  staleRecoveryIntervalMs: 500,
  sliceSize: 10,
  shutdownTimeoutMs: 2_000,
});

assert.throws(
  () => loadJobWorkerConfig({ JOB_WORKER_SLICE_SIZE: '0' }),
  /positive integer/,
);
assert.throws(
  () => loadJobWorkerConfig({
    JOB_WORKER_HEARTBEAT_INTERVAL_MS: '1000',
    JOB_WORKER_STALE_AFTER_MS: '2000',
  }),
  /greater than twice/,
);

console.log('Persistent job worker config tests passed.');
