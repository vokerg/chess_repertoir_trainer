import assert from 'node:assert/strict';
import {
  tacticalDetectionListResponseSchema,
  tacticalDetectionRunResponseSchema,
  trainingLogResponseSchema,
} from '../dist/lab/index.js';

const trainingLogResponse = {
  items: [
    {
      id: 41,
      startedAt: '2026-08-14T05:00:00.000Z',
      completedAt: '2026-08-14T05:03:00.000Z',
      result: 'PASSED',
      courseId: 7,
      courseName: 'Sicilian Defence',
      chapterId: 12,
      chapterName: 'Najdorf',
      lineId: 91,
      lineName: 'Main line',
      sequence: 'e4 c5 Nf3 d6',
      isActiveSubline: true,
      accuracy: 100,
      mistakesCount: 0,
    },
  ],
};

assert.deepEqual(trainingLogResponseSchema.parse(trainingLogResponse), trainingLogResponse);
assert.deepEqual(trainingLogResponseSchema.parse({ items: [] }), { items: [] });
assert.equal(
  trainingLogResponseSchema.safeParse({
    items: [{ ...trainingLogResponse.items[0], startedAt: new Date() }],
  }).success,
  false,
  'training log dates must be ISO strings on the wire',
);
assert.equal(
  trainingLogResponseSchema.safeParse({
    items: [{ ...trainingLogResponse.items[0], result: 'UNKNOWN' }],
  }).success,
  false,
  'training log result must stay within the stable result literals',
);

const tacticalRunResponse = {
  runId: 17,
  scannedGames: 25,
  skippedAlreadyProcessedGames: 3,
  processedGames: 22,
  detectionsInserted: 8,
  missedShots: 3,
  punishedOpponentBlunders: 2,
  userBlunders: 3,
};

assert.deepEqual(tacticalDetectionRunResponseSchema.parse(tacticalRunResponse), tacticalRunResponse);
assert.equal(
  tacticalDetectionRunResponseSchema.safeParse({
    ...tacticalRunResponse,
    detectionsInserted: -1,
  }).success,
  false,
  'tactical detection counts cannot be negative',
);

const tacticalListResponse = {
  from: '2026-08-01T00:00:00.000Z',
  to: '2026-08-31T00:00:00.000Z',
  limit: 100,
  kind: 'MISSED_SHOT',
  items: [
    {
      id: 31,
      importedGameId: 204,
      kind: 'MISSED_SHOT',
      triggerPlyNumber: 24,
      userReplyPlyNumber: 25,
      moveUci: 'e4d5',
      bestMoveUci: 'f3d4',
      evalBeforeUserCp: 45,
      evalAfterTriggerUserCp: -185,
      evalAfterReplyUserCp: -210,
      swingCp: 230,
      opponentUsername: 'opponent',
      userColor: 'WHITE',
      resultForUser: 'LOSS',
      openingName: 'Sicilian Defence',
      openingEco: 'B90',
      endedAt: '2026-08-13T18:30:00.000Z',
      providerUrl: 'https://lichess.org/example',
    },
  ],
};

assert.deepEqual(tacticalDetectionListResponseSchema.parse(tacticalListResponse), tacticalListResponse);
assert.deepEqual(
  tacticalDetectionListResponseSchema.parse({
    from: null,
    to: null,
    limit: 200,
    kind: null,
    items: [],
  }),
  {
    from: null,
    to: null,
    limit: 200,
    kind: null,
    items: [],
  },
);
assert.equal(
  tacticalDetectionListResponseSchema.safeParse({
    ...tacticalListResponse,
    items: [{ ...tacticalListResponse.items[0], endedAt: '2026-08-13' }],
  }).success,
  false,
  'tactical detection dates must be ISO date-times',
);
assert.equal(
  tacticalDetectionListResponseSchema.safeParse({
    ...tacticalListResponse,
    kind: 'UNKNOWN',
  }).success,
  false,
  'tactical detection kind must stay within the stable wire literals',
);

console.log('Lab training/tactical contract tests passed.');
