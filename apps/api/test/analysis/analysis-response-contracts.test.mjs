import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import Fastify from 'fastify';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import {
  importedGameAnalysisResponseSchema,
  importedGameClientAnalysisResponseSchema,
  importedGamePlyAnalysisClearResponseSchema,
  importedGamePlyAnalysisUpdateResponseSchema,
  positionAnalysisBulkResponseSchema,
  positionAnalysisLookupResponseSchema,
  positionAnalysisStoreResponseSchema,
} from '@chess-trainer/contracts/analysis';
import { normalizeFenForPosition } from 'chess-domain';
import prismaModule from '../../dist/prisma.js';
import analysisModule from '../../dist/modules/analysis/analysis.routes.js';
import { PositionAnalysisService } from '../../dist/modules/analysis/position-analysis.service.js';

const prisma = prismaModule.default;
const suffix = randomUUID();
const fen = '8/8/8/8/4K3/8/8/7k w - - 0 1';
const normalizedFen = normalizeFenForPosition(fen);
let userId;
let app;

async function cleanupPosition() {
  await prisma.position.deleteMany({ where: { normalizedFen } });
}

try {
  await cleanupPosition();

  const user = await prisma.appUser.create({
    data: {
      displayName: 'Analysis response contract test',
      authProvider: 'test',
      authSubject: `analysis-contract-${suffix}`,
      email: `analysis-contract-${suffix}@example.test`,
    },
  });
  userId = user.id;
  const account = await prisma.externalAccount.create({
    data: {
      userId,
      provider: 'LICHESS',
      username: `analysis-contract-${suffix}`,
    },
  });
  const game = await prisma.importedGame.create({
    data: {
      userId,
      accountId: account.id,
      provider: 'LICHESS',
      providerGameId: `analysis-contract-game-${suffix}`,
      speedCategory: 'blitz',
      variant: 'standard',
      userColor: 'WHITE',
      resultForUser: 'DRAW',
      status: 'finished',
    },
  });

  const stored = await PositionAnalysisService.storePositionSearch({
    fen,
    bestMoveUci: 'e4e5',
    bestScoreCpWhite: 12,
    lines: [{
      multipv: 1,
      depth: 18,
      moveUci: 'e4e5',
      scoreCpWhite: 12,
      pvUci: ['e4e5'],
    }],
  });
  assert.deepEqual(
    positionAnalysisStoreResponseSchema.parse({ positionAnalysis: stored, position: stored }),
    { positionAnalysis: stored, position: stored },
  );

  const lookedUp = await PositionAnalysisService.getPositionAnalysis(fen);
  assert.deepEqual(
    positionAnalysisLookupResponseSchema.parse({ positionAnalysis: lookedUp }),
    { positionAnalysis: lookedUp },
  );

  await prisma.positionAnalysis.update({
    where: { positionId: stored.positionId },
    data: {
      lines: [{
        multipv: 1,
        depth: 18,
        moveUci: 'e4e5',
        scoreCpWhite: 12,
      }],
    },
  });
  const bulkLookedUp = await PositionAnalysisService.getPositionAnalyses([fen]);
  const parsedBulkLookup = positionAnalysisBulkResponseSchema.parse({ positionAnalyses: bulkLookedUp });
  assert.deepEqual(parsedBulkLookup.positionAnalyses[0]?.lines[0]?.pvUci, ['e4e5']);

  const bulkStored = await PositionAnalysisService.storePositionSearches([{
    fen,
    bestMoveUci: 'e4d5',
    bestScoreCpWhite: 20,
    lines: [{
      multipv: 1,
      depth: 20,
      moveUci: 'e4d5',
      scoreCpWhite: 20,
      pvUci: ['e4d5'],
    }],
  }]);
  assert.deepEqual(
    positionAnalysisBulkResponseSchema.parse({ positionAnalyses: bulkStored }),
    { positionAnalyses: bulkStored },
  );

  app = Fastify();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.decorateRequest('auth', null);
  app.addHook('onRequest', async (request) => {
    request.auth = {
      userId,
      provider: 'dev',
      externalSubject: `analysis-contract-${suffix}`,
    };
  });
  await app.register(analysisModule);

  const storeResponse = await app.inject({
    method: 'POST',
    url: '/api/position-analysis/store',
    payload: {
      fen,
      bestMoveUci: 'e4e5',
      bestScoreCpWhite: 25,
      lines: [{
        multipv: 1,
        depth: 22,
        moveUci: 'e4e5',
        scoreCpWhite: 25,
        pvUci: ['e4e5'],
      }],
    },
  });
  assert.equal(storeResponse.statusCode, 200);
  const storeBody = positionAnalysisStoreResponseSchema.parse(storeResponse.json());
  assert.deepEqual(storeBody.position, storeBody.positionAnalysis);
  assert.equal(storeBody.positionAnalysis.bestScoreCpWhite, 25);

  const lookupResponse = await app.inject({
    method: 'GET',
    url: `/api/position-analysis?fen=${encodeURIComponent(fen)}`,
  });
  assert.equal(lookupResponse.statusCode, 200);
  const lookupBody = positionAnalysisLookupResponseSchema.parse(lookupResponse.json());
  assert.equal(lookupBody.positionAnalysis?.bestScoreCpWhite, 25);

  const bulkLookupResponse = await app.inject({
    method: 'POST',
    url: '/api/position-analysis/bulk-lookup',
    payload: { fens: [fen] },
  });
  assert.equal(bulkLookupResponse.statusCode, 200);
  assert.equal(
    positionAnalysisBulkResponseSchema.parse(bulkLookupResponse.json()).positionAnalyses.length,
    1,
  );

  const bulkStoreResponse = await app.inject({
    method: 'POST',
    url: '/api/position-analysis/bulk-store',
    payload: {
      positions: [{
        fen,
        bestMoveUci: 'e4d5',
        bestScoreCpWhite: 30,
        lines: [{
          multipv: 1,
          depth: 24,
          moveUci: 'e4d5',
          scoreCpWhite: 30,
          pvUci: ['e4d5'],
        }],
      }],
    },
  });
  assert.equal(bulkStoreResponse.statusCode, 200);
  const bulkStoreBody = positionAnalysisBulkResponseSchema.parse(bulkStoreResponse.json());
  assert.equal(bulkStoreBody.positionAnalyses[0]?.bestScoreCpWhite, 30);

  const clientAnalysisResponse = await app.inject({
    method: 'POST',
    url: `/api/imported-games/${game.id}/analysis-runs`,
    payload: {
      positionsDone: 0,
      summary: { source: 'route-contract' },
    },
  });
  assert.equal(clientAnalysisResponse.statusCode, 201);
  const clientAnalysisBody = importedGameClientAnalysisResponseSchema.parse(clientAnalysisResponse.json());
  assert.equal(clientAnalysisBody.run.importedGameId, game.id);
  assert.deepEqual(clientAnalysisBody.run.summary, { source: 'route-contract' });
  assert.equal(clientAnalysisBody.tags.importedGameId, game.id);

  const analysisResponse = await app.inject({
    method: 'GET',
    url: `/api/imported-games/${game.id}/analysis`,
  });
  assert.equal(analysisResponse.statusCode, 200);
  const analysisBody = importedGameAnalysisResponseSchema.parse(analysisResponse.json());
  assert.equal(analysisBody.run.id, clientAnalysisBody.run.id);
  assert.deepEqual(analysisBody.run.summary, { source: 'route-contract' });

  const updatePlyResponse = await app.inject({
    method: 'PATCH',
    url: `/api/imported-games/${game.id}/plies/analysis`,
    payload: {
      plies: [{
        plyNumber: 1,
        scoreLossCp: null,
        classificationCode: null,
      }],
    },
  });
  assert.equal(updatePlyResponse.statusCode, 200);
  assert.deepEqual(
    importedGamePlyAnalysisUpdateResponseSchema.parse(updatePlyResponse.json()),
    { importedGameId: game.id, updatedPlies: 0 },
  );

  const clearPlyResponse = await app.inject({
    method: 'POST',
    url: `/api/imported-games/${game.id}/plies/analysis/clear`,
  });
  assert.equal(clearPlyResponse.statusCode, 200);
  assert.deepEqual(
    importedGamePlyAnalysisClearResponseSchema.parse(clearPlyResponse.json()),
    { importedGameId: game.id, clearedPlies: 0 },
  );

  console.log('Analysis response service and route contract tests passed.');
} finally {
  if (app) await app.close();
  if (userId) await prisma.appUser.delete({ where: { id: userId } });
  await cleanupPosition();
  await prisma.$disconnect();
}
