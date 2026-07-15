import assert from 'node:assert/strict';
import { normalizeFenForPosition } from 'chess-domain';
import prismaModule from '../../dist/prisma.js';
import {
  findMastersExplorerCache,
  upsertMastersExplorerCache,
} from '../../dist/modules/masters-explorer/masters-explorer.repository.prisma.js';

const prisma = prismaModule.default;
const fen = '8/8/8/8/8/8/4K3/7k w - - 0 1';
const equivalentFen = '8/8/8/8/8/8/4K3/7k w - - 17 42';
const normalizedFen = normalizeFenForPosition(fen);
const payload = {
  opening: null,
  games: { total: 0, whiteWins: 0, draws: 0, blackWins: 0 },
  moves: [],
  topGames: [],
};

async function cleanup() {
  await prisma.position.deleteMany({ where: { normalizedFen } });
}

try {
  await cleanup();

  const fetchedAt = new Date('2026-07-15T12:00:00.000Z');
  const expiresAt = new Date('2026-08-14T12:00:00.000Z');
  const stored = await upsertMastersExplorerCache({
    normalizedFen,
    source: 'LICHESS_MASTERS',
    profileVersion: 1,
    sinceYear: 2000,
    untilYear: 2026,
    movesLimit: 12,
    topGamesLimit: 15,
    payload,
    fetchedAt,
    expiresAt,
  });

  assert.ok(stored.id > 0);
  assert.equal(stored.normalizedFen, normalizedFen);
  assert.deepEqual(stored.payload, payload);

  const found = await findMastersExplorerCache(
    normalizeFenForPosition(equivalentFen),
    'LICHESS_MASTERS',
    1,
  );
  assert.equal(found?.id, stored.id, 'equivalent FENs share the system cache row');

  const refreshedAt = new Date('2026-07-16T12:00:00.000Z');
  const refreshed = await upsertMastersExplorerCache({
    normalizedFen,
    source: 'LICHESS_MASTERS',
    profileVersion: 1,
    sinceYear: 2000,
    untilYear: 2026,
    movesLimit: 12,
    topGamesLimit: 15,
    payload: {
      ...payload,
      games: { total: 1, whiteWins: 1, draws: 0, blackWins: 0 },
    },
    fetchedAt: refreshedAt,
    expiresAt: new Date('2026-08-15T12:00:00.000Z'),
  });

  assert.equal(refreshed.id, stored.id, 'refresh updates rather than duplicates the profile row');
  assert.equal(refreshed.fetchedAt.toISOString(), refreshedAt.toISOString());
  assert.deepEqual(refreshed.payload.games, {
    total: 1,
    whiteWins: 1,
    draws: 0,
    blackWins: 0,
  });

  console.log('Masters explorer repository tests passed.');
} finally {
  await cleanup();
  await prisma.$disconnect();
}
