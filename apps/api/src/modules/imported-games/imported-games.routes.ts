import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import {
  importedGameDetailResponseSchema,
  importedGameFacetsResponseSchema,
  importedGameIdParamsSchema,
  importedGamePgnResponseSchema,
  importedGameSearchQuerySchema,
  importedGameSearchResponseSchema,
  importedGameTagDefinitionsResponseSchema,
  legacyApiErrorResponseSchema,
  legacyMessageResponseSchema,
} from '@chess-trainer/contracts/imported-games';
import { requireAuth } from '../../auth/request-auth';
import { ImportedGamesService } from './imported-games.service';
import {
  normalizeImportedGameSearchQuery,
  openingAnalysisQuerySchema,
  openingAnalysisTopGamesQuerySchema,
} from './imported-games.schemas';
import { ImportedGameIndexWorkflowService } from './imported-game-index-workflow.service';
import { OpeningAnalysisService } from './opening-analysis.service';
import { isLocalBatchStockfishAnalysisEnabled } from '../analysis/batch-analysis.config';
import { ImportedGameBatchAnalysisService } from '../analysis/batch-game-analysis.service';
import { z } from 'zod';

function parseGameId(params: unknown): number | null {
  const gameId = Number((params as any).gameId);
  return Number.isInteger(gameId) && gameId > 0 ? gameId : null;
}

function parseForce(body: unknown): boolean {
  if (!body || typeof body !== 'object') return false;
  return (body as any).force === true;
}

const forceSchema = z.object({ force: z.boolean().optional() });
const importedGamesRouteSchema = (operationId: string, extra: Record<string, unknown> = {}) => ({
  operationId,
  tags: ['Imported games'],
  ...extra,
});

