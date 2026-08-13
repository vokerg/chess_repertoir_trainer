import assert from 'node:assert/strict';
import {
  completeTrainingResponseSchema,
  lineTrainingStartResponseSchema,
  trainingHistoryResponseSchema,
  trainingMarathonNextResponseSchema,
  trainingMoveResponseSchema,
  trainingReviewResponseSchema,
  trainingSessionResponseSchema,
} from '../dist/training/index.js';

const sublineHash = 'a'.repeat(64);
const response = {
  scope: { type: 'COURSE', id: 7 },
  mode: 'MIXED_WEAK_UNTRAINED',
  line: {
    id: 11,
    name: 'Open Sicilian',
    sideToTrain: 'WHITE',
    startingFen: 'startpos',
    chapterId: 3,
    chapterName: 'Sicilian Defence',
    courseId: 7,
  },
  subline: {
    hash: sublineHash,
    canonicalKeyVersion: 1,
    moveText: 'e4 c5 Nf3',
    leafNodeId: 103,
    moves: [
      { nodeId: 101, moveUci: 'e2e4', moveSan: 'e4', plyNumber: 1, sortOrder: 0 },
      { nodeId: 102, moveUci: 'c7c5', moveSan: 'c5', plyNumber: 2, sortOrder: 0 },
      { nodeId: 103, moveUci: 'g1f3', moveSan: 'Nf3', plyNumber: 3, sortOrder: 0 },
    ],
  },
  session: {
    sessionId: 41,
    fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2',
    expectedMove: 'd7d6',
    completed: false,
    sublineHash,
    sublineMoveText: 'e4 c5 Nf3',
  },
};

assert.deepEqual(trainingMarathonNextResponseSchema.parse(response), response);
assert.deepEqual(lineTrainingStartResponseSchema.parse(response.session), response.session);

const completedResponse = {
  ...response,
  scope: null,
  session: {
    sessionId: 42,
    fen: 'startpos',
    completed: true,
    sublineHash,
    sublineMoveText: 'e4',
  },
};
assert.deepEqual(trainingMarathonNextResponseSchema.parse(completedResponse), completedResponse);

assert.throws(() => trainingMarathonNextResponseSchema.parse({ ...response, mode: 'UNKNOWN' }));
assert.throws(() => trainingMarathonNextResponseSchema.parse({
  ...response,
  line: { ...response.line, sideToTrain: 'GREEN' },
}));
assert.throws(() => trainingMarathonNextResponseSchema.parse({
  ...response,
  subline: { ...response.subline, hash: 'short' },
}));
assert.throws(() => trainingMarathonNextResponseSchema.parse({
  ...response,
  session: { ...response.session, sessionId: 0 },
}));
assert.throws(() => trainingMarathonNextResponseSchema.parse({
  ...response,
  session: { ...response.session, expectedMove: null },
}));

const trainingSession = {
  id: 51,
  userId: 2,
  lineId: 11,
  clientAttemptId: null,
  source: 'WEB_ONLINE',
  sourceDeviceId: null,
  courseContentRevision: null,
  receivedAt: '2026-08-13T18:00:00.000Z',
  startedAt: '2026-08-13T18:00:00.000Z',
  completedAt: null,
  result: 'IN_PROGRESS',
  mistakesCount: 0,
  totalExpectedMoves: 1,
  correctMoves: 1,
  accuracy: 1,
};
assert.deepEqual(trainingSessionResponseSchema.parse(trainingSession), trainingSession);
assert.deepEqual(completeTrainingResponseSchema.parse(null), null);
assert.throws(() => trainingSessionResponseSchema.parse({ ...trainingSession, result: 'UNKNOWN' }));
assert.throws(() => trainingSessionResponseSchema.parse({ ...trainingSession, startedAt: new Date() }));
assert.throws(() => completeTrainingResponseSchema.parse({}));

const moveResponse = {
  correct: true,
  expectedMove: 'e2e4',
  playedMoves: [
    { moveUci: 'e2e4', moveSan: 'e4', isUserMove: true },
    { moveUci: 'c7c5', moveSan: 'c5', isUserMove: false },
  ],
  fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
  nextExpectedMove: 'g1f3',
  completed: false,
  accuracy: 1,
  mistakesCount: 0,
  correctMoves: 1,
  totalExpectedMoves: 1,
};
assert.deepEqual(trainingMoveResponseSchema.parse(moveResponse), moveResponse);
assert.throws(() => trainingMoveResponseSchema.parse({ ...moveResponse, expectedMove: null }));
assert.throws(() => trainingMoveResponseSchema.parse({ ...moveResponse, result: 'UNKNOWN' }));

const historyItem = {
  ...trainingSession,
  line: {
    id: 11,
    name: 'Open Sicilian',
    chapter: { id: 3, name: 'Sicilian Defence', courseId: 7 },
  },
  sublineAttempt: {
    sublineHash,
    sublineKeyVersion: 1,
    moveText: 'e4 c5 Nf3',
    trainingMode: 'LINE',
  },
};
assert.deepEqual(trainingHistoryResponseSchema.parse([historyItem]), [historyItem]);
assert.throws(() => trainingHistoryResponseSchema.parse([{ ...historyItem, line: undefined }]));

const review = {
  ...trainingSession,
  result: 'FAILED',
  completedAt: '2026-08-13T18:05:00.000Z',
  mistakesCount: 1,
  correctMoves: 0,
  accuracy: 0,
  mistakes: [{
    id: 71,
    moveNodeId: 103,
    fenBefore: 'startpos',
    expectedMoveUci: 'e2e4',
    playedMoveUci: 'd2d4',
    moveSan: 'e4',
    comment: null,
    annotation: null,
    branchLabel: null,
    createdAt: '2026-08-13T18:01:00.000Z',
  }],
};
assert.deepEqual(trainingReviewResponseSchema.parse(review), review);
assert.throws(() => trainingReviewResponseSchema.parse({
  ...review,
  mistakes: [{ ...review.mistakes[0], createdAt: new Date() }],
}));

console.log('Training marathon and session contract tests passed.');
