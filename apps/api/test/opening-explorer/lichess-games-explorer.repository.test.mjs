import assert from 'node:assert/strict';
import { normalizeFenForPosition } from 'chess-domain';
import prismaModule from '../../dist/prisma.js';
import {
  findOpeningExplorerCache,
  upsertOpeningExplorerCache,
} from '../../dist/modules/opening-explorer/opening-explorer.repository.prisma.js';

const prisma = prismaModule.default;
const fen = '8/8/8/8/8/8/3K4/7k w - - 0 1';
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

  const common = {
    normalizedFen,
    profileVersion: 1,
    sinceYear: 2000,
    untilYear: 2026,
    movesLimit: 12,
    payload,
    fetchedAt: new Date('2026-07-15T12:00:00.000Z'),
    expiresAt: new Date('2026-08-14T12:00:00.000Z'),
  };
  const masters = await upsertOpeningExplorerCache({
    ...common,
    source: 'LICHESS_MASTERS',
    topGamesLimit: 15,
  });
  const population = await upsertOpeningExplorerCache({
    ...common,
    source: 'LICHESS_GAMES',
    topGamesLimit: 4,
  });

  assert.notEqual(population.id, masters.id, 'sources use independent cache rows');
  assert.equal(population.positionId, masters.positionId, 'sources reuse the normalized position');

  const foundMasters = await findOpeningExplorerCache(normalizedFen, 'LICHESS_MASTERS', 1);
  const foundPopulation = await findOpeningExplorerCache(normalizedFen, 'LICHESS_GAMES', 1);
  assert.equal(foundMasters?.id, masters.id);
  assert.equal(foundPopulation?.id, population.id);
  assert.equal(foundPopulation?.topGamesLimit, 4);

  console.log('Opening explorer source-isolation repository tests passed.');
} finally {
  await cleanup();
  await prisma.$disconnect();
}
