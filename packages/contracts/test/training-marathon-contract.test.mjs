import assert from 'node:assert/strict';
import { trainingMarathonNextResponseSchema } from '../dist/training/index.js';

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

console.log('Training marathon contract tests passed.');
