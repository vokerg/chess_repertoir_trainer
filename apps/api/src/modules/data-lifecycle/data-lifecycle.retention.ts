export interface DataLifecycleRetentionConfig {
  auditRetentionDays: number;
  terminalOperationRetentionDays: number;
}

const DEFAULT_AUDIT_RETENTION_DAYS = 365;
const DEFAULT_TERMINAL_OPERATION_RETENTION_DAYS = 90;

export function readDataLifecycleRetentionConfig(
  env: NodeJS.ProcessEnv = process.env,
): DataLifecycleRetentionConfig {
  return {
    auditRetentionDays: readPositiveInteger(
      env['DATA_LIFECYCLE_AUDIT_RETENTION_DAYS'],
      DEFAULT_AUDIT_RETENTION_DAYS,
      'DATA_LIFECYCLE_AUDIT_RETENTION_DAYS',
    ),
    terminalOperationRetentionDays: readPositiveInteger(
      env['DATA_LIFECYCLE_OPERATION_RETENTION_DAYS'],
      DEFAULT_TERMINAL_OPERATION_RETENTION_DAYS,
      'DATA_LIFECYCLE_OPERATION_RETENTION_DAYS',
    ),
  };
}

export function retentionCutoff(now: Date, days: number): Date {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) throw new Error('now must be a valid Date.');
  if (!Number.isInteger(days) || days <= 0) throw new Error('Retention days must be a positive integer.');
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1_000);
}

function readPositiveInteger(raw: string | undefined, fallback: number, name: string): number {
  if (raw === undefined || raw.trim() === '') return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${name} must be a positive integer.`);
  return value;
}
