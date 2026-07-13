import type { SQLiteDatabase } from 'expo-sqlite';

export type LocalUser = {
  appUserId: string;
  displayName: string | null;
  email: string | null;
  lastAuthenticatedAt: string;
  lockedAt: string | null;
};

type LocalUserRow = {
  app_user_id: string;
  display_name: string | null;
  email: string | null;
  last_authenticated_at: string;
  locked_at: string | null;
};

export async function activateAuthenticatedUser(
  db: SQLiteDatabase,
  input: { appUserId: string; displayName: string | null; email: string | null },
): Promise<LocalUser> {
  const now = new Date().toISOString();
  await db.withExclusiveTransactionAsync(async (tx) => {
    await tx.runAsync(
      'UPDATE local_user SET locked_at = ? WHERE app_user_id <> ? AND locked_at IS NULL',
      now,
      input.appUserId,
    );
    await tx.runAsync(
      `INSERT INTO local_user (
        app_user_id, display_name, email, last_authenticated_at, last_used_at, locked_at
      ) VALUES (?, ?, ?, ?, ?, NULL)
      ON CONFLICT(app_user_id) DO UPDATE SET
        display_name = excluded.display_name,
        email = excluded.email,
        last_authenticated_at = excluded.last_authenticated_at,
        last_used_at = excluded.last_used_at,
        locked_at = NULL`,
      input.appUserId,
      input.displayName,
      input.email,
      now,
      now,
    );
  });
  return {
    appUserId: input.appUserId,
    displayName: input.displayName,
    email: input.email,
    lastAuthenticatedAt: now,
    lockedAt: null,
  };
}

export async function loadUnlockedLocalUser(db: SQLiteDatabase): Promise<LocalUser | null> {
  const row = await db.getFirstAsync<LocalUserRow>(
    `SELECT app_user_id, display_name, email, last_authenticated_at, locked_at
     FROM local_user
     WHERE locked_at IS NULL
     ORDER BY last_used_at DESC
     LIMIT 1`,
  );
  return row ? mapLocalUser(row) : null;
}

export async function lockLocalUser(db: SQLiteDatabase, appUserId: string): Promise<void> {
  const now = new Date().toISOString();
  await db.runAsync(
    'UPDATE local_user SET locked_at = ?, last_used_at = ? WHERE app_user_id = ?',
    now,
    now,
    appUserId,
  );
}

function mapLocalUser(row: LocalUserRow): LocalUser {
  return {
    appUserId: row.app_user_id,
    displayName: row.display_name,
    email: row.email,
    lastAuthenticatedAt: row.last_authenticated_at,
    lockedAt: row.locked_at,
  };
}