const importedGamesModule: FastifyPluginAsyncZod = async (app) => {
  app.get('/api/imported-games', {
    schema: {
      operationId: 'listImportedGames',
      tags: ['Imported games'],
      summary: 'Search imported games for the current user',
      description: 'Returns compact imported-game list rows. PGN and full engine lines are excluded.',
      querystring: importedGameSearchQuerySchema,
      response: {
        200: importedGameSearchResponseSchema,
        400: legacyApiErrorResponseSchema,
        401: legacyMessageResponseSchema,
      },
    },
  }, async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;

      try {
        return await ImportedGamesService.search(auth.userId, normalizeImportedGameSearchQuery(request.query));
      } catch (err: any) {
        return reply.code(400).send({ error: err?.message ?? String(err) });
      }
  });

  app.route({
    method: 'GET',
    url: '/api/opening-analysis',
    schema: importedGamesRouteSchema('getOpeningAnalysis', { querystring: openingAnalysisQuerySchema }),
    handler: async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;
      const parsed = openingAnalysisQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        reply.code(400);
        return { error: parsed.error.issues };
      }

      try {
        return await OpeningAnalysisService.getPosition(auth.userId, parsed.data, request.log);
      } catch (err: any) {
        reply.code(400);
        return { error: err?.message ?? String(err) };
      }
    },
  });

  app.route({
    method: 'GET',
    url: '/api/opening-analysis/performance',
    schema: importedGamesRouteSchema('getOpeningAnalysisPerformance', { querystring: openingAnalysisQuerySchema }),
    handler: async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;
      const parsed = openingAnalysisQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        reply.code(400);
        return { error: parsed.error.issues };
      }

      try {
        return await OpeningAnalysisService.getPerformance(auth.userId, parsed.data, request.log);
      } catch (err: any) {
        reply.code(400);
        return { error: err?.message ?? String(err) };
      }
    },
  });

  app.route({
    method: 'GET',
    url: '/api/opening-analysis/top-games',
    schema: importedGamesRouteSchema('getOpeningAnalysisTopGames', { querystring: openingAnalysisTopGamesQuerySchema }),
    handler: async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;
      const parsed = openingAnalysisTopGamesQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        reply.code(400);
        return { error: parsed.error.issues };
      }

      try {
        return await OpeningAnalysisService.getTopGames(auth.userId, parsed.data, parsed.data.limit, request.log);
      } catch (err: any) {
        reply.code(400);
        return { error: err?.message ?? String(err) };
      }
    },
  });

  app.get('/api/imported-games/facets', {
    schema: {
      operationId: 'getImportedGameFacets',
      tags: ['Imported games'],
      summary: 'Get imported-game filter facets',
      response: {
        200: importedGameFacetsResponseSchema,
        401: legacyMessageResponseSchema,
      },
    },
  }, async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;
      return ImportedGamesService.facets(auth.userId);
  });

  app.get('/api/imported-games/tag-definitions', {
    schema: {
      operationId: 'getImportedGameTagDefinitions',
      tags: ['Imported games'],
      summary: 'Get imported-game tag definitions',
      response: {
        200: importedGameTagDefinitionsResponseSchema,
        401: legacyMessageResponseSchema,
      },
    },
  }, async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;
      return ImportedGamesService.tagDefinitions();
  });

  app.get('/api/imported-games/:gameId', {
    schema: {
      operationId: 'getImportedGame',
      tags: ['Imported games'],
      summary: 'Get one imported game',
      params: importedGameIdParamsSchema,
      response: {
        200: importedGameDetailResponseSchema,
        400: legacyApiErrorResponseSchema,
        401: legacyMessageResponseSchema,
        404: legacyMessageResponseSchema,
      },
    },
  }, async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;

      const game = await ImportedGamesService.get(auth.userId, request.params.gameId);
      if (!game) {
        return reply.code(404).send({ message: 'Imported game not found' });
      }
      return game;
  });

  app.route({
    method: 'POST',
    url: '/api/imported-games/:gameId/tags/refresh',
    schema: importedGamesRouteSchema('refreshImportedGameTags', { params: importedGameIdParamsSchema }),
    handler: async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;
      const gameId = parseGameId(request.params);
      if (!gameId) {
        reply.code(400);
        return { error: 'Invalid imported game id' };
      }

      try {
        return await ImportedGamesService.refreshTags(auth.userId, gameId);
      } catch (err: any) {
        const message = err?.message ?? String(err);
        if (message === 'Imported game not found') {
          reply.code(404);
          return { error: message };
        }
        reply.code(400);
        return { error: message };
      }
    },
  });

  app.route({
    method: 'POST',
    url: '/api/imported-games/:gameId/full-refresh-runs',
    schema: importedGamesRouteSchema('createImportedGameFullRefreshRun', { params: importedGameIdParamsSchema }),
    handler: async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;
      const gameId = parseGameId(request.params);
      if (!gameId) {
        reply.code(400);
        return { error: 'Invalid imported game id' };
      }
      if (!isLocalBatchStockfishAnalysisEnabled()) {
        reply.code(403);
        return { error: 'Local batch Stockfish analysis is disabled' };
      }

      try {
        await ImportedGameBatchAnalysisService.enqueueFullRefresh(auth.userId, gameId);
        return {
          accepted: true,
          importedGameId: gameId,
          steps: ['PLY_INDEX', 'OPENING_ASSIGNMENT', 'ANALYSIS', 'TAGS'],
        };
      } catch (err: any) {
        reply.code(400);
        return { error: err?.message ?? String(err) };
      }
    },
  });

  app.get('/api/imported-games/:gameId/pgn', {
    schema: {
      operationId: 'getImportedGamePgn',
      tags: ['Imported games'],
      summary: 'Get PGN for one imported game',
      params: importedGameIdParamsSchema,
      response: {
        200: importedGamePgnResponseSchema,
        400: legacyApiErrorResponseSchema,
        401: legacyMessageResponseSchema,
        404: legacyMessageResponseSchema,
      },
    },
  }, async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;

      const game = await ImportedGamesService.getPgn(auth.userId, request.params.gameId);
      if (!game) {
        return reply.code(404).send({ message: 'Imported game not found' });
      }
      return game;
  });

  app.route({
    method: 'POST',
    url: '/api/imported-games/:gameId/ply-index',
    schema: importedGamesRouteSchema('indexImportedGamePly', {
      params: importedGameIdParamsSchema,
      body: forceSchema,
    }),
    handler: async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;
      const gameId = parseGameId(request.params);
      if (!gameId) {
        reply.code(400);
        return { error: 'Invalid imported game id' };
      }

      try {
        const result = await ImportedGameIndexWorkflowService.indexGame(auth.userId, gameId, {
          force: parseForce(request.body),
        });
        if (result.plyIndex?.status === 'INDEXED') reply.code(201);
        if (result.plyIndex?.status === 'FAILED') reply.code(400);
        return result;
      } catch (err: any) {
        const message = err?.message ?? String(err);
        if (message === 'Imported game not found') {
          reply.code(404);
          return { error: message };
        }
        reply.code(400);
        return { error: message };
      }
    },
  });
};

export default importedGamesModule;
