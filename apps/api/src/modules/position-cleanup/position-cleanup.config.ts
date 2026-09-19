export interface PositionCleanupConfig {
  enabled: boolean;
  graceDays: number;
  inputPageSize: number;
  deleteBatchSize: number;
  lockTimeoutMs: number;
  pollIntervalMs: number;
  heartbeatIntervalMs: number;
  staleAfterMs: number;
  staleRecoveryIntervalMs: number;
  shutdownTimeoutMs: number;
}

export const POSITION_CLEANUP_MAX_INPUT_PAGE_SIZE = 500;
export const POSITION_CLEANUP_DEFAULT_GRACE_DAYS = 30;
export const POSITION_CLEANUP_POLICY_VERSION = 'ONB-026-v1';
export const POSITION_CLEANUP_MIN_POSTGRES_SERVER_VERSION_NUM = 100000;

const DEFAULT_INPUT_PAGE_SIZE = 500;
const DEFAULT_DELETE_BATCH_SIZE = 100;
const DEFAULT_LOCK_TIMEOUT_MS = 250;
const DEFAULT_POLL_INTERVAL_MS = 1_000;
const DEFAULT_HEARTBEAT_INTERVAL_MS = 10_000;
const DEFAULT_STALE_AFTER_MS = 60_000;
const DEFAULT_STALE_RECOVERY_INTERVAL_MS = 30_000;
const DEFAULT_SHUTDOWN_TIMEOUT_MS = 30_000;

export function loadPositionCleanupConfig(
  environment: NodeJS.ProcessEnv = process.env,
): PositionCleanupConfig {
  const inputPageSize = boundedPositiveInteger(
    environment['POSITION_CLEANUP_INPUT_PAGE_SIZE'],
    DEFAULT_INPUT_PAGE_SIZE,
    POSITION_CLEANUP_MAX_INPUT_PAGE_SIZE,
    'POSITION_CLEANUP_INPUT_PAGE_SIZE',
  );
  const deleteBatchSize = boundedPositiveInteger(
    environment['POSITION_CLEANUP_DELETE_BATCH_SIZE'],
    DEFAULT_DELETE_BATCH_SIZE,
    POSITION_CLEANUP_MAX_INPUT_PAGE_SIZE,
    'POSITION_CLEANUP_DELETE_BATCH_SIZE',
  );
  if (deleteBatchSize > inputPageSize) {
    throw new Error('POSITION_CLEANUP_DELETE_BATCH_SIZE must not exceed POSITION_CLEANUP_INPUT_PAGE_SIZE.');
  }

  const config: PositionCleanupConfig = {
    enabled: explicitBoolean(environment['POSITION_CLEANUP_ENABLED'], false, 'POSITION_CLEANUP_ENABLED'),
    graceDays: boundedPositiveInteger(
      environment['POSITION_CLEANUP_GRACE_DAYS'],
      POSITION_CLEANUP_DEFAULT_GRACE_DAYS,
      3650,
      'POSITION_CLEANUP_GRACE_DAYS',
      POSITION_CLEANUP_DEFAULT_GRACE_DAYS,
    ),
    inputPageSize,
    deleteBatchSize,
    lockTimeoutMs: boundedPositiveInteger(
      environment['POSITION_CLEANUP_LOCK_TIMEOUT_MS'],
      DEFAULT_LOCK_TIMEOUT_MS,
      5_000,
      'POSITION_CLEANUP_LOCK_TIMEOUT_MS',
    ),
    pollIntervalMs: positiveInteger(
      environment['POSITION_CLEANUP_POLL_INTERVAL_MS'],
      DEFAULT_POLL_INTERVAL_MS,
      'POSITION_CLEANUP_POLL_INTERVAL_MS',
    ),
    heartbeatIntervalMs: positiveInteger(
      environment['POSITION_CLEANUP_HEARTBEAT_INTERVAL_MS'],
      DEFAULT_HEARTBEAT_INTERVAL_MS,
      'POSITION_CLEANUP_HEARTBEAT_INTERVAL_MS',
    ),
    staleAfterMs: positiveInteger(
      environment['POSITION_CLEANUP_STALE_AFTER_MS'],
      DEFAULT_STALE_AFTER_MS,
      'POSITION_CLEANUP_STALE_AFTER_MS',
    ),
    staleRecoveryIntervalMs: positiveInteger(
      environment['POSITION_CLEANUP_STALE_RECOVERY_INTERVAL_MS'],
      DEFAULT_STALE_RECOVERY_INTERVAL_MS,
      'POSITION_CLEANUP_STALE_RECOVERY_INTERVAL_MS',
    ),
    shutdownTimeoutMs: positiveInteger(
      environment['POSITION_CLEANUP_SHUTDOWN_TIMEOUT_MS'],
      DEFAULT_SHUTDOWN_TIMEOUT_MS,
      'POSITION_CLEANUP_SHUTDOWN_TIMEOUT_MS',
    ),
  };

  if (config.staleAfterMs <= config.heartbeatIntervalMs * 2) {
    throw new Error(
      'POSITION_CLEANUP_STALE_AFTER_MS must be greater than twice POSITION_CLEANUP_HEARTBEAT_INTERVAL_MS.',
    );
  }
  return config;
}

function explicitBoolean(value: string | undefined, fallback: boolean, name: string): boolean {
  if (value === undefined || value.trim() === '') return fallback;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new Error(`${name} must be either true or false.`);
}

function positiveInteger(value: string | undefined, fallback: number, name: string): number {
  if (value === undefined || value.trim() === '') return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new Error(`${name} must be a positive integer.`);
  return parsed;
}

function boundedPositiveInteger(
  value: string | undefined,
  fallback: number,
  maximum: number,
  name: string,
  minimum = 1,
): number {
  const parsed = positiveInteger(value, fallback, name);
  if (parsed < minimum) throw new Error(`${name} must be at least ${minimum}.`);
  if (parsed > maximum) throw new Error(`${name} must not exceed ${maximum}.`);
  return parsed;
}
