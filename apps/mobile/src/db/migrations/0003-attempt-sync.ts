export const ATTEMPT_SYNC_SCHEMA_VERSION = 3;

export const attemptSyncMigrationSql = `
CREATE TABLE IF NOT EXISTS mobile_installation (
  singleton_id INTEGER PRIMARY KEY NOT NULL CHECK (singleton_id = 1),
  device_id TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);

ALTER TABLE training_attempt_outbox
ADD COLUMN next_attempt_at TEXT;

CREATE INDEX IF NOT EXISTS training_attempt_outbox_retry_idx
  ON training_attempt_outbox(app_user_id, state, next_attempt_at, created_at);
`;
