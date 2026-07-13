import type { SQLiteDatabase } from 'expo-sqlite';
import {
  OFFLINE_CONTENT_SCHEMA_VERSION,
  offlineContentMigrationSql,
} from './0001-offline-content';
import {
  OFFLINE_TRAINING_SCHEMA_VERSION,
  offlineTrainingMigrationSql,
} from './0002-offline-training';
import {
  ATTEMPT_SYNC_SCHEMA_VERSION,
  attemptSyncMigrationSql,
} from './0003-attempt-sync';

const migrations = [
  { version: OFFLINE_CONTENT_SCHEMA_VERSION, sql: offlineContentMigrationSql },
  { version: OFFLINE_TRAINING_SCHEMA_VERSION, sql: offlineTrainingMigrationSql },
  { version: ATTEMPT_SYNC_SCHEMA_VERSION, sql: attemptSyncMigrationSql },
] as const;

export const MOBILE_DATABASE_VERSION = ATTEMPT_SYNC_SCHEMA_VERSION;

export async function migrateMobileDatabase(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let currentVersion = row?.user_version ?? 0;

  for (const migration of migrations) {
    if (migration.version <= currentVersion) continue;
    await db.withExclusiveTransactionAsync(async (tx) => {
      await tx.execAsync(migration.sql);
      await tx.execAsync(`PRAGMA user_version = ${migration.version}`);
    });
    currentVersion = migration.version;
  }

  if (currentVersion !== MOBILE_DATABASE_VERSION) {
    throw new Error(`Unsupported mobile database version ${currentVersion}.`);
  }
}
