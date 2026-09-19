import assert from 'node:assert/strict';
import {
  createLichessPuzzleAccessService,
  LichessPuzzleAccessError,
} from '../../dist/modules/lichess-puzzles/lichess-puzzle-access.service.js';

const activeConnection = {
  scopes: ['puzzle:read', 'puzzle:write'],
  accessTokenCiphertext: 'ciphertext',
  accessTokenIv: 'iv',
  accessTokenAuthTag: 'tag',
  expiresAt: new Date('2026-07-30T00:00:00.000Z'),
  revokedAt: null,
};

{
  let decryptedRecord = null;
  const getAccessToken = createLichessPuzzleAccessService({
    async findConnection(userId) {
      assert.equal(userId, 7);
      return activeConnection;
    },
    decrypt(record) {
      decryptedRecord = record;
      return 'plain-token';
    },
    now: () => new Date('2026-07-29T05:00:00.000Z'),
  });

  assert.equal(await getAccessToken(7, 'puzzle:write'), 'plain-token');
  assert.deepEqual(decryptedRecord, {
    ciphertext: 'ciphertext',
    iv: 'iv',
    authTag: 'tag',
  });
}

{
  const getAccessToken = createLichessPuzzleAccessService({
    async findConnection() {
      return null;
    },
    decrypt() {
      throw new Error('decrypt should not run');
    },
    now: () => new Date('2026-07-29T05:00:00.000Z'),
  });

  await assert.rejects(
    () => getAccessToken(7, 'puzzle:read'),
    (error) => error instanceof LichessPuzzleAccessError
      && error.code === 'LICHESS_NOT_CONNECTED',
  );
}

{
  const getAccessToken = createLichessPuzzleAccessService({
    async findConnection() {
      return { ...activeConnection, scopes: ['puzzle:read'] };
    },
    decrypt() {
      throw new Error('decrypt should not run');
    },
    now: () => new Date('2026-07-29T05:00:00.000Z'),
  });

  await assert.rejects(
    () => getAccessToken(7, 'puzzle:write'),
    (error) => error instanceof LichessPuzzleAccessError
      && error.code === 'LICHESS_SCOPE_MISSING',
  );
}

{
  const getAccessToken = createLichessPuzzleAccessService({
    async findConnection() {
      return {
        ...activeConnection,
        expiresAt: new Date('2026-07-29T04:59:59.000Z'),
      };
    },
    decrypt() {
      throw new Error('decrypt should not run');
    },
    now: () => new Date('2026-07-29T05:00:00.000Z'),
  });

  await assert.rejects(
    () => getAccessToken(7, 'puzzle:read'),
    (error) => error instanceof LichessPuzzleAccessError
      && error.code === 'LICHESS_TOKEN_EXPIRED',
  );
}
