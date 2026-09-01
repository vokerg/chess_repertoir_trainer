export interface AccountGameDataLifecycleWorkerConfig {
  pollIntervalMs: number;
  heartbeatIntervalMs: number;
  staleAfterMs: number;
  staleRecoveryIntervalMs: number;
  shutdownTimeoutMs: number;
}

const DEFAULT_POLL_INTERVAL_MS = 1_000;
const DEFAULT_HEARTBEAT_INTERVAL_MS = 10_000;
const DEFAULT_STALE_AFTER_MS = 60_000;
const DEFAULT_STALE_RECOVERY_INTERVAL_MS = 30_000;
const DEFAULT_SHUTDOWN_TIMEOUT_MS = 30_000;

export function loadAccountGameDataLifecycleWorkerConfig(
  environment: NodeJS.ProcessEnv = process.env,
): AccountGameDataLifecycleWorkerConfig {
  const config: AccountGameDataLifecycleWorkerConfig = {
    pollIntervalMs: positiveInteger(
      environment['DATA_LIFECYCLE_WORKER_POLL_INTERVAL_MS'],
      DEFAULT_POLL_INTERVAL_MS,
      'DATA_LIFECYCLE_WORKER_POLL_INTERVAL_MS',
    ),
    heartbeatIntervalMs: positiveInteger(
      environment['DATA_LIFECYCLE_WORKER_HEARTBEAT_INTERVAL_MS'],
      DEFAULT_HEARTBEAT_INTERVAL_MS,
      'DATA_LIFECYCLE_WORKER_HEARTBEAT_INTERVAL_MS',
    ),
    staleAfterMs: positiveInteger(
      environment['DATA_LIFECYCLE_WORKER_STALE_AFTER_MS'],
      DEFAULT_STALE_AFTER_MS,
      'DATA_LIFECYCLE_WORKER_STALE_AFTER_MS',
    ),
    staleRecoveryIntervalMs: positiveInteger(
      environment['DATA_LIFECYCLE_WORKER_STALE_RECOVERY_INTERVAL_MS'],
      DEFAULT_STALE_RECOVERY_INTERVAL_MS,
      'DATA_LIFECYCLE_WORKER_STALE_RECOVERY_INTERVAL_MS',
    ),
    shutdownTimeoutMs: positiveInteger(
      environment['DATA_LIFECYCLE_WORKER_SHUTDOWN_TIMEOUT_MS'],
      DEFAULT_SHUTDOWN_TIMEOUT_MS,
      'DATA_LIFECYCLE_WORKER_SHUTDOWN_TIMEOUT_MS',
    ),
  };

  if (config.staleAfterMs <= config.heartbeatIntervalMs * 2) {
    throw new Error(
      'DATA_LIFECYCLE_WORKER_STALE_AFTER_MS must be greater than twice DATA_LIFECYCLE_WORKER_HEARTBEAT_INTERVAL_MS.',
    );
  }
  return config;
}

function positiveInteger(value: string | undefined, fallback: number, name: string): number {
  if (value === undefined || value.trim() === '') return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new Error(`${name} must be a positive integer.`);
  return parsed;
}
