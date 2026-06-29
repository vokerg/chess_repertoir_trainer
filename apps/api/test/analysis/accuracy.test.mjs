import assert from 'node:assert/strict';
import { MoveClassificationCode } from 'chess-domain';
import { buildGameAccuracySummary, moveAccuracyForPly } from '../../dist/modules/analysis/accuracy.js';

function plyEvalCpWhite(side, scoreLossCp) {
  return side === 'WHITE' ? -scoreLossCp : scoreLossCp;
}

function makePly(plyNumber, scoreLossCp, options = {}) {
  const side = plyNumber % 2 === 1 ? 'WHITE' : 'BLACK';
  const moveUci = options.moveUci ?? `m${plyNumber}`;
  const playedCpWhite = plyEvalCpWhite(side, scoreLossCp);

  return {
    plyNumber,
    moveUci,
    scoreLossCp,
    classificationCode: options.classificationCode ?? (scoreLossCp === 0 ? MoveClassificationCode.Best : MoveClassificationCode.Good),
    positionAnalysis: options.positionAnalysis ?? {
      bestMoveUci: scoreLossCp === 0 ? moveUci : `best${plyNumber}`,
      bestScoreCpWhite: 0,
      bestMateWhite: null,
      lines: [
        {
          moveUci,
          scoreCpWhite: playedCpWhite,
          mateWhite: null,
          pvUci: [moveUci],
        },
      ],
    },
    resultingPositionAnalysis: options.resultingPositionAnalysis ?? null,
  };
}

function buildExamplePlies() {
  const whiteLosses = Array.from({ length: 24 }, () => 31);
  const blackLosses = Array.from({ length: 23 }, () => 62);
  const plies = [];

  const maxMoves = Math.max(whiteLosses.length, blackLosses.length);
  for (let index = 0; index < maxMoves; index += 1) {
    const whiteLoss = whiteLosses[index];
    if (whiteLoss !== undefined) plies.push(makePly(index * 2 + 1, whiteLoss));

    const blackLoss = blackLosses[index];
    if (blackLoss !== undefined) plies.push(makePly(index * 2 + 2, blackLoss));
  }

  return plies;
}

