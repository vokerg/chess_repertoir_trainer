import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import Fastify from 'fastify';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { Chess } from 'chess.js';
import prismaModule from '../../dist/prisma.js';
import {
  currentTacticalDetectionThresholdsHash,
  currentTacticalDetectionVersion,
} from '../../dist/modules/lab/tactical-detections/tactical-detection.service.js';
import scenarioTrainingModule from '../../dist/modules/scenario-training/scenario-training.routes.js';

const prisma = prismaModule.default;
const suffix = randomUUID();
const positionIds = [];
let userId;
let app;

function applyUci(fen, moveUci) {
  const chess = new Chess(fen);
  chess.move({
    from: moveUci.slice(0, 2),
    to: moveUci.slice(2, 4),
    promotion: moveUci.slice(4, 5) || undefined,
  });
  return chess.fen();
}

async function passSession(session) {
  const moveUci = session.referenceBestMoveUci;
  const response = await app.inject({
    method: 'POST',
    url: `/api/scenario-training/${session.sessionId}/attempt`,
    payload: {
      moveUci,
      fenAfter: applyUci(session.startFen, moveUci),
      engineSource: 'CLIENT_STOCKFISH',
      engineDepth: 12,
      engineMultipv: 1,
      baselineScoreCpWhite: 0,
      afterScoreCpWhite: 0,
    },
  });
  assert.equal(response.statusCode, 200);
  assert.equal(response.json().passed, true);
}

try {
  const user = await prisma.appUser.create({
    data: {
      displayName: 'Game tactical cycle test',
      authProvider: 'test',
      authSubject: `game-tactical-cycle-${suffix}`,
      email: `game-tactical-cycle-${suffix}@example.test`,
    },
  });
  userId = user.id;
  const account = await prisma.externalAccount.create({
    data: { userId, provider: 'LICHESS', username: `game-cycle-${suffix}` },
  });
  const game = await prisma.importedGame.create({
    data: {
      userId,
      accountId: account.id,
      provider: 'LICHESS',
      providerGameId: `game-tactical-cycle-${suffix}`,
      whiteUsername: 'cycle-user',
      blackUsername: 'cycle-opponent',
      userColor: 'WHITE',
      opponentUsername: 'cycle-opponent',
      result: '1-0',
      resultForUser: 'WIN',
      endedAt: new Date(),
    },
  });

  const moves = ['e2e4', 'e7e5', 'g1f3'];
  const chess = new Chess();
  for (let index = 0; index < moves.length; index += 1) {
    const position = await prisma.position.create({
      data: { positionKey: randomBytes(16), normalizedFen: chess.fen() },
    });
    positionIds.push(position.id);
    await prisma.importedGamePly.create({
      data: {
        importedGameId: game.id,
        positionId: position.id,
        plyNumber: index + 1,
        moveUci: moves[index],
      },
    });
    chess.move({
      from: moves[index].slice(0, 2),
      to: moves[index].slice(2, 4),
    });
  }

  const thresholdsHash = currentTacticalDetectionThresholdsHash();
  const detectionVersion = currentTacticalDetectionVersion();
  const run = await prisma.tacticalDetectionRun.create({
    data: {
      userId,
      from: new Date(Date.now() - 86_400_000),
      to: new Date(),
      thresholds: {},
      thresholdsHash,
    },
  });
  const blunder = await prisma.tacticalDetection.create({
    data: {
      runId: run.id,
      userId,
      importedGameId: game.id,
      kind: 'USER_BLUNDER',
      thresholdsHash,
      detectionVersion,
      triggerPlyNumber: 1,
      moveUci: 'e2e4',
      bestMoveUci: 'd2d4',
      evalBeforeUserCp: 0,
      evalAfterTriggerUserCp: -200,
    },
  });
  const missedShot = await prisma.tacticalDetection.create({
    data: {
      runId: run.id,
      userId,
      importedGameId: game.id,
      kind: 'MISSED_SHOT',
      thresholdsHash,
      detectionVersion,
      triggerPlyNumber: 2,
      userReplyPlyNumber: 3,
      moveUci: 'e7e5',
      bestMoveUci: 'g1f3',
      evalBeforeUserCp: 0,
      evalAfterTriggerUserCp: 200,
      evalAfterReplyUserCp: 0,
    },
  });

  app = Fastify();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.decorateRequest('auth', null);
  app.addHook('onRequest', async (request) => {
    request.auth = { userId, provider: 'dev', externalSubject: `game-cycle-${suffix}` };
  });
  await app.register(scenarioTrainingModule);

  const firstResponse = await app.inject({
    method: 'POST',
    url: '/api/scenario-training/tactical-game/start',
    payload: { gameId: game.id, detectionId: missedShot.id },
  });
  assert.equal(firstResponse.statusCode, 200);
  const first = firstResponse.json();
  const cycleStartedAt = first.startedAt;
  assert.equal(first.scenarioType, 'MISSED_OPPORTUNITY');
  await passSession(first);

  const secondResponse = await app.inject({
    method: 'POST',
    url: '/api/scenario-training/tactical-game/start',
    payload: {
      gameId: game.id,
      excludeDetectionId: missedShot.id,
      excludePassedSince: cycleStartedAt,
    },
  });
  assert.equal(secondResponse.statusCode, 200);
  const second = secondResponse.json();
  assert.equal(second.sourceId, blunder.id);
  assert.equal(second.scenarioType, 'BLUNDER_AVOIDANCE');
  await passSession(second);

  const completeResponse = await app.inject({
    method: 'POST',
    url: '/api/scenario-training/tactical-game/start',
    payload: {
      gameId: game.id,
      excludeDetectionId: blunder.id,
      excludePassedSince: cycleStartedAt,
    },
  });
  assert.equal(completeResponse.statusCode, 404);
  assert.deepEqual(completeResponse.json(), { error: 'No more tactical findings in this game' });

  const repeatResponse = await app.inject({
    method: 'POST',
    url: '/api/scenario-training/tactical-game/start',
    payload: { gameId: game.id },
  });
  assert.equal(repeatResponse.statusCode, 200);
  assert.ok([blunder.id, missedShot.id].includes(repeatResponse.json().sourceId));

  console.log('Game tactical training cycle test passed.');
} finally {
  if (app) await app.close();
  if (userId) await prisma.appUser.delete({ where: { id: userId } });
  if (positionIds.length) await prisma.position.deleteMany({ where: { id: { in: positionIds } } });
  await prisma.$disconnect();
}
