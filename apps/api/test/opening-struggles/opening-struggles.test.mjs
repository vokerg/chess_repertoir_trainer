import assert from 'node:assert/strict';
import { buildApp } from '../../dist/app.js';
import { openingStrugglesQuerySchema } from '../../dist/modules/opening-struggles/opening-struggles.schema.js';
import { buildOpeningStruggleItems } from '../../dist/modules/opening-struggles/opening-struggles.service.js';

function position(id, bestScoreCpWhite) {
  return {
    normalizedFen: `position-${id}`,
    analysis: {
      id,
      bestScoreCpWhite,
      bestMateWhite: null,
    },
  };
}

function game(id, userColor, resultForUser, firstMoveLoss, secondMoveLoss) {
  return {
    id,
    userColor,
    resultForUser,
    plyIndexedAt: new Date('2026-07-15T00:00:00.000Z'),
    plies: [
      { plyNumber: 1, moveUci: 'e2e4', scoreLossCp: firstMoveLoss, position: position(id * 10 + 1, -900) },
      { plyNumber: 2, moveUci: 'e7e5', scoreLossCp: secondMoveLoss, position: position(id * 10 + 2, -800) },
    ],
  };
}

const whiteGames = [
  game(1, 'WHITE', 'LOSS', 120, 900),
  game(2, 'WHITE', 'WIN', 80, 800),
  game(3, 'WHITE', null, null, 700),
];

const strictResults = openingStrugglesQuerySchema.parse({
  mode: 'results',
  minGames: 3,
  minLossRate: 40,
  maxPly: 2,
});
assert.equal(
  buildOpeningStruggleItems(whiteGames, strictResults).length,
  0,
  'result loss rate uses every game reaching the line, including games without a W-D-L result',
);

const results = openingStrugglesQuerySchema.parse({
  mode: 'results',
  minGames: 3,
  minLossRate: 30,
  maxPly: 2,
});
const resultItems = buildOpeningStruggleItems(whiteGames, results);
assert.equal(resultItems.length, 2);
assert.equal(resultItems[0].totalReachGames, 3);
assert.equal(resultItems[0].lossRate, 33.3);

const moveQuality = openingStrugglesQuerySchema.parse({
  mode: 'moveQuality',
  minAnalysedGames: 2,
  minAverageCentipawnLoss: 90,
  minLossRate: 100,
  maxPly: 2,
});
const qualityItems = buildOpeningStruggleItems(whiteGames, moveQuality);
assert.equal(qualityItems.length, 1, 'move quality does not apply the result threshold');
assert.equal(qualityItems[0].movesUci.join(' '), 'e2e4');
assert.equal(qualityItems[0].analysedMoveCount, 2, 'null score losses are ignored');
assert.equal(qualityItems[0].averageCentipawnLoss, 100);

const blackGames = [
  game(4, 'BLACK', 'LOSS', 1000, 200),
  game(5, 'BLACK', 'WIN', 900, 100),
];
const blackQuality = openingStrugglesQuerySchema.parse({
  mode: 'moveQuality',
  minAnalysedGames: 2,
  minAverageCentipawnLoss: 140,
  maxPly: 2,
});
const blackItems = buildOpeningStruggleItems(blackGames, blackQuality);
assert.equal(blackItems.length, 1, 'only the Black owner move is eligible for Black games');
assert.equal(blackItems[0].movesUci.join(' '), 'e2e4 e7e5');
assert.equal(blackItems[0].averageCentipawnLoss, 150);

const app = await buildApp({
  logger: false,
  authConfig: { mode: 'dev-single-user', userId: 1 },
  prisma: { $disconnect: async () => undefined },
});
try {
  await app.ready();
  const paths = app.swagger().paths;
  assert.ok(paths?.['/api/opening-struggles'], 'the standalone API route is registered');
  assert.equal(paths?.['/api/lab/opening-struggles'], undefined, 'the former Lab API route is removed');
} finally {
  await app.close();
}

console.log('Opening struggles tests passed.');
