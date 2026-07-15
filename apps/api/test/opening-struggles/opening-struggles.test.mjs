import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { buildApp } from '../../dist/app.js';
import { openingStrugglesQuerySchema } from '../../dist/modules/opening-struggles/opening-struggles.schema.js';
import { buildOpeningStruggleItems } from '../../dist/modules/opening-struggles/opening-struggles.service.js';

function position(id, bestScoreCpWhite) {
  return {
    normalizedFen: `position-${id}`,
    analysis: bestScoreCpWhite === null ? null : {
      id,
      bestScoreCpWhite,
      bestMateWhite: null,
    },
  };
}

function game(id, userColor, {
  resultForUser = null,
  moves = ['e2e4', 'e7e5'],
  scoreLosses = [],
  afterEvals = [],
} = {}) {
  const plies = moves.map((moveUci, index) => ({
    plyNumber: index + 1,
    moveUci,
    scoreLossCp: scoreLosses[index] ?? null,
    position: position(id * 100 + index, index === 0 ? 0 : (afterEvals[index - 1] ?? null)),
  }));
  plies.push({
    plyNumber: moves.length + 1,
    moveUci: 'a2a3',
    scoreLossCp: null,
    position: position(id * 100 + moves.length, afterEvals[moves.length - 1] ?? null),
  });
  return {
    id,
    userColor,
    resultForUser,
    plyIndexedAt: new Date('2026-07-15T00:00:00.000Z'),
    plies,
  };
}

function courseLine(courseId, courseName, sideToTrain, movesUci, lineId = courseId * 10) {
  const chess = new Chess();
  const moves = movesUci.map((moveUci, index) => {
    const fenBefore = chess.fen();
    const colorToMoveBefore = chess.turn() === 'w' ? 'WHITE' : 'BLACK';
    const move = chess.move({
      from: moveUci.slice(0, 2),
      to: moveUci.slice(2, 4),
      promotion: moveUci[4],
    });
    return {
      id: lineId * 100 + index + 1,
      lineId,
      parentId: index ? lineId * 100 + index : null,
      plyNumber: index + 1,
      fenBefore,
      fenAfter: chess.fen(),
      moveUci,
      moveSan: move.san,
      colorToMoveBefore,
      isUserMove: colorToMoveBefore === sideToTrain,
      isCorrectUserMove: colorToMoveBefore === sideToTrain,
    };
  });
  return {
    id: lineId,
    name: `${courseName} line`,
    sideToTrain,
    startingFen: 'startpos',
    moves,
    course: { id: courseId, name: courseName },
  };
}

function coverageFor(moves, userColor, courseLines) {
  const query = openingStrugglesQuerySchema.parse({
    mode: 'results', minGames: 1, minLossRate: 0, maxPly: moves.length,
  });
  const items = buildOpeningStruggleItems([
    game(900 + moves.length, userColor, { resultForUser: 'LOSS', moves }),
  ], query, courseLines);
  return items.find((item) => item.movesUci.length === moves.length)?.courseCoverage;
}

const defaultQuery = openingStrugglesQuerySchema.parse({});
assert.equal(defaultQuery.minAverageCentipawnLoss, 60);
assert.equal(defaultQuery.maxAverageUserEvalCp, -80);

const whiteOpenGame = courseLine(1, 'White Openings', 'WHITE', ['e2e4', 'e7e5', 'g1f3']);
assert.equal(coverageFor(['d2d4'], 'WHITE', [whiteOpenGame]).status, 'NOT_COVERED');
assert.equal(
  coverageFor(['e2e4', 'e7e5'], 'WHITE', [whiteOpenGame]).status,
  'COVERED',
);
const myDeviationCoverage = coverageFor(
  ['e2e4', 'e7e5', 'd2d3'],
  'WHITE',
  [whiteOpenGame],
);
assert.equal(myDeviationCoverage.status, 'MY_DEVIATION');
assert.equal(myDeviationCoverage.coveredPlies, 2);
assert.equal(myDeviationCoverage.deviationPly, 3);
assert.deepEqual(myDeviationCoverage.expectedMoveSans, ['Nf3']);

const opponentDeviationCoverage = coverageFor(
  ['e2e4', 'c7c5'],
  'WHITE',
  [whiteOpenGame],
);
assert.equal(opponentDeviationCoverage.status, 'OPPONENT_UNCOVERED');
assert.equal(opponentDeviationCoverage.coveredPlies, 1);
assert.equal(opponentDeviationCoverage.deviationPly, 2);

