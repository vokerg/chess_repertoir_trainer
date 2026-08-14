import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import Fastify from 'fastify';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import {
  openingAnalysisCoreResponseSchema,
  openingAnalysisPerformanceResponseSchema,
  openingAnalysisTopGamesResponseSchema,
} from '@chess-trainer/contracts/imported-games';
import prismaModule from '../../dist/prisma.js';
import importedGamesModule from '../../dist/modules/imported-games/imported-games.routes.js';

const prisma = prismaModule.default;
const suffix = randomUUID();
let userId;
let app;

try {
  const user = await prisma.appUser.create({
    data: {
      displayName: 'Opening analysis HTTP contract test',
      authProvider: 'test',
      authSubject: `opening-http-contract-${suffix}`,
      email: `opening-http-contract-${suffix}@example.test`,
    },
  });
  userId = user.id;

  app = Fastify();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.decorateRequest('auth', null);
  app.addHook('onRequest', async (request) => {
    request.auth = {
      userId,
      provider: 'dev',
      externalSubject: `opening-http-contract-${suffix}`,
    };
  });
  await app.register(importedGamesModule);

  const from = '2026-08-01T00:00:00.000Z';
  const query = `fen=startpos&from=${encodeURIComponent(from)}`;

  const coreResponse = await app.inject({ method: 'GET', url: `/api/opening-analysis?${query}` });
  assert.equal(coreResponse.statusCode, 200);
  const core = openingAnalysisCoreResponseSchema.parse(coreResponse.json());
  assert.equal(core.appliedFilters.from, from);
  assert.equal(core.appliedFilters.rated, true);
  assert.equal(core.appliedFilters.sort, 'endedAtDesc');
  assert.equal(core.appliedFilters.limit, 50);

  const performanceResponse = await app.inject({
    method: 'GET',
    url: `/api/opening-analysis/performance?${query}`,
  });
  assert.equal(performanceResponse.statusCode, 200);
  const performance = openingAnalysisPerformanceResponseSchema.parse(performanceResponse.json());
  assert.equal(performance.appliedFilters.from, from);
  assert.equal(performance.appliedFilters.rated, true);
  assert.equal(performance.appliedFilters.limit, 50);

  const topGamesResponse = await app.inject({
    method: 'GET',
    url: `/api/opening-analysis/top-games?${query}&limit=10`,
  });
  assert.equal(topGamesResponse.statusCode, 200);
  const topGames = openingAnalysisTopGamesResponseSchema.parse(topGamesResponse.json());
  assert.equal(topGames.appliedFilters.from, from);
  assert.equal(topGames.appliedFilters.rated, true);
  assert.equal(topGames.appliedFilters.limit, 10);

  console.log('Opening analysis HTTP contract tests passed.');
} finally {
  if (app) await app.close();
  if (userId) await prisma.appUser.delete({ where: { id: userId } });
  await prisma.$disconnect();
}
