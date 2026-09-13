import { describe, expect, it, vi } from 'vitest';
import type { SQLiteDatabase } from 'expo-sqlite';
import {
  MobileApiError,
  isMobileDeletionSignal,
} from '../../api/mobile-api-client';
import { deleteLocalUser } from './local-user.repository';

describe('whole-user deletion mobile purge handshake', () => {
  it('recognizes only typed deletion responses as purge commands', () => {
    expect(isMobileDeletionSignal(new MobileApiError(
      'deleting',
      409,
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
