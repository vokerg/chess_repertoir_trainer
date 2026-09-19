import { AdminCursorInvalidError } from './admin.errors';

interface CursorPayload {
  v: 1;
  lastId: number;
}

export function encodeAdminUserCursor(lastId: number): string {
  const payload: CursorPayload = { v: 1, lastId };
  return `v1.${Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')}`;
}

export function decodeAdminUserCursor(cursor: string | undefined): number | undefined {
  if (!cursor) return undefined;
  if (!cursor.startsWith('v1.')) throw new AdminCursorInvalidError();

  try {
    const parsed = JSON.parse(Buffer.from(cursor.slice(3), 'base64url').toString('utf8')) as unknown;
    if (typeof parsed !== 'object' || parsed === null) throw new AdminCursorInvalidError();
    const value = parsed as Partial<CursorPayload>;
    if (value.v !== 1 || !Number.isSafeInteger(value.lastId) || (value.lastId ?? 0) < 1) {
      throw new AdminCursorInvalidError();
    }
    return value.lastId;
  } catch (error) {
    if (error instanceof AdminCursorInvalidError) throw error;
    throw new AdminCursorInvalidError();
  }
}
