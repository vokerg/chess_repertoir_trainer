import assert from 'node:assert/strict';
import { loadAccountImportWorkerConfig } from '../../dist/modules/account-imports/account-import.worker.config.js';

assert.deepEqual(loadAccountImportWorkerConfig({}), {
  pollIntervalMs: 1_000,
  heartbeatIntervalMs: 15_000,
  staleAfterMs: 120_000,
  staleRecoveryIntervalMs: 30_000,
  shutdownTimeoutMs: 30_000,
  backlogRunThreshold: 20,
  backlogAgeMs: 300_000,
  backlogSustainedMs: 300_000,
});

assert.deepEqual(loadAccountImportWorkerConfig({
  ACCOUNT_IMPORT_WORKER_POLL_INTERVAL_MS: '2000',
  ACCOUNT_IMPORT_WORKER_HEARTBEAT_INTERVAL_MS: '10000',
  ACCOUNT_IMPORT_WORKER_STALE_AFTER_MS: '60000',
  ACCOUNT_IMPORT_WORKER_STALE_RECOVERY_INTERVAL_MS: '20000',
  ACCOUNT_IMPORT_WORKER_SHUTDOWN_TIMEOUT_MS: '45000',
  ACCOUNT_IMPORT_WORKER_BACKLOG_RUN_THRESHOLD: '30',
  ACCOUNT_IMPORT_WORKER_BACKLOG_AGE_MS: '120000',
  ACCOUNT_IMPORT_WORKER_BACKLOG_SUSTAINED_MS: '180000',
}), {
  pollIntervalMs: 2_000,
  heartbeatIntervalMs: 10_000,
  staleAfterMs: 60_000,
  staleRecoveryIntervalMs: 20_000,
  shutdownTimeoutMs: 45_000,
  backlogRunThreshold: 30,
  backlogAgeMs: 120_000,
  backlogSustainedMs: 180_000,
});

assert.throws(
  () => loadAccountImportWorkerConfig({ ACCOUNT_IMPORT_WORKER_POLL_INTERVAL_MS: '0' }),
  /positive integer/,
);
assert.throws(
  () => loadAccountImportWorkerConfig({
    ACCOUNT_IMPORT_WORKER_HEARTBEAT_INTERVAL_MS: '15000',
    ACCOUNT_IMPORT_WORKER_STALE_AFTER_MS: '30000',
  }),
  /greater than twice/,
);

console.log('Account import worker configuration tests passed.');
