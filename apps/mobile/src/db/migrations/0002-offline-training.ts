export const OFFLINE_TRAINING_SCHEMA_VERSION = 2;

export const offlineTrainingMigrationSql = `
CREATE TABLE IF NOT EXISTS local_training_session (
  app_user_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  course_id INTEGER NOT NULL,
  content_revision INTEGER NOT NULL,
  line_id INTEGER NOT NULL,
  subline_hash TEXT NOT NULL,
  subline_key_version INTEGER NOT NULL,
  local_status TEXT NOT NULL CHECK (local_status IN ('IN_PROGRESS', 'COMPLETED', 'ABANDONED', 'ERROR')),
  session_json TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (app_user_id, session_id),
  FOREIGN KEY (app_user_id) REFERENCES local_user(app_user_id) ON DELETE CASCADE,
  FOREIGN KEY (app_user_id, course_id, content_revision, line_id)
    REFERENCES course_line(app_user_id, course_id, content_revision, line_id),
  FOREIGN KEY (app_user_id, course_id, content_revision, subline_hash, subline_key_version)
    REFERENCES training_subline(
      app_user_id,
      course_id,
      content_revision,
      subline_hash,
      subline_key_version
    )
);

CREATE TABLE IF NOT EXISTS local_training_event (
  app_user_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  sequence INTEGER NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('MOVE_ATTEMPT', 'MISSED_ON_EARLY_FINISH')),
  occurred_at TEXT NOT NULL,
  fen_before TEXT NOT NULL,
  expected_node_id INTEGER NOT NULL,
  expected_move_uci TEXT NOT NULL,
  played_move_uci TEXT,
  was_correct INTEGER NOT NULL CHECK (was_correct IN (0, 1)),
  PRIMARY KEY (app_user_id, session_id, sequence),
  FOREIGN KEY (app_user_id, session_id)
    REFERENCES local_training_session(app_user_id, session_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS local_training_attempt (
  app_user_id TEXT NOT NULL,
  client_attempt_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  course_id INTEGER NOT NULL,
  content_revision INTEGER NOT NULL,
  line_id INTEGER NOT NULL,
  subline_hash TEXT NOT NULL,
  subline_key_version INTEGER NOT NULL,
  training_mode TEXT NOT NULL,
  result TEXT NOT NULL CHECK (result IN ('PASSED', 'FAILED')),
  mistakes_count INTEGER NOT NULL,
  total_expected_moves INTEGER NOT NULL,
  correct_moves INTEGER NOT NULL,
  accuracy REAL,
  started_at TEXT NOT NULL,
  completed_at TEXT NOT NULL,
  session_json TEXT NOT NULL,
  subline_json TEXT NOT NULL,
  attempt_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (app_user_id, client_attempt_id),
  UNIQUE (app_user_id, session_id),
  FOREIGN KEY (app_user_id, session_id)
    REFERENCES local_training_session(app_user_id, session_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS training_attempt_outbox (
  app_user_id TEXT NOT NULL,
  client_attempt_id TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('PENDING', 'SENDING', 'ACCEPTED', 'REJECTED')),
  payload_json TEXT NOT NULL,
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TEXT,
  last_error TEXT,
  server_training_session_id INTEGER,
  server_received_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (app_user_id, client_attempt_id),
  FOREIGN KEY (app_user_id, client_attempt_id)
    REFERENCES local_training_attempt(app_user_id, client_attempt_id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS local_training_session_active_line_idx
  ON local_training_session(app_user_id, line_id)
  WHERE local_status = 'IN_PROGRESS';
CREATE INDEX IF NOT EXISTS local_training_session_line_history_idx
  ON local_training_session(app_user_id, line_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS local_training_attempt_line_idx
  ON local_training_attempt(app_user_id, line_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS training_attempt_outbox_state_idx
  ON training_attempt_outbox(app_user_id, state, created_at);
`;
