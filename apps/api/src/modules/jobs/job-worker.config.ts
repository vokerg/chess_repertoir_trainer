export interface JobWorkerConfig {
  pollIntervalMs: number;
  heartbeatIntervalMs: number;
  staleAfterMs: number;
  staleRecoveryIntervalMs: number;
  sliceSize: number;
  shutdownTimeoutMs: number;
}

const DEFAULT_POLL_INTERVAL_MS = 1_000;
const DEFAULT_HEARTBEAT_INTERVAL_MS = 30_000;
const DEFAULT_STALE_AFTER_MS = 15 * 60_000;
const DEFAULT_STALE_RECOVERY_INTERVAL_MS = 60_000;
const DEFAULT_SLICE_SIZE = 25;
const DEFAULT_SHUTDOWN_TIMEOUT_MS = 30_000;

export function loadJobWorkerConfig(
  environment: NodeJS.ProcessEnv = process.env,
): JobWorkerConfig {
  const config: JobWorkerConfig = {
    pollIntervalMs: positiveInteger(
      environment['JOB_WORKER_POLL_INTERVAL_MS'],
      DEFAULT_POLL_INTERVAL_MS,
      'JOB_WORKER_POLL_INTERVAL_MS',
    ),
    heartbeatIntervalMs: positiveInteger(
      environment['JOB_WORKER_HEARTBEAT_INTERVAL_MS'],
      DEFAULT_HEARTBEAT_INTERVAL_MS,
      'JOB_WORKER_HEARTBEAT_INTERVAL_MS',
    ),
    staleAfterMs: positiveInteger(
      environment['JOB_WORKER_STALE_AFTER_MS'],
      DEFAULT_STALE_AFTER_MS,
      'JOB_WORKER_STALE_AFTER_MS',
    ),
    staleRecoveryIntervalMs: positiveInteger(
      environment['JOB_WORKER_STALE_RECOVERY_INTERVAL_MS'],
      DEFAULT_STALE_RECOVERY_INTERVAL_MS,
      'JOB_WORKER_STALE_RECOVERY_INTERVAL_MS',
    ),
    sliceSize: positiveInteger(
      environment['JOB_WORKER_SLICE_SIZE'],
      DEFAULT_SLICE_SIZE,
      'JOB_WORKER_SLICE_SIZE',
    ),
    shutdownTimeoutMs: positiveInteger(
      environment['JOB_WORKER_SHUTDOWN_TIMEOUT_MS'],
      DEFAULT_SHUTDOWN_TIMEOUT_MS,
      'JOB_WORKER_SHUTDOWN_TIMEOUT_MS',
    ),
  };

  if (config.staleAfterMs <= config.heartbeatIntervalMs * 2) {
    throw new Error(
      'JOB_WORKER_STALE_AFTER_MS must be greater than twice JOB_WORKER_HEARTBEAT_INTERVAL_MS.',
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