const shortCourse = courseLine(2, 'Short Course', 'WHITE', ['e2e4']);
assert.equal(
  coverageFor(['e2e4', 'e7e5'], 'WHITE', [shortCourse]).status,
  'REPERTOIRE_ENDED',
);

const alternativeCourse = courseLine(3, 'Alternative', 'WHITE', ['e2e4', 'c7c5']);
const fullCoverageWins = coverageFor(
  ['e2e4', 'e7e5'],
  'WHITE',
  [alternativeCourse, whiteOpenGame],
);
assert.equal(fullCoverageWins.status, 'COVERED');
assert.deepEqual(fullCoverageWins.courses, [{ id: 1, name: 'White Openings' }]);

const secondCoveredCourse = courseLine(4, 'Also Open', 'WHITE', ['e2e4', 'e7e5']);
assert.deepEqual(
  coverageFor(['e2e4', 'e7e5'], 'WHITE', [whiteOpenGame, secondCoveredCourse]).courses,
  [{ id: 4, name: 'Also Open' }, { id: 1, name: 'White Openings' }],
  'tied full-coverage courses are retained',
);

const blackQueensGambit = courseLine(5, 'Black QG', 'BLACK', ['d2d4', 'd7d5']);
assert.equal(
  coverageFor(['d2d4', 'd7d5'], 'WHITE', [blackQueensGambit]).status,
  'NOT_COVERED',
  'White struggles ignore Black-training courses',
);
assert.equal(
  coverageFor(['d2d4', 'd7d5'], 'BLACK', [blackQueensGambit]).status,
  'COVERED',
  'Black struggles use Black-training courses',
);

const transpositionCourseLines = [
  courseLine(6, 'Nimzo', 'WHITE', ['d2d4', 'e7e6', 'c2c4', 'g8f6', 'b1c3'], 61),
  courseLine(6, 'Nimzo', 'WHITE', ['d2d4', 'g8f6', 'c2c4', 'g7g6'], 62),
];
assert.equal(
  coverageFor(
    ['d2d4', 'g8f6', 'c2c4', 'e7e6', 'b1c3'],
    'WHITE',
    transpositionCourseLines,
  ).status,
  'COVERED',
  'opening-prefix coverage retains course-review opponent transpositions',
);

