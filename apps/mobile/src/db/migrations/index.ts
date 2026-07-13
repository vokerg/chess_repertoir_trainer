import type { SQLiteDatabase } from 'expo-sqlite';
import {
  OFFLINE_CONTENT_SCHEMA_VERSION,
  offlineContentMigrationSql,
} from './0001-offline-content';
import {
  OFFLINE_TRAINING_SCHEMA_VERSION,
  offlineTrainingMigrationSql,
} from './0002-offline-training';

const migrations = [
  { version: OFFLINE_CONTENT_SCHEMA_VERSION, sql: offlineContentMigrationSql },
  { version: OFFLINE_TRAINING_SCHEMA_VERSION, sql: offlineTrainingMigrationSql },
] as const;

export const MOBILE_DATABASE_VERSION = OFFLINE_TRAINING_SCHEMA_VERSION;

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
