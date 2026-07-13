export const OFFLINE_MARATHON_SCHEMA_VERSION = 4;

export const offlineMarathonMigrationSql = `
ALTER TABLE local_training_session
ADD COLUMN training_mode TEXT NOT NULL DEFAULT 'LINE'
  CHECK (training_mode IN ('LINE', 'MARATHON', 'WEAK_SUBLINES', 'UNTRAINED_SUBLINES', 'MIXED_WEAK_UNTRAINED'));

ALTER TABLE local_training_session
ADD COLUMN marathon_run_id TEXT;

CREATE TABLE IF NOT EXISTS local_training_marathon_run (
  app_user_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  course_id INTEGER NOT NULL,
  content_revision INTEGER NOT NULL,
  scope_type TEXT NOT NULL CHECK (scope_type IN ('COURSE', 'CHAPTER')),
  scope_id INTEGER NOT NULL,
  scope_name TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('ALL', 'WEAK_SUBLINES', 'UNTRAINED_SUBLINES', 'MIXED_WEAK_UNTRAINED')),
  status TEXT NOT NULL CHECK (status IN ('IN_PROGRESS', 'COMPLETED', 'ABANDONED', 'ERROR')),
  current_session_id TEXT,
  recent_subline_keys_json TEXT NOT NULL DEFAULT '[]',
  served_untrained_keys_json TEXT NOT NULL DEFAULT '[]',
  completed_count INTEGER NOT NULL DEFAULT 0,
  started_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT,
  PRIMARY KEY (app_user_id, run_id),
  FOREIGN KEY (app_user_id) REFERENCES local_user(app_user_id) ON DELETE CASCADE,
  FOREIGN KEY (app_user_id, course_id, content_revision)
    REFERENCES course_revision(app_user_id, course_id, content_revision)
);

CREATE UNIQUE INDEX IF NOT EXISTS local_training_marathon_active_scope_idx
  ON local_training_marathon_run(app_user_id, course_id, content_revision, scope_type, scope_id)
  WHERE status = 'IN_PROGRESS';
CREATE INDEX IF NOT EXISTS local_training_marathon_user_history_idx
  ON local_training_marathon_run(app_user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS local_training_session_marathon_idx
  ON local_training_session(app_user_id, marathon_run_id, updated_at DESC);
`;
