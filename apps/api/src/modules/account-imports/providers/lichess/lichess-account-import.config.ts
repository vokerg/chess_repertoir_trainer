export interface LichessAccountImportConfig {
  windowDays: number;
  databaseWriteBatchSize: number;
}

export const DEFAULT_LICHESS_IMPORT_WINDOW_DAYS = 14;
export const DEFAULT_ACCOUNT_IMPORT_DATABASE_WRITE_BATCH_SIZE = 100;
export const LICHESS_RATE_LIMIT_COOLDOWN_MS = 60_000;

export function loadLichessAccountImportConfig(
  environment: NodeJS.ProcessEnv = process.env,
): LichessAccountImportConfig {
  return {
    windowDays: positiveInteger(
      environment['LICHESS_IMPORT_WINDOW_DAYS'],
      DEFAULT_LICHESS_IMPORT_WINDOW_DAYS,
      'LICHESS_IMPORT_WINDOW_DAYS',
    ),
    databaseWriteBatchSize: boundedPositiveInteger(
      environment['IMPORT_DATABASE_WRITE_BATCH_SIZE'],
      DEFAULT_ACCOUNT_IMPORT_DATABASE_WRITE_BATCH_SIZE,
      'IMPORT_DATABASE_WRITE_BATCH_SIZE',
      DEFAULT_ACCOUNT_IMPORT_DATABASE_WRITE_BATCH_SIZE,
    ),
  };
}

function positiveInteger(value: string | undefined, fallback: number, name: string): number {
  if (value === undefined || value.trim() === '') return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return parsed;
}

function boundedPositiveInteger(
  value: string | undefined,
  fallback: number,
  name: string,
  maximum: number,
): number {
  const parsed = positiveInteger(value, fallback, name);
  if (parsed > maximum) {
    throw new Error(`${name} must not exceed ${maximum}.`);
  }
  return parsed;
}
