import assert from 'node:assert/strict';
import { courseReviewResponseSchema } from '../dist/repertoire-coverage/index.js';

const response = {
  course: {
    id: 21,
    name: 'Sicilian repertoire',
    description: null,
    sideToTrain: 'BLACK',
    hasMixedSides: false,
    lineCount: 3,
    moveCount: 18,
  },
  filters: {
    accountIds: [7],
    providers: ['LICHESS'],
    from: '2026-07-11T00:00:00.000Z',
    to: '2026-08-11T00:00:00.000Z',
    resultForUser: ['WIN'],
    userColor: ['BLACK'],
    rated: true,
    speedCategory: ['rapid'],
    variant: ['standard'],
    openingEco: ['B20'],
    openingName: 'Sicilian',
    opponent: 'opponent',
    timeControl: '600+5',
    minUserRating: 1400,
    maxUserRating: 2000,
    minOpponentRating: 1400,
    maxOpponentRating: 2100,
    analysisStatus: ['COMPLETED'],
    plyIndexStatus: ['INDEXED'],
    tagFilter: 'NO_TAGS',
    tagCodes: [3],
    classification: ['MISTAKE'],
    minAccuracy: 60,
    maxAccuracy: 95,
    limit: 100,
    offset: 0,
    minCoveredPlies: 2,
  },
  summary: {
    gamesChecked: 8,
    indexedGames: 8,
    inScopeGames: 7,
    outOfScopeGames: 1,
    gameEndedInsideRepertoire: 2,
    repertoireEnded: 1,
    myDeviations: 2,
    opponentUncovered: 1,
    unindexedGames: 0,
    courseConflicts: 1,
  },
  conflicts: [{
    normalizedFenBefore: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -',
    sideToMove: 'WHITE',
    moves: [{
      moveUci: 'g1f3',
      moveSan: 'Nf3',
      lineRefs: [{ lineId: 5, lineName: 'Open game', nodeId: 501, moveSequenceSan: '1. e4 e5 2. Nf3' }],
    }],
  }],
  myDeviations: [{
    key: 'MY_DEVIATION:fen:e7e5',
    status: 'MY_DEVIATION',
    normalizedFenBefore: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR b KQkq -',
    sideToMove: 'BLACK',
    playedMoveUci: 'e7e5',
    playedSan: 'e5',
    moveSequenceSan: '1. e4 c5 2. Nf3 e5',
    expectedMoveUci: 'd7d6',
    expectedMoveUcis: ['d7d6'],
    expectedMoveSans: ['d6'],
    count: 2,
    results: { win: 1, draw: 0, loss: 1, unknown: 0 },
    examples: [{
      gameId: 44,
      provider: 'LICHESS',
      providerGameId: 'abc',
      providerUrl: 'https://lichess.org/abc',
      endedAt: '2026-08-10T12:00:00.000Z',
      opponentUsername: 'opponent',
      resultForUser: 'WIN',
      plyNumber: 4,
    }],
    lineAnchors: [],
  }],
  opponentUncovered: [{
    key: 'OPPONENT_UNCOVERED:fen:b2b3',
    status: 'OPPONENT_UNCOVERED',
    normalizedFenBefore: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq -',
    sideToMove: 'WHITE',
    playedMoveUci: 'b2b3',
    playedSan: 'b3',
    moveSequenceSan: '1. e4 c5 2. b3',
    expectedMoveUci: null,
    expectedMoveUcis: [],
    expectedMoveSans: [],
    count: 1,
    results: { win: 0, draw: 1, loss: 0, unknown: 0 },
    examples: [],
    lineAnchors: [{
      kind: 'NODE',
      lineId: 10,
      lineName: 'Sicilian d6',
      chapterId: 2,
      nodeId: 1002,
      moveSequenceSan: '1. e4 c5',
    }],
  }],
  pagination: { limit: 100, offset: 0, returnedGames: 8 },
};

assert.deepEqual(courseReviewResponseSchema.parse(response), response);
assert.throws(() => courseReviewResponseSchema.parse({
  ...response,
  filters: { ...response.filters, from: undefined },
}));
assert.throws(() => courseReviewResponseSchema.parse({
  ...response,
  course: { ...response.course, sideToTrain: 'GREEN' },
}));
assert.throws(() => courseReviewResponseSchema.parse({
  ...response,
  myDeviations: [{ ...response.myDeviations[0], count: 0 }],
}));
assert.throws(() => courseReviewResponseSchema.parse({
  ...response,
  summary: { ...response.summary, gamesChecked: -1 },
}));

console.log('Repertoire coverage contract tests passed.');
