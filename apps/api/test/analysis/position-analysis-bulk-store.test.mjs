import assert from 'node:assert/strict';
import { normalizeFenForPosition } from 'chess-domain';
import prismaModule from '../../dist/prisma.js';
import {
  findOrCreatePositionByFen,
  getPositionAnalysisByFen,
  upsertPositionAnalysesBulk,
  upsertPositionAnalysis,
} from '../../dist/modules/analysis/analysis.repository.prisma.js';

const prisma = prismaModule.default;

const fenA = '8/8/8/8/8/8/4K3/6k1 w - - 0 1';
const fenADuplicate = '8/8/8/8/8/8/4K3/6k1 w - - 17 42';
const fenB = '8/8/8/8/8/3K4/8/6k1 b - - 0 1';
const normalizedFens = [fenA, fenB].map((fen) => normalizeFenForPosition(fen));

async function cleanup() {
  await prisma.position.deleteMany({
    where: { normalizedFen: { in: normalizedFens } },
  });
}

try {
  await cleanup();

  const existingPosition = await findOrCreatePositionByFen(fenB);
  await upsertPositionAnalysis(existingPosition.id, {
    fen: fenB,
    bestMoveUci: 'g1g2',
    bestScoreCpWhite: 1,
    lines: [{ multipv: 1, moveUci: 'g1g2', scoreCpWhite: 1, pvUci: ['g1g2'] }],
  });

  const rows = await upsertPositionAnalysesBulk([
    {
      fen: fenA,
      bestMoveUci: 'e2e3',
      bestScoreCpWhite: 10,
      lines: [{ multipv: 1, moveUci: 'e2e3', scoreCpWhite: 10, pvUci: ['e2e3'] }],
    },
    {
      fen: fenB,
      bestMoveUci: 'g1h2',
      bestScoreCpWhite: -20,
      lines: [{ multipv: 1, moveUci: 'g1h2', scoreCpWhite: -20, pvUci: ['g1h2'] }],
    },
    {
      fen: fenADuplicate,
      bestMoveUci: 'e2f3',
      bestScoreCpWhite: 30,
      lines: [{ multipv: 1, moveUci: 'e2f3', scoreCpWhite: 30, pvUci: ['e2f3'] }],
    },
  ]);

  assert.equal(rows.length, 2);
  assert.ok(rows.every((row) => row.id > 0));
  assert.ok(rows.every((row) => row.positionId > 0));
  assert.ok(rows.every((row) => row.fromCache === false));
  assert.ok(rows.every((row) => Array.isArray(row.lines)));

  const rowA = rows.find((row) => row.normalizedFen === normalizedFens[0]);
  const rowB = rows.find((row) => row.normalizedFen === normalizedFens[1]);
  assert.equal(rowA?.bestMoveUci, 'e2f3');
  assert.equal(rowB?.positionId, existingPosition.id);
  assert.equal(rowB?.bestMoveUci, 'g1h2');

  const storedA = await getPositionAnalysisByFen(fenA);
  const storedB = await getPositionAnalysisByFen(fenB);
  assert.equal(storedA?.bestMoveUci, 'e2f3');
  assert.equal(storedB?.bestMoveUci, 'g1h2');

  const positions = await prisma.position.findMany({
    where: { normalizedFen: { in: normalizedFens } },
    select: { id: true },
  });
  assert.equal(positions.length, 2);

  console.log('Position-analysis bulk store tests passed.');
} finally {
  await cleanup();
  await prisma.$disconnect();
}
