export const OFFLINE_CONTENT_SCHEMA_VERSION = 1;

export const offlineContentMigrationSql = `
CREATE TABLE IF NOT EXISTS local_user (
  app_user_id TEXT PRIMARY KEY NOT NULL,
  display_name TEXT,
  email TEXT,
  last_authenticated_at TEXT NOT NULL,
  last_used_at TEXT NOT NULL,
  locked_at TEXT
);

CREATE TABLE IF NOT EXISTS course_manifest (
  app_user_id TEXT NOT NULL,
  course_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  server_content_revision INTEGER NOT NULL,
  server_content_changed_at TEXT NOT NULL,
  estimated_bundle_bytes INTEGER,
  last_manifest_seen_at TEXT NOT NULL,
  available_on_server INTEGER NOT NULL DEFAULT 1 CHECK (available_on_server IN (0, 1)),
  PRIMARY KEY (app_user_id, course_id),
  FOREIGN KEY (app_user_id) REFERENCES local_user(app_user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS course_revision (
  app_user_id TEXT NOT NULL,
  course_id INTEGER NOT NULL,
  content_revision INTEGER NOT NULL,
  bundle_schema_version INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('STAGING', 'ACTIVE', 'RETIRED')),
  course_name TEXT NOT NULL,
  course_description TEXT,
  generated_at TEXT NOT NULL,
  downloaded_at TEXT NOT NULL,
  activated_at TEXT,
  PRIMARY KEY (app_user_id, course_id, content_revision),
  FOREIGN KEY (app_user_id) REFERENCES local_user(app_user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS downloaded_course (
  app_user_id TEXT NOT NULL,
  course_id INTEGER NOT NULL,
  active_content_revision INTEGER,
  bundle_schema_version INTEGER,
  download_status TEXT NOT NULL CHECK (download_status IN ('DOWNLOADING', 'AVAILABLE', 'ERROR')),
  downloaded_at TEXT,
  last_verified_at TEXT,
  last_error TEXT,
  PRIMARY KEY (app_user_id, course_id),
  FOREIGN KEY (app_user_id) REFERENCES local_user(app_user_id) ON DELETE CASCADE,
  FOREIGN KEY (app_user_id, course_id, active_content_revision)
    REFERENCES course_revision(app_user_id, course_id, content_revision)
);

CREATE TABLE IF NOT EXISTS course_chapter (
  app_user_id TEXT NOT NULL,
  course_id INTEGER NOT NULL,
  content_revision INTEGER NOT NULL,
  chapter_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL,
  PRIMARY KEY (app_user_id, course_id, content_revision, chapter_id),
  FOREIGN KEY (app_user_id, course_id, content_revision)
    REFERENCES course_revision(app_user_id, course_id, content_revision) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS course_line (
  app_user_id TEXT NOT NULL,
  course_id INTEGER NOT NULL,
  content_revision INTEGER NOT NULL,
  line_id INTEGER NOT NULL,
  chapter_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  side_to_train TEXT NOT NULL CHECK (side_to_train IN ('WHITE', 'BLACK')),
  starting_fen TEXT NOT NULL,
  notes TEXT,
  tags_json TEXT NOT NULL,
  PRIMARY KEY (app_user_id, course_id, content_revision, line_id),
  FOREIGN KEY (app_user_id, course_id, content_revision, chapter_id)
    REFERENCES course_chapter(app_user_id, course_id, content_revision, chapter_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS move_node (
  app_user_id TEXT NOT NULL,
  course_id INTEGER NOT NULL,
  content_revision INTEGER NOT NULL,
  node_id INTEGER NOT NULL,
  line_id INTEGER NOT NULL,
  parent_id INTEGER,
  ply_number INTEGER NOT NULL,
  fen_before TEXT NOT NULL,
  fen_after TEXT NOT NULL,
  move_uci TEXT NOT NULL,
  move_san TEXT NOT NULL,
  move_number INTEGER NOT NULL,
  color_to_move_before TEXT NOT NULL CHECK (color_to_move_before IN ('WHITE', 'BLACK')),
  side TEXT NOT NULL CHECK (side IN ('WHITE', 'BLACK')),
  is_user_move INTEGER NOT NULL CHECK (is_user_move IN (0, 1)),
  is_correct_user_move INTEGER NOT NULL CHECK (is_correct_user_move IN (0, 1)),
  sort_order INTEGER NOT NULL,
  branch_label TEXT,
  branch_weight REAL,
  comment TEXT,
  annotation TEXT,
  PRIMARY KEY (app_user_id, course_id, content_revision, node_id),
  FOREIGN KEY (app_user_id, course_id, content_revision, line_id)
    REFERENCES course_line(app_user_id, course_id, content_revision, line_id) ON DELETE CASCADE,
  FOREIGN KEY (app_user_id, course_id, content_revision, parent_id)
    REFERENCES move_node(app_user_id, course_id, content_revision, node_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS training_subline (
  app_user_id TEXT NOT NULL,
  course_id INTEGER NOT NULL,
  content_revision INTEGER NOT NULL,
  subline_hash TEXT NOT NULL,
  subline_key_version INTEGER NOT NULL,
  line_id INTEGER NOT NULL,
  leaf_node_id INTEGER NOT NULL,
  starting_fen TEXT NOT NULL,
  side_to_train TEXT NOT NULL CHECK (side_to_train IN ('WHITE', 'BLACK')),
  PRIMARY KEY (app_user_id, course_id, content_revision, subline_hash, subline_key_version),
  FOREIGN KEY (app_user_id, course_id, content_revision, line_id)
    REFERENCES course_line(app_user_id, course_id, content_revision, line_id) ON DELETE CASCADE,
  FOREIGN KEY (app_user_id, course_id, content_revision, leaf_node_id)
    REFERENCES move_node(app_user_id, course_id, content_revision, node_id)
);

CREATE TABLE IF NOT EXISTS training_subline_move (
  app_user_id TEXT NOT NULL,
  course_id INTEGER NOT NULL,
  content_revision INTEGER NOT NULL,
  subline_hash TEXT NOT NULL,
  subline_key_version INTEGER NOT NULL,
  sequence INTEGER NOT NULL,
  node_id INTEGER NOT NULL,
  move_uci TEXT NOT NULL,
  move_san TEXT NOT NULL,
  fen_before TEXT NOT NULL,
  fen_after TEXT NOT NULL,
  is_user_move INTEGER NOT NULL CHECK (is_user_move IN (0, 1)),
  comment TEXT,
  annotation TEXT,
  branch_label TEXT,
  PRIMARY KEY (
    app_user_id,
    course_id,
    content_revision,
    subline_hash,
    subline_key_version,
    sequence
  ),
  FOREIGN KEY (app_user_id, course_id, content_revision, subline_hash, subline_key_version)
    REFERENCES training_subline(
      app_user_id,
      course_id,
      content_revision,
      subline_hash,
      subline_key_version
    ) ON DELETE CASCADE,
  FOREIGN KEY (app_user_id, course_id, content_revision, node_id)
    REFERENCES move_node(app_user_id, course_id, content_revision, node_id)
);

CREATE TABLE IF NOT EXISTS sync_state (
  app_user_id TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (app_user_id, key),
  FOREIGN KEY (app_user_id) REFERENCES local_user(app_user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS course_manifest_user_available_idx
  ON course_manifest(app_user_id, available_on_server, name);
CREATE INDEX IF NOT EXISTS course_revision_status_idx
  ON course_revision(app_user_id, course_id, status);
CREATE INDEX IF NOT EXISTS course_chapter_order_idx
  ON course_chapter(app_user_id, course_id, content_revision, sort_order, chapter_id);
CREATE INDEX IF NOT EXISTS course_line_chapter_idx
  ON course_line(app_user_id, course_id, content_revision, chapter_id, line_id);
CREATE INDEX IF NOT EXISTS move_node_line_idx
  ON move_node(app_user_id, course_id, content_revision, line_id, parent_id, sort_order);
CREATE INDEX IF NOT EXISTS training_subline_line_idx
  ON training_subline(app_user_id, course_id, content_revision, line_id);
`;
