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
const fenC = '8/8/8/8/8/2K5/8/7k w - - 0 1';
const fenD = '8/8/8/8/8/1K6/8/7k w - - 0 1';
const fenE = '8/8/8/8/8/K7/8/7k w - - 0 1';
const fenF = '8/8/8/8/2K5/8/8/7k w - - 0 1';
const fenG = '8/8/8/8/3K4/8/8/7k w - - 0 1';
const normalizedFens = [fenA, fenB, fenC, fenD, fenE, fenF, fenG].map((fen) => normalizeFenForPosition(fen));

function richLine(moveUci, scoreCpWhite, depth = 12, multipv = 1) {
  return { multipv, depth, moveUci, scoreCpWhite, pvUci: [moveUci] };
}

async function cleanup() {
  await prisma.position.deleteMany({
    where: { normalizedFen: { in: normalizedFens } },
  });
}

async function dbAnalysisForFen(fen) {
  const normalizedFen = normalizeFenForPosition(fen);
  return prisma.positionAnalysis.findFirst({
    where: { position: { normalizedFen } },
    select: { bestMoveUci: true, bestScoreCpWhite: true, bestMateWhite: true, lines: true },
  });
}

try {
  await cleanup();

  const existingPosition = await findOrCreatePositionByFen(fenB);
  await upsertPositionAnalysis(existingPosition.id, {
    fen: fenB,
    bestMoveUci: 'g1g2',
    bestScoreCpWhite: 1,
    lines: [richLine('g1g2', 1)],
  });

  const rows = await upsertPositionAnalysesBulk([
    {
      fen: fenA,
      bestMoveUci: 'e2e3',
      bestScoreCpWhite: 10,
      lines: [richLine('e2e3', 10)],
    },
    {
      fen: fenB,
      bestMoveUci: 'g1h2',
      bestScoreCpWhite: -20,
      lines: [richLine('g1h2', -20)],
    },
    {
      fen: fenADuplicate,
      bestMoveUci: 'e2f3',
      bestScoreCpWhite: 30,
      lines: [richLine('e2f3', 30)],
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

  const pollutedPosition = await findOrCreatePositionByFen(fenC);
  await upsertPositionAnalysis(pollutedPosition.id, {
    fen: fenC,
    bestMoveUci: 'e2e4 e7e5 g1f3',
    bestScoreCpWhite: 11,
    lines: [richLine('e2e4', 11)],
  });
  assert.equal((await getPositionAnalysisByFen(fenC))?.bestMoveUci, 'e2e4');
  assert.equal((await dbAnalysisForFen(fenC))?.bestMoveUci, 'e2e4');

  const lineFallbackPosition = await findOrCreatePositionByFen(fenD);
  await upsertPositionAnalysis(lineFallbackPosition.id, {
    fen: fenD,
    lines: [{
      multipv: 1,
      depth: 12,
      moveUci: 'e2e4 e7e5',
      scoreCpWhite: 22,
      pvUci: ['d2d4', 'd7d5'],
    }],
  });
  const lineFallback = await getPositionAnalysisByFen(fenD);
  assert.equal(lineFallback?.bestMoveUci, 'e2e4');
  assert.equal(lineFallback?.lines[0]?.moveUci, 'e2e4');

  const compactPosition = await findOrCreatePositionByFen(fenE);
  await upsertPositionAnalysis(compactPosition.id, {
    fen: fenE,
    bestMoveUci: 'a2a4',
    bestScoreCpWhite: 44,
    lines: [richLine('a2a4', 44)],
    persistenceMode: 'compact',
  });
  const compactDb = await dbAnalysisForFen(fenE);
  assert.equal(compactDb?.bestMoveUci, 'a2a4');
  assert.equal(compactDb?.bestScoreCpWhite, 44);
  assert.equal(compactDb?.lines, null);
  assert.deepEqual((await getPositionAnalysisByFen(fenE))?.lines, []);

  await upsertPositionAnalysesBulk([{
    fen: fenB,
    bestMoveUci: 'g1f2',
    bestScoreCpWhite: 99,
    lines: [richLine('g1f2', 99, 8)],
    persistenceMode: 'compact',
  }]);
  const compactAgainstRich = await getPositionAnalysisByFen(fenB);
  assert.equal(compactAgainstRich?.bestMoveUci, 'g1h2');
  assert.equal(compactAgainstRich?.bestScoreCpWhite, -20);
  assert.equal(compactAgainstRich?.lines[0]?.moveUci, 'g1h2');

  await upsertPositionAnalysesBulk([{
    fen: fenE,
    bestMoveUci: 'a2a3',
    bestScoreCpWhite: 55,
    lines: [richLine('a2a3', 55, 14)],
    persistenceMode: 'rich',
  }]);
  const richUpgrade = await getPositionAnalysisByFen(fenE);
  assert.equal(richUpgrade?.bestMoveUci, 'a2a3');
  assert.equal(richUpgrade?.lines[0]?.moveUci, 'a2a3');

  const depthPosition = await findOrCreatePositionByFen(fenF);
  await upsertPositionAnalysis(depthPosition.id, {
    fen: fenF,
    bestMoveUci: 'c4c5',
    bestScoreCpWhite: 10,
    lines: [richLine('c4c5', 10, 18)],
  });
  await upsertPositionAnalysis(depthPosition.id, {
    fen: fenF,
    bestMoveUci: 'c4d5',
    bestScoreCpWhite: 20,
    lines: [richLine('c4d5', 20, 12)],
  });
  let depthRow = await getPositionAnalysisByFen(fenF);
  assert.equal(depthRow?.bestMoveUci, 'c4c5');
  assert.equal(depthRow?.lines[0]?.depth, 18);

  await upsertPositionAnalysis(depthPosition.id, {
    fen: fenF,
    bestMoveUci: 'c4b5',
    bestScoreCpWhite: 30,
    lines: [richLine('c4b5', 30, 20)],
  });
  depthRow = await getPositionAnalysisByFen(fenF);
  assert.equal(depthRow?.bestMoveUci, 'c4b5');
  assert.equal(depthRow?.lines[0]?.depth, 20);

  await upsertPositionAnalysis(depthPosition.id, {
    fen: fenF,
    bestMoveUci: 'c4c3',
    bestScoreCpWhite: -100,
    lines: [richLine('c4c3', -100, 12)],
    persistenceMode: 'compact',
  });
  depthRow = await getPositionAnalysisByFen(fenF);
  assert.equal(depthRow?.bestMoveUci, 'c4b5');
  assert.equal(depthRow?.bestScoreCpWhite, 30);

  const compactBulkRows = await upsertPositionAnalysesBulk([{
    fen: fenG,
    bestMoveUci: 'd4d5',
    bestScoreCpWhite: 7,
    lines: [richLine('d4d5', 7, 12)],
    persistenceMode: 'compact',
  }]);
  assert.equal(compactBulkRows[0]?.bestMoveUci, 'd4d5');
  assert.deepEqual(compactBulkRows[0]?.lines, []);
  assert.equal((await dbAnalysisForFen(fenG))?.lines, null);

  const positions = await prisma.position.findMany({
    where: { normalizedFen: { in: normalizedFens } },
    select: { id: true },
  });
  assert.equal(positions.length, normalizedFens.length);

  console.log('Position-analysis bulk store tests passed.');
} finally {
  await cleanup();
  await prisma.$disconnect();
}
