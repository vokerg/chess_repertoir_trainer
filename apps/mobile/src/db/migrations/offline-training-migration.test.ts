import { describe, expect, it } from 'vitest';
import { OFFLINE_TRAINING_SCHEMA_VERSION, offlineTrainingMigrationSql } from './0002-offline-training';

describe('offline training migration', () => {
  it('adds durable sessions, events, attempts, and an upload outbox', () => {
    expect(OFFLINE_TRAINING_SCHEMA_VERSION).toBe(2);
    for (const table of [
      'local_training_session',
      'local_training_event',
      'local_training_attempt',
      'training_attempt_outbox',
    ]) {
      expect(offlineTrainingMigrationSql).toContain(`CREATE TABLE IF NOT EXISTS ${table}`);
    }
    expect(offlineTrainingMigrationSql).toContain("WHERE local_status = 'IN_PROGRESS'");
    expect(offlineTrainingMigrationSql).not.toMatch(/DROP TABLE/i);
  });
});
