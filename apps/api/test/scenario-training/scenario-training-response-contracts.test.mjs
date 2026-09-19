import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import Fastify from 'fastify';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { Chess } from 'chess.js';
import {
  scenarioAttemptResultResponseSchema,
  scenarioTrainingDislikeResponseSchema,
  scenarioTrainingHistoryResponseSchema,
  scenarioTrainingSessionResponseSchema,
} from '@chess-trainer/contracts/scenario-training';
import prismaModule from '../../dist/prisma.js';
import scenarioTrainingModule from '../../dist/modules/scenario-training/scenario-training.routes.js';

const prisma = prismaModule.default;
const suffix = randomUUID();
let userId;
let gameId;
let app;

try {
  const user = await prisma.appUser.create({
    data: {
      displayName: 'Scenario-training response contract test',
      authProvider: 'test',
      authSubject: `scenario-contract-${suffix}`,
      email: `scenario-contract-${suffix}@example.test`,
    },
  });
  userId = user.id;

  const account = await prisma.externalAccount.create({
    data: {
      userId,
      provider: 'LICHESS',
      username: `scenario-contract-${suffix}`,
    },
  });
  const game = await prisma.importedGame.create({
    data: {
      userId,
      accountId: account.id,
      provider: 'LICHESS',
      providerGameId: `scenario-contract-game-${suffix}`,
      providerUrl: 'https://lichess.org/scenario-contract',
      whiteUsername: 'contract-user',
      blackUsername: 'contract-opponent',
      whiteRating: 1825,
      blackRating: 1775,
      userColor: 'WHITE',
      opponentUsername: 'contract-opponent',
      resultForUser: 'WIN',
      result: '1-0',
      openingEco: 'C20',
      openingName: 'King Pawn Game',
      endedAt: new Date('2026-08-13T20:15:00.000Z'),
    },
  });
  gameId = game.id;

  const detectionRun = await prisma.tacticalDetectionRun.create({
    data: {
      userId,
      from: new Date('2026-08-01T00:00:00.000Z'),
      to: new Date('2026-08-14T00:00:00.000Z'),
      thresholds: {},
      thresholdsHash: `scenario-contract-${suffix}`,
    },
  });
  const detection = await prisma.tacticalDetection.create({
    data: {
      runId: detectionRun.id,
      userId,
      importedGameId: game.id,
      kind: 'MISSED_SHOT',
      thresholdsHash: detectionRun.thresholdsHash,
      detectionVersion: 2,
      triggerPlyNumber: 1,
      userReplyPlyNumber: 1,
      moveUci: 'e2e4',
      bestMoveUci: 'e2e4',
      evalBeforeUserCp: 0,
      evalAfterTriggerUserCp: 0,
      evalAfterReplyUserCp: 0,
      swingCp: 0,
    },
  });

  const initialFen = new Chess().fen();
  const session = await prisma.scenarioTrainingSession.create({
    data: {
      userId,
      scenarioType: 'MISSED_OPPORTUNITY',
      sourceType: 'TACTICAL_DETECTION',
      sourceId: detection.id,
      tacticalDetectionId: detection.id,
      importedGameId: game.id,
      userColor: 'WHITE',
      opponentUsername: game.opponentUsername,
      whiteUsername: game.whiteUsername,
      blackUsername: game.blackUsername,
      resultForUser: game.resultForUser,
      gameResult: game.result,
      openingEco: game.openingEco,
      openingName: game.openingName,
      endedAt: game.endedAt,
      providerUrl: game.providerUrl,
      previousFen: null,
      startFen: initialFen,
      challengePlyNumber: 1,
      triggerMoveUci: null,
      triggerMoveSan: null,
      originalUserMoveUci: null,
      originalUserMoveSan: null,
      referenceBestMoveUci: 'e2e4',
      contextPlies: [],
      baselineUserEvalCp: 0,
      passToleranceCp: 100,
    },
  });

  app = Fastify();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.decorateRequest('auth', null);
  app.addHook('onRequest', async (request) => {
    request.auth = {
      userId,
      provider: 'dev',
      externalSubject: `scenario-contract-${suffix}`,
    };
  });
  await app.register(scenarioTrainingModule);

  const getResponse = await app.inject({
    method: 'GET',
    url: `/api/scenario-training/${session.id}`,
  });
  assert.equal(getResponse.statusCode, 200);
  const getBody = scenarioTrainingSessionResponseSchema.parse(getResponse.json());
  assert.equal(getBody.importedGameId, game.id);
  assert.equal(getBody.whiteRating, 1825);
  assert.equal(getBody.blackRating, 1775);
  assert.deepEqual(getBody.attempts, []);

  const historyResponse = await app.inject({
    method: 'GET',
    url: '/api/scenario-training/history',
  });
  assert.equal(historyResponse.statusCode, 200);
  const historyBody = scenarioTrainingHistoryResponseSchema.parse(historyResponse.json());
  assert.equal(historyBody.items[0]?.id, session.id);

  const chess = new Chess(initialFen);
  chess.move('e4');
  const attemptResponse = await app.inject({
    method: 'POST',
    url: `/api/scenario-training/${session.id}/attempt`,
    payload: {
      moveUci: 'e2e4',
      fenAfter: chess.fen(),
      engineSource: 'CLIENT_STOCKFISH',
      engineDepth: 18,
      engineMultipv: 1,
      baselineScoreCpWhite: 0,
      afterScoreCpWhite: 10,
    },
  });
  assert.equal(attemptResponse.statusCode, 200);
  const attemptBody = scenarioAttemptResultResponseSchema.parse(attemptResponse.json());
  assert.equal(attemptBody.passed, true);
  assert.equal(attemptBody.session.attempts.length, 1);
  assert.equal(attemptBody.session.attempts[0]?.rawEngineJson, null);

  const completeResponse = await app.inject({
    method: 'POST',
    url: `/api/scenario-training/${session.id}/complete`,
  });
  assert.equal(completeResponse.statusCode, 200);
  const completeBody = scenarioTrainingSessionResponseSchema.parse(completeResponse.json());
  assert.equal(completeBody.status, 'COMPLETED');
  assert.ok(completeBody.completedAt);

  const dislikeResponse = await app.inject({
    method: 'POST',
    url: `/api/scenario-training/${session.id}/dislike`,
    payload: {},
  });
  assert.equal(dislikeResponse.statusCode, 200);
  assert.deepEqual(
    scenarioTrainingDislikeResponseSchema.parse(dislikeResponse.json()),
    { disliked: true },
  );

  await prisma.importedGame.delete({ where: { id: game.id } });
  gameId = undefined;

  const orphanedSessionResponse = await app.inject({
    method: 'GET',
    url: `/api/scenario-training/${session.id}`,
  });
  assert.equal(orphanedSessionResponse.statusCode, 200);
  const orphanedSession = scenarioTrainingSessionResponseSchema.parse(orphanedSessionResponse.json());
  assert.equal(orphanedSession.importedGameId, null);
  assert.equal(orphanedSession.whiteRating, null);
  assert.equal(orphanedSession.blackRating, null);

  console.log('Scenario-training HTTP response contract tests passed.');
} finally {
  if (app) await app.close();
  if (gameId) await prisma.importedGame.deleteMany({ where: { id: gameId } });
  if (userId) await prisma.appUser.delete({ where: { id: userId } });
  await prisma.$disconnect();
}
