import { describe, expect, it } from 'vitest';
import {
  OFFLINE_MARATHON_SCHEMA_VERSION,
  offlineMarathonMigrationSql,
} from './0004-offline-marathon';

describe('offline marathon migration', () => {
  it('adds durable marathon runs without rebuilding existing attempt tables', () => {
    expect(OFFLINE_MARATHON_SCHEMA_VERSION).toBe(4);
    expect(offlineMarathonMigrationSql).toContain('ADD COLUMN training_mode TEXT');
    expect(offlineMarathonMigrationSql).toContain('ADD COLUMN marathon_run_id TEXT');
    expect(offlineMarathonMigrationSql).toContain('CREATE TABLE IF NOT EXISTS local_training_marathon_run');
    expect(offlineMarathonMigrationSql).toContain('local_training_marathon_active_scope_idx');
    expect(offlineMarathonMigrationSql).not.toMatch(/DROP TABLE/i);
  });
});
