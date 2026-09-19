import { describe, expect, it, vi } from 'vitest';
import type { SQLiteDatabase } from 'expo-sqlite';
import {
  MobileApiError,
  isMobileDeletionSignal,
} from '../../api/mobile-api-client';
import { offlineContentMigrationSql } from '../migrations/0001-offline-content';
import { offlineTrainingMigrationSql } from '../migrations/0002-offline-training';
import { offlineMarathonMigrationSql } from '../migrations/0004-offline-marathon';
import { deleteLocalUser } from './local-user.repository';

describe('whole-user deletion mobile purge handshake', () => {
  it('recognizes only typed deletion responses as purge commands', () => {
    expect(isMobileDeletionSignal(new MobileApiError(
      'deleting',
      423,
      {
        code: 'DATA_LIFECYCLE_DELETION_IN_PROGRESS',
        operationId: 17,
        purgeLocalData: true,
      },
    ))).toBe(true);

    expect(isMobileDeletionSignal(new MobileApiError(
      'deleted',
      410,
      {
        code: 'DATA_LIFECYCLE_IDENTITY_DELETED',
        operationId: 17,
        purgeLocalData: true,
      },
    ))).toBe(true);

    expect(isMobileDeletionSignal(new MobileApiError(
      'ordinary conflict',
      409,
      {
        code: 'DATA_LIFECYCLE_CONFLICT',
        purgeLocalData: true,
      },
    ))).toBe(false);

    expect(isMobileDeletionSignal(new MobileApiError(
      'untrusted shape',
      410,
      {
        code: 'DATA_LIFECYCLE_IDENTITY_DELETED',
        purgeLocalData: false,
      },
    ))).toBe(false);
  });

  it('keeps every offline-data root under a cascading local_user ownership chain', () => {
    const schema = [
      offlineContentMigrationSql,
      offlineTrainingMigrationSql,
      offlineMarathonMigrationSql,
    ].join('\n');

    for (const table of [
      'course_manifest',
      'course_revision',
      'downloaded_course',
      'sync_state',
      'local_training_session',
      'local_training_marathon_run',
    ]) {
      const tableSql = schema.match(new RegExp(
        `CREATE TABLE IF NOT EXISTS ${table} \\([\\s\\S]*?\\n\\);`,
      ))?.[0];
      expect(tableSql, `${table} definition`).toBeTruthy();
      expect(tableSql).toContain(
        'FOREIGN KEY (app_user_id) REFERENCES local_user(app_user_id) ON DELETE CASCADE',
      );
    }

    expect(schema).toContain(
      'REFERENCES local_training_session(app_user_id, session_id) ON DELETE CASCADE',
    );
    expect(schema).toContain(
      'REFERENCES local_training_attempt(app_user_id, client_attempt_id) ON DELETE CASCADE',
    );
  });

  it('deletes the local_user root inside one exclusive transaction', async () => {
    const runAsync = vi.fn(async () => ({ changes: 1, lastInsertRowId: 0 }));
    const db = {
      withExclusiveTransactionAsync: vi.fn(async (work: (tx: { runAsync: typeof runAsync }) => Promise<void>) => {
        await work({ runAsync });
      }),
    } as unknown as SQLiteDatabase;

    await deleteLocalUser(db, 'clerk-user-42');

    expect(db.withExclusiveTransactionAsync).toHaveBeenCalledTimes(1);
    expect(runAsync).toHaveBeenCalledWith(
      'DELETE FROM local_user WHERE app_user_id = ?',
      'clerk-user-42',
    );
  });
});