const whiteGames = [
  game(1, 'WHITE', { resultForUser: 'LOSS', scoreLosses: [120, 900], afterEvals: [-100, -200] }),
  game(2, 'WHITE', { resultForUser: 'WIN', scoreLosses: [80, 800], afterEvals: [-100, -200] }),
  game(3, 'WHITE', { scoreLosses: [null, 700], afterEvals: [-100, -200] }),
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

const repeatedMistakes = openingStrugglesQuerySchema.parse({
  mode: 'repeatedMistakes',
  minOccurrences: 2,
  minAverageCentipawnLoss: 90,
  minLossRate: 100,
  maxPly: 2,
});
const repeatedItems = buildOpeningStruggleItems(whiteGames, repeatedMistakes);
assert.equal(repeatedItems.length, 1, 'repeated mistakes do not apply the result threshold');
assert.equal(repeatedItems[0].movesUci.join(' '), 'e2e4');
assert.equal(repeatedItems[0].analysedMoveCount, 2, 'null score losses are ignored');
assert.equal(repeatedItems[0].averageCentipawnLoss, 100);

const blackGames = [
  game(4, 'BLACK', { resultForUser: 'LOSS', scoreLosses: [1000, 200], afterEvals: [0, -150] }),
  game(5, 'BLACK', { resultForUser: 'WIN', scoreLosses: [900, 100], afterEvals: [0, -150] }),
];
const blackRepeatedMistakes = openingStrugglesQuerySchema.parse({
  mode: 'repeatedMistakes',
  minOccurrences: 2,
  minAverageCentipawnLoss: 140,
  maxPly: 2,
});
const blackRepeatedItems = buildOpeningStruggleItems(blackGames, blackRepeatedMistakes);
assert.equal(blackRepeatedItems.length, 1, 'only the Black owner move is eligible for Black games');
assert.equal(blackRepeatedItems[0].movesUci.join(' '), 'e2e4 e7e5');
assert.equal(blackRepeatedItems[0].averageCentipawnLoss, 150);

const perspectiveGames = [
  game(10, 'WHITE', { moves: ['e2e4'], scoreLosses: [0], afterEvals: [-150] }),
  game(11, 'BLACK', { moves: ['e2e4'], scoreLosses: [0], afterEvals: [200] }),
];
const perspectiveQuery = openingStrugglesQuerySchema.parse({
  mode: 'badPositions',
  minEvaluatedGames: 1,
  maxAverageUserEvalCp: -100,
  maxPly: 1,
});
const perspectiveItems = buildOpeningStruggleItems(perspectiveGames, perspectiveQuery);
assert.deepEqual(
  perspectiveItems.map((item) => [item.userColor, item.avgUserEvalCp]),
  [['BLACK', -200], ['WHITE', -150]],
  'White evaluations are preserved and Black evaluations are negated into the user perspective',
);

const sortedBadPositions = buildOpeningStruggleItems([
  ...Array.from({ length: 5 }, (_, index) => game(60 + index, 'WHITE', {
    moves: ['e2e4'], afterEvals: [-150],
  })),
  ...Array.from({ length: 6 }, (_, index) => game(70 + index, 'WHITE', {
    moves: ['d2d4'], afterEvals: [-150],
  })),
  game(80, 'WHITE', { moves: ['c2c4'], afterEvals: [-200] }),
], perspectiveQuery);
assert.deepEqual(
  sortedBadPositions.map((item) => [item.movesUci[0], item.avgUserEvalCp, item.evalGames]),
  [['c2c4', -200, 1], ['d2d4', -150, 6], ['e2e4', -150, 5]],
  'bad positions sort by average user evaluation ascending, then evaluated games descending',
);

const accumulatedGames = Array.from({ length: 5 }, (_, index) => game(20 + index, 'WHITE', {
  moves: ['e2e4', 'e7e5', 'g1f3'],
  scoreLosses: [20, 0, 20],
  afterEvals: [-20, -80, -160],
}));
const badPositions = openingStrugglesQuerySchema.parse({
  mode: 'badPositions',
  minEvaluatedGames: 5,
  maxAverageUserEvalCp: -100,
  maxPly: 3,
});
const accumulatedBadItems = buildOpeningStruggleItems(accumulatedGames, badPositions);
assert.deepEqual(
  accumulatedBadItems.map((item) => item.movesUci.join(' ')),
  ['e2e4 e7e5 g1f3'],
  'a bad position can be reached through accumulated disadvantage without one high-CPL move',
);
assert.equal(
  buildOpeningStruggleItems(accumulatedGames, openingStrugglesQuerySchema.parse({
    mode: 'repeatedMistakes', minOccurrences: 5, minAverageCentipawnLoss: 100, maxPly: 3,
  })).length,
  0,
  'the low-CPL sequence is not a repeated mistake',
);

const equalAfterMistakeGames = Array.from({ length: 5 }, (_, index) => game(30 + index, 'WHITE', {
  moves: ['e2e4'],
  scoreLosses: [200],
  afterEvals: [0],
}));
assert.equal(
  buildOpeningStruggleItems(equalAfterMistakeGames, openingStrugglesQuerySchema.parse({
    mode: 'repeatedMistakes', minOccurrences: 5, minAverageCentipawnLoss: 100, maxPly: 1,
  })).length,
  1,
  'a high-CPL owner move ending in equality is a repeated mistake',
);
assert.equal(
  buildOpeningStruggleItems(equalAfterMistakeGames, badPositions).length,
  0,
  'a high-CPL owner move ending in equality is not a bad position',
);

const lowCplBadGames = Array.from({ length: 5 }, (_, index) => game(40 + index, 'WHITE', {
  moves: ['e2e4'],
  scoreLosses: [20],
  afterEvals: [-150],
}));
assert.equal(buildOpeningStruggleItems(lowCplBadGames, badPositions).length, 1);
assert.equal(
  buildOpeningStruggleItems(lowCplBadGames, openingStrugglesQuerySchema.parse({
    mode: 'repeatedMistakes', minOccurrences: 5, minAverageCentipawnLoss: 100, maxPly: 1,
  })).length,
  0,
  'a low-CPL move ending badly can be a bad position without being a repeated mistake',
);

const redundantDescendantGames = Array.from({ length: 5 }, (_, index) => game(50 + index, 'WHITE', {
  moves: ['e2e4', 'e7e5', 'g1f3'],
  scoreLosses: [20, 0, 20],
  afterEvals: [-120, -160, -200],
}));
const thresholdEntryItems = buildOpeningStruggleItems(redundantDescendantGames, badPositions);
assert.deepEqual(
  thresholdEntryItems.map((item) => item.movesUci.join(' ')),
  ['e2e4'],
  'threshold-entry filtering suppresses descendants whose parent already meets the bad-position threshold',
);

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
