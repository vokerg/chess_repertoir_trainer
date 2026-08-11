export interface AccountImportWorkerConfig {
  pollIntervalMs: number;
  heartbeatIntervalMs: number;
  staleAfterMs: number;
  staleRecoveryIntervalMs: number;
  shutdownTimeoutMs: number;
  backlogRunThreshold: number;
  backlogAgeMs: number;
  backlogSustainedMs: number;
}

const DEFAULT_POLL_INTERVAL_MS = 1_000;
const DEFAULT_HEARTBEAT_INTERVAL_MS = 15_000;
const DEFAULT_STALE_AFTER_MS = 2 * 60_000;
const DEFAULT_STALE_RECOVERY_INTERVAL_MS = 30_000;
const DEFAULT_SHUTDOWN_TIMEOUT_MS = 30_000;
const DEFAULT_BACKLOG_RUN_THRESHOLD = 20;
const DEFAULT_BACKLOG_AGE_MS = 5 * 60_000;
const DEFAULT_BACKLOG_SUSTAINED_MS = 5 * 60_000;

export function loadAccountImportWorkerConfig(
  environment: NodeJS.ProcessEnv = process.env,
): AccountImportWorkerConfig {
  const config: AccountImportWorkerConfig = {
    pollIntervalMs: positiveInteger(
      environment['ACCOUNT_IMPORT_WORKER_POLL_INTERVAL_MS'],
      DEFAULT_POLL_INTERVAL_MS,
      'ACCOUNT_IMPORT_WORKER_POLL_INTERVAL_MS',
    ),
    heartbeatIntervalMs: positiveInteger(
      environment['ACCOUNT_IMPORT_WORKER_HEARTBEAT_INTERVAL_MS'],
      DEFAULT_HEARTBEAT_INTERVAL_MS,
      'ACCOUNT_IMPORT_WORKER_HEARTBEAT_INTERVAL_MS',
    ),
    staleAfterMs: positiveInteger(
      environment['ACCOUNT_IMPORT_WORKER_STALE_AFTER_MS'],
      DEFAULT_STALE_AFTER_MS,
      'ACCOUNT_IMPORT_WORKER_STALE_AFTER_MS',
    ),
    staleRecoveryIntervalMs: positiveInteger(
      environment['ACCOUNT_IMPORT_WORKER_STALE_RECOVERY_INTERVAL_MS'],
      DEFAULT_STALE_RECOVERY_INTERVAL_MS,
      'ACCOUNT_IMPORT_WORKER_STALE_RECOVERY_INTERVAL_MS',
    ),
    shutdownTimeoutMs: positiveInteger(
      environment['ACCOUNT_IMPORT_WORKER_SHUTDOWN_TIMEOUT_MS'],
      DEFAULT_SHUTDOWN_TIMEOUT_MS,
      'ACCOUNT_IMPORT_WORKER_SHUTDOWN_TIMEOUT_MS',
    ),
    backlogRunThreshold: positiveInteger(
      environment['ACCOUNT_IMPORT_WORKER_BACKLOG_RUN_THRESHOLD'],
      DEFAULT_BACKLOG_RUN_THRESHOLD,
      'ACCOUNT_IMPORT_WORKER_BACKLOG_RUN_THRESHOLD',
    ),
    backlogAgeMs: positiveInteger(
      environment['ACCOUNT_IMPORT_WORKER_BACKLOG_AGE_MS'],
      DEFAULT_BACKLOG_AGE_MS,
      'ACCOUNT_IMPORT_WORKER_BACKLOG_AGE_MS',
    ),
    backlogSustainedMs: positiveInteger(
      environment['ACCOUNT_IMPORT_WORKER_BACKLOG_SUSTAINED_MS'],
      DEFAULT_BACKLOG_SUSTAINED_MS,
      'ACCOUNT_IMPORT_WORKER_BACKLOG_SUSTAINED_MS',
    ),
  };

  if (config.staleAfterMs <= config.heartbeatIntervalMs * 2) {
    throw new Error(
      'ACCOUNT_IMPORT_WORKER_STALE_AFTER_MS must be greater than twice ACCOUNT_IMPORT_WORKER_HEARTBEAT_INTERVAL_MS.',
    );
  }

  return config;
}

function positiveInteger(
  value: string | undefined,
  fallback: number,
  name: string,
): number {
  if (value === undefined || value.trim() === '') return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return parsed;
}
