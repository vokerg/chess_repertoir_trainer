import assert from 'node:assert/strict';
import { MoveClassificationCode } from 'chess-domain';
import { calculateTagCodes } from '../../dist/modules/imported-games/game-tagging.service.js';
import { GAME_TAG } from '../../dist/modules/imported-games/game-tags.js';

function analysis(scoreForWhite) {
  return {
    bestMoveUci: 'a2a3',
    bestScoreCpWhite: scoreForWhite,
    bestMateWhite: null,
  };
}

function mateAnalysis(mateForWhite = 1) {
  return {
    bestMoveUci: 'a2a3',
    bestScoreCpWhite: null,
    bestMateWhite: mateForWhite,
  };
}

function makePly(plyNumber, scoreBeforeForWhite, options = {}) {
  return {
    plyNumber,
    moveUci: options.moveUci ?? 'a2a3',
    scoreLossCp: options.scoreLossCp ?? 0,
    classificationCode: options.classificationCode ?? MoveClassificationCode.Best,
    position: {
      normalizedFen: options.fen ?? '8/8/8/8/8/8/8/8 w - - 0 1',
      analysis: options.beforeAnalysis ?? analysis(scoreBeforeForWhite),
    },
  };
}

function analysedGame(plies) {
  return {
    id: 1,
    provider: 'chess_com',
    status: 'user won by checkmate',
    result: '1-0',
    resultForUser: 'WIN',
    userColor: 'WHITE',
    whiteRating: 1200,
    blackRating: 1200,
    speedCategory: 'rapid',
    timeControlInitial: 600,
    timeControlIncrement: 0,
    openingEco: null,
    openingName: null,
    plyIndexedAt: new Date(),
    plyIndexError: null,
    tagCodes: [],
    analysisRuns: [
      {
        id: 1,
        status: 'COMPLETED',
        summary: null,
        whiteAccuracy: 95,
        blackAccuracy: 90,
        createdAt: new Date(),
        completedAt: new Date(),
      },
    ],
    plies,
    finalPositionAnalysis: analysis(1600),
  };
}

