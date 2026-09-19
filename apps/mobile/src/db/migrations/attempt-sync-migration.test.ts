import { describe, expect, it } from 'vitest';
import { ATTEMPT_SYNC_SCHEMA_VERSION, attemptSyncMigrationSql } from './0003-attempt-sync';

describe('attempt synchronization migration', () => {
  it('adds a durable installation id and retry scheduling', () => {
    expect(ATTEMPT_SYNC_SCHEMA_VERSION).toBe(3);
    expect(attemptSyncMigrationSql).toContain('CREATE TABLE IF NOT EXISTS mobile_installation');
    expect(attemptSyncMigrationSql).toContain('ADD COLUMN next_attempt_at TEXT');
    expect(attemptSyncMigrationSql).toContain('training_attempt_outbox_retry_idx');
    expect(attemptSyncMigrationSql).not.toMatch(/DROP TABLE/i);
  });
});
