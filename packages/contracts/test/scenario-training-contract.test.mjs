import assert from 'node:assert/strict';
import {
  scenarioAttemptResultResponseSchema,
  scenarioTrainingDislikeResponseSchema,
  scenarioTrainingHistoryResponseSchema,
  scenarioTrainingSessionResponseSchema,
} from '../dist/scenario-training/index.js';

const attempt = {
  id: 91,
  sessionId: 41,
  attemptNumber: 1,
  fenBefore: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  playedMoveUci: 'e2e4',
  playedMoveSan: 'e4',
  fenAfter: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
  baselineUserEvalCp: 12,
  afterUserEvalCp: 18,
  deltaCp: 6,
  passed: true,
  engineSource: 'CLIENT_STOCKFISH',
  engineName: null,
  engineDepth: 18,
  engineMultipv: 1,
  rawEngineJson: null,
  createdAt: '2026-08-14T18:00:00.000Z',
};

const session = {
  id: 41,
  sessionId: 41,
  scenarioType: 'BLUNDER_AVOIDANCE',
  sourceType: 'TACTICAL_DETECTION',
  sourceId: 77,
  importedGameId: null,
  whiteUsername: 'white-player',
  blackUsername: 'black-player',
  whiteRating: null,
  blackRating: 1812,
  userColor: 'BLACK',
  opponentUsername: 'white-player',
  resultForUser: 'LOSS',
  gameResult: '1-0',
  openingEco: 'B20',
  openingName: 'Sicilian Defence',
  endedAt: '2026-08-13T20:15:00.000Z',
  providerUrl: null,
  previousFen: null,
  startFen: attempt.fenBefore,
  challengePlyNumber: 2,
  triggerMoveUci: 'e2e4',
  triggerMoveSan: 'e4',
  originalUserMoveUci: 'e7e5',
  originalUserMoveSan: 'e5',
  referenceBestMoveUci: 'c7c5',
  contextPlies: [
    {
      plyNumber: 1,
      moveNumber: 1,
      moveUci: 'e2e4',
      moveSan: 'e4',
      fenBefore: attempt.fenBefore,
      fenAfter: attempt.fenAfter,
      isUserMove: false,
    },
  ],
  baselineUserEvalCp: -30,
  passToleranceCp: 100,
  status: 'COMPLETED',
  startedAt: '2026-08-14T17:59:00.000Z',
  completedAt: '2026-08-14T18:01:00.000Z',
  attempts: [attempt],
};

assert.deepEqual(scenarioTrainingSessionResponseSchema.parse(session), session);
assert.deepEqual(
  scenarioTrainingHistoryResponseSchema.parse({ items: [session] }),
  { items: [session] },
);
assert.deepEqual(
  scenarioAttemptResultResponseSchema.parse({
    passed: true,
    baselineUserEvalCp: 12,
    afterUserEvalCp: 18,
    deltaCp: 6,
    session,
  }),
  {
    passed: true,
    baselineUserEvalCp: 12,
    afterUserEvalCp: 18,
    deltaCp: 6,
    session,
  },
);
assert.deepEqual(
  scenarioTrainingDislikeResponseSchema.parse({ disliked: true }),
  { disliked: true },
);

const { importedGameId: _importedGameId, ...missingImportedGameId } = session;
assert.equal(
  scenarioTrainingSessionResponseSchema.safeParse(missingImportedGameId).success,
  false,
  'importedGameId is required on the wire even when its value is null',
);
assert.equal(
  scenarioTrainingSessionResponseSchema.safeParse({ ...session, startedAt: new Date() }).success,
  false,
  'session dates must be ISO strings on the wire',
);
assert.equal(
  scenarioTrainingSessionResponseSchema.safeParse({ ...session, status: 'ABANDONED' }).success,
  false,
  'session status must stay within the stable wire literals',
);
assert.equal(
  scenarioTrainingSessionResponseSchema.safeParse({ ...session, sourceType: 'OTHER' }).success,
  false,
  'scenario source type must stay within the stable wire literal',
);
const { rawEngineJson: _rawEngineJson, ...attemptWithoutRawEngineJson } = attempt;
assert.equal(
  scenarioTrainingSessionResponseSchema.safeParse({
    ...session,
    attempts: [attemptWithoutRawEngineJson],
  }).success,
  false,
  'rawEngineJson is a required nullable JSON field in persisted attempts',
);
assert.equal(
  scenarioTrainingDislikeResponseSchema.safeParse({ disliked: false }).success,
  false,
  'dislike success is the literal true acknowledgement',
);

console.log('Scenario-training contract tests passed.');