const cases = [
  {
    name: 'does not call a mate-to-winning drop a one-move blunder',
    run() {
      const tags = calculateTagCodes(analysedGame([
        makePly(55, 1200),
        makePly(56, 1200, {
          beforeAnalysis: analysis(1200),
        }),
        makePly(57, 100000, {
          beforeAnalysis: mateAnalysis(1),
          scoreLossCp: 300,
          classificationCode: MoveClassificationCode.Blunder,
        }),
        makePly(58, 1305),
      ]));

      assert.equal(tags.includes(GAME_TAG.ONE_MOVE_BLUNDER), false);
      assert.equal(tags.includes(GAME_TAG.USER_BLUNDERED), true);
    },
  },
  {
    name: 'does not call an already-winning opponent mistake a midgame turnaround',
    run() {
      const tags = calculateTagCodes(analysedGame([
        makePly(55, 1053),
        makePly(56, 1160, {
          beforeAnalysis: analysis(1160),
          scoreLossCp: 300,
          classificationCode: MoveClassificationCode.Blunder,
        }),
        makePly(57, 100000, {
          beforeAnalysis: mateAnalysis(1),
        }),
      ]));

      assert.equal(tags.includes(GAME_TAG.MIDGAME_TURNAROUND_TO_WIN), false);
      assert.equal(tags.includes(GAME_TAG.OPPONENT_BLUNDERED), true);
    },
  },
  {
    name: 'does not call mate transitions chaotic when the user stays winning',
    run() {
      const tags = calculateTagCodes(analysedGame([
        makePly(55, 1053),
        makePly(56, 1160, {
          beforeAnalysis: analysis(1160),
          scoreLossCp: 300,
          classificationCode: MoveClassificationCode.Blunder,
        }),
        makePly(57, 100000, {
          beforeAnalysis: mateAnalysis(1),
          scoreLossCp: 300,
          classificationCode: MoveClassificationCode.Blunder,
        }),
        makePly(58, 1305, {
          scoreLossCp: 300,
          classificationCode: MoveClassificationCode.Blunder,
        }),
        makePly(59, 1954),
        makePly(60, 1510),
        makePly(61, 1390),
        makePly(62, 100000, {
          beforeAnalysis: mateAnalysis(1),
        }),
      ]));

      assert.equal(tags.includes(GAME_TAG.CHAOTIC_GAME), false);
    },
  },
  {
    name: 'keeps chaotic games with repeated narrative-changing swings',
    run() {
      const tags = calculateTagCodes(analysedGame([
        makePly(21, 450),
        makePly(22, -250),
        makePly(23, -350),
        makePly(24, 400),
        makePly(25, 500),
        makePly(26, -300),
      ]));

      assert.equal(tags.includes(GAME_TAG.CHAOTIC_GAME), true);
    },
  },
  {
    name: 'keeps true midgame turnarounds from worse to clearly better',
    run() {
      const tags = calculateTagCodes(analysedGame([
        makePly(41, -250),
        makePly(42, -220, {
          beforeAnalysis: analysis(-220),
          scoreLossCp: 650,
          classificationCode: MoveClassificationCode.Blunder,
        }),
        makePly(43, 450),
      ]));

      assert.equal(tags.includes(GAME_TAG.MIDGAME_TURNAROUND_TO_WIN), true);
    },
  },
  {
    name: 'does not tag one shallow worse dip as a comeback win',
    run() {
      const tags = calculateTagCodes(analysedGame([
        makePly(21, 20),
        makePly(22, -170),
        makePly(23, 40),
        makePly(24, 420),
      ]));

      assert.equal(tags.includes(GAME_TAG.COMEBACK_WIN), false);
    },
  },
  {
    name: 'tags comeback wins from a sustained shallow worse phase',
    run() {
      const tags = calculateTagCodes(analysedGame([
        makePly(21, 20),
        makePly(22, -170),
        makePly(23, -190),
        makePly(24, 420),
      ]));

      assert.equal(tags.includes(GAME_TAG.COMEBACK_WIN), true);
    },
  },
  {
    name: 'tags comeback wins from a clearly worse position',
    run() {
      const tags = calculateTagCodes(analysedGame([
        makePly(21, 20),
        makePly(22, -320),
        makePly(23, 420),
      ]));

      assert.equal(tags.includes(GAME_TAG.COMEBACK_WIN), true);
    },
  },
  {
    name: 'keeps one-move blunders that spoil a winning position',
    run() {
      const tags = calculateTagCodes({
        ...analysedGame([
          makePly(57, 900, {
            scoreLossCp: 800,
            classificationCode: MoveClassificationCode.Blunder,
          }),
          makePly(58, 50),
        ]),
        resultForUser: 'DRAW',
      });

      assert.equal(tags.includes(GAME_TAG.ONE_MOVE_BLUNDER), true);
      assert.equal(tags.includes(GAME_TAG.USER_BLUNDERED), true);
    },
  },
  {
    name: 'tags user blunders even when no single move decides the game',
    run() {
      const tags = calculateTagCodes({
        ...analysedGame([
          makePly(25, 25),
          makePly(26, -40, {
            scoreLossCp: 315,
            classificationCode: MoveClassificationCode.Blunder,
          }),
          makePly(27, 237),
          makePly(28, -23),
          makePly(29, -100),
          makePly(30, -101, {
            scoreLossCp: 392,
            classificationCode: MoveClassificationCode.Blunder,
          }),
          makePly(31, 291),
        ]),
        resultForUser: 'LOSS',
        userColor: 'BLACK',
      });

      assert.equal(tags.includes(GAME_TAG.USER_BLUNDERED), true);
      assert.equal(tags.includes(GAME_TAG.ONE_MOVE_BLUNDER), false);
    },
  },
  {
    name: 'tags wins from accumulated opponent losses as slow bleed wins',
    run() {
      const tags = calculateTagCodes(analysedGame([
        makePly(21, 50),
        makePly(22, 100, {
          scoreLossCp: 150,
          classificationCode: MoveClassificationCode.Mistake,
        }),
        makePly(23, 220),
        makePly(24, 230, {
          scoreLossCp: 150,
          classificationCode: MoveClassificationCode.Mistake,
        }),
        makePly(25, 380),
        makePly(26, 390, {
          scoreLossCp: 150,
          classificationCode: MoveClassificationCode.Mistake,
        }),
        makePly(27, 540),
      ]));

      assert.equal(tags.includes(GAME_TAG.SLOW_BLEED_WIN), true);
    },
  },
  {
    name: 'does not tag a one-move opponent collapse as a slow bleed win',
    run() {
      const tags = calculateTagCodes(analysedGame([
        makePly(21, 50),
        makePly(22, 75, {
          scoreLossCp: 650,
          classificationCode: MoveClassificationCode.Blunder,
        }),
        makePly(23, 750),
      ]));

      assert.equal(tags.includes(GAME_TAG.SLOW_BLEED_WIN), false);
      assert.equal(tags.includes(GAME_TAG.OPPONENT_BLUNDERED), true);
    },
  },
];

for (const testCase of cases) {
  testCase.run();
  console.log(`ok - ${testCase.name}`);
}
