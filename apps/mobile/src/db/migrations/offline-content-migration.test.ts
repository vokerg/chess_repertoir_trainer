import { describe, expect, it } from 'vitest';
import { offlineContentMigrationSql } from './0001-offline-content';

describe('offline content migration', () => {
  it('creates revisioned content and user-scoped synchronization tables', () => {
    for (const table of [
      'local_user',
      'course_manifest',
      'course_revision',
      'downloaded_course',
      'course_chapter',
      'course_line',
      'move_node',
      'training_subline',
      'training_subline_move',
      'sync_state',
    ]) {
      expect(offlineContentMigrationSql).toContain(`CREATE TABLE IF NOT EXISTS ${table}`);
    }
    expect(offlineContentMigrationSql).not.toMatch(/DROP TABLE/i);
  });
});