const cases = [
  {
    name: 'produces high accuracy from modest ACL instead of collapsing from raw centipawn averages',
    run() {
      const summary = buildGameAccuracySummary(buildExamplePlies(), 'BLACK');

      assert.equal(summary.version, 'client-side-v3');
      assert.equal(summary.white.averageCentipawnLoss, 31);
      assert.equal(summary.black.averageCentipawnLoss, 62);
      assert.equal(summary.white.moves, 24);
      assert.equal(summary.black.moves, 23);
      assert.ok(summary.white.accuracy > 88);
      assert.ok(summary.white.accuracy < 95);
      assert.ok(summary.black.accuracy > 75);
      assert.ok(summary.black.accuracy < 85);
    },
  },
  {
    name: 'scores zero-loss moves as 100 accuracy',
    run() {
      const moveAccuracy = moveAccuracyForPly(makePly(1, 0));
      assert.equal(moveAccuracy, 100);

      const summary = buildGameAccuracySummary([makePly(1, 0)], 'WHITE');
      assert.equal(summary.white.accuracy, 100);
      assert.equal(summary.white.averageCentipawnLoss, 0);
      assert.equal(summary.white.moves, 1);
    },
  },
  {
    name: 'counts forced moves as 100 accuracy even without eval details',
    run() {
      const summary = buildGameAccuracySummary([
        {
          plyNumber: 1,
          moveUci: 'a2a3',
          scoreLossCp: null,
          classificationCode: MoveClassificationCode.Forced,
          positionAnalysis: null,
          resultingPositionAnalysis: null,
        },
      ], 'WHITE');

      assert.equal(summary.white.accuracy, 100);
      assert.equal(summary.white.moves, 1);
      assert.equal(summary.white.averageCentipawnLoss, null);
    },
  },
  {
    name: 'lets one large blunder hurt without collapsing a whole side near zero',
    run() {
      const summary = buildGameAccuracySummary([
        makePly(1, 0),
        makePly(2, 0),
        makePly(3, 0),
        makePly(4, 0),
        makePly(5, 0),
        makePly(6, 300, { classificationCode: MoveClassificationCode.Blunder }),
        makePly(7, 0),
        makePly(8, 0),
        makePly(9, 0),
        makePly(10, 0),
        makePly(11, 0),
        makePly(12, 0),
      ], 'WHITE');

      assert.equal(summary.black.averageCentipawnLoss, 50);
      assert.ok(summary.black.accuracy > 70);
      assert.ok(summary.black.accuracy < 95);
    },
  },
  {
    name: 'falls back to the resulting position analysis when the played move is not in multipv lines',
    run() {
      const summary = buildGameAccuracySummary([
        {
          plyNumber: 1,
          moveUci: 'e2e4',
          scoreLossCp: 40,
          classificationCode: MoveClassificationCode.Inaccuracy,
          positionAnalysis: {
            bestMoveUci: 'd2d4',
            bestScoreCpWhite: 0,
            bestMateWhite: null,
            lines: [],
          },
          resultingPositionAnalysis: {
            bestMoveUci: 'e7e5',
            bestScoreCpWhite: -40,
            bestMateWhite: null,
            lines: [],
          },
        },
      ], 'WHITE');

      assert.equal(summary.white.moves, 1);
      assert.equal(summary.white.averageCentipawnLoss, 40);
      assert.ok(summary.white.accuracy > 80);
      assert.ok(summary.white.accuracy < 90);
    },
  },
  {
    name: 'scores compact best-move rows without persisted lines',
    run() {
      const summary = buildGameAccuracySummary([
        {
          plyNumber: 1,
          moveUci: 'e2e4',
          scoreLossCp: 0,
          classificationCode: MoveClassificationCode.Best,
          positionAnalysis: {
            bestMoveUci: 'e2e4',
            bestScoreCpWhite: 35,
            bestMateWhite: null,
            lines: [],
          },
          resultingPositionAnalysis: null,
        },
      ], 'WHITE');

      assert.equal(summary.white.accuracy, 100);
      assert.equal(summary.white.averageCentipawnLoss, 0);
      assert.equal(summary.white.moves, 1);
    },
  },
  {
    name: 'uses compact resulting-position eval when compact before-position move is not best',
    run() {
      const summary = buildGameAccuracySummary([
        {
          plyNumber: 1,
          moveUci: 'e2e4',
          scoreLossCp: 50,
          classificationCode: MoveClassificationCode.Inaccuracy,
          positionAnalysis: {
            bestMoveUci: 'd2d4',
            bestScoreCpWhite: 25,
            bestMateWhite: null,
            lines: [],
          },
          resultingPositionAnalysis: {
            bestMoveUci: 'e7e5',
            bestScoreCpWhite: -25,
            bestMateWhite: null,
            lines: [],
          },
        },
      ], 'WHITE');

      assert.equal(summary.white.moves, 1);
      assert.equal(summary.white.averageCentipawnLoss, 50);
      assert.ok(summary.white.accuracy > 75);
      assert.ok(summary.white.accuracy < 90);
    },
  },
  {
    name: 'sanitizes polluted bestMoveUci before best-move comparison',
    run() {
      const summary = buildGameAccuracySummary([
        {
          plyNumber: 1,
          moveUci: 'e2e4',
          scoreLossCp: 0,
          classificationCode: MoveClassificationCode.Best,
          positionAnalysis: {
            bestMoveUci: 'e2e4 e7e5 g1f3',
            bestScoreCpWhite: 20,
            bestMateWhite: null,
            lines: [],
          },
          resultingPositionAnalysis: null,
        },
      ], 'WHITE');

      assert.equal(summary.white.accuracy, 100);
      assert.equal(summary.white.moves, 1);
    },
  },
];

for (const testCase of cases) {
  testCase.run();
}

console.log(`Passed ${cases.length} imported-game accuracy checks.`);
