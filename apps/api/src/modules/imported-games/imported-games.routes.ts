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
import { ImportedGamesService, PersistedImportedGameAnalysisError } from './imported-games.service';
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
import {
  apiErrorResponseSchema,
  legacyOpaqueResponseSchema,
  unauthorizedResponseSchema,
} from '../../routes/legacy-route.schemas';
import { validationErrorResponseSchema } from '../../routes/api-error.schemas';

const forceSchema = z.object({ force: z.boolean().optional() });
const importedGamesRouteSchema = <T extends Record<string, unknown>>(operationId: string, extra: T) => ({
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
    schema: importedGamesRouteSchema('getOpeningAnalysis', {
      summary: 'Get core opening analysis for one board position',
      description: 'Returns position WDL, next moves, and opening-book lookup for the current user filters.',
      querystring: openingAnalysisQuerySchema,
      response: { 200: legacyOpaqueResponseSchema, 400: validationErrorResponseSchema, 401: unauthorizedResponseSchema },
    }),
    handler: async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;
      try {
        return await OpeningAnalysisService.getPosition(auth.userId, request.query, request.log);
      } catch (err: any) {
        reply.code(400);
        return { error: err?.message ?? String(err) };
      }
    },
  });

  app.route({
    method: 'GET',
    url: '/api/opening-analysis/performance',
    schema: importedGamesRouteSchema('getOpeningAnalysisPerformance', {
      summary: 'Get opening-position performance',
      description: 'Returns bounded database-backed performance buckets for games reaching the position.',
      querystring: openingAnalysisQuerySchema,
      response: { 200: legacyOpaqueResponseSchema, 400: validationErrorResponseSchema, 401: unauthorizedResponseSchema },
    }),
    handler: async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;
      try {
        return await OpeningAnalysisService.getPerformance(auth.userId, request.query, request.log);
      } catch (err: any) {
        reply.code(400);
        return { error: err?.message ?? String(err) };
      }
    },
  });

  app.route({
    method: 'GET',
    url: '/api/opening-analysis/top-games',
    schema: importedGamesRouteSchema('getOpeningAnalysisTopGames', {
      summary: 'Get recent games reaching an opening position',
      querystring: openingAnalysisTopGamesQuerySchema,
      response: { 200: legacyOpaqueResponseSchema, 400: validationErrorResponseSchema, 401: unauthorizedResponseSchema },
    }),
    handler: async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;
      try {
        return await OpeningAnalysisService.getTopGames(auth.userId, request.query, request.query.limit, request.log);
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
        500: legacyApiErrorResponseSchema,
      },
    },
  }, async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;

      let game;
      try {
        game = await ImportedGamesService.get(auth.userId, request.params.gameId);
      } catch (error) {
        if (error instanceof PersistedImportedGameAnalysisError) {
          request.log.error({ err: error, gameId: request.params.gameId }, 'Stored imported-game analysis could not be normalized');
          return reply.code(500).send({ error: 'Stored analysis data is invalid' });
        }
        throw error;
      }
      if (!game) {
        return reply.code(404).send({ message: 'Imported game not found' });
      }
      return game;
  });

  app.route({
    method: 'POST',
    url: '/api/imported-games/:gameId/tags/refresh',
    schema: importedGamesRouteSchema('refreshImportedGameTags', {
      summary: 'Refresh derived tags for one imported game',
      description: 'Bodyless action: tags are recalculated from the persisted game and analysis.',
      params: importedGameIdParamsSchema,
      response: { 200: legacyOpaqueResponseSchema, 400: apiErrorResponseSchema, 401: unauthorizedResponseSchema, 404: apiErrorResponseSchema },
    }),
    handler: async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;
      const gameId = request.params.gameId;

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
    schema: importedGamesRouteSchema('createImportedGameFullRefreshRun', {
      summary: 'Queue a full imported-game refresh',
      description: 'Bodyless action: force re-indexes, assigns an opening, recalculates analysis, and refreshes tags.',
      params: importedGameIdParamsSchema,
      response: {
        200: z.object({
          accepted: z.literal(true),
          importedGameId: z.number().int().positive(),
          steps: z.array(z.enum(['PLY_INDEX', 'OPENING_ASSIGNMENT', 'ANALYSIS', 'TAGS'])).length(4),
        }),
        400: apiErrorResponseSchema,
        401: unauthorizedResponseSchema,
        403: apiErrorResponseSchema,
      },
    }),
    handler: async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;
      const gameId = request.params.gameId;
      if (!isLocalBatchStockfishAnalysisEnabled()) {
        reply.code(403);
        return { error: 'Local batch Stockfish analysis is disabled' };
      }

      try {
        await ImportedGameBatchAnalysisService.enqueueFullRefresh(auth.userId, gameId);
        return {
          accepted: true as const,
          importedGameId: gameId,
          steps: ['PLY_INDEX', 'OPENING_ASSIGNMENT', 'ANALYSIS', 'TAGS'] as Array<'PLY_INDEX' | 'OPENING_ASSIGNMENT' | 'ANALYSIS' | 'TAGS'>,
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
      summary: 'Run the standard indexing workflow for one imported game',
      description: 'Indexes plies and assigns missing opening metadata without running Stockfish.',
      params: importedGameIdParamsSchema,
      body: forceSchema,
      response: {
        200: legacyOpaqueResponseSchema,
        201: legacyOpaqueResponseSchema,
        400: apiErrorResponseSchema,
        401: unauthorizedResponseSchema,
        404: apiErrorResponseSchema,
      },
    }),
    handler: async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;
      const gameId = request.params.gameId;

      try {
        const result = await ImportedGameIndexWorkflowService.indexGame(auth.userId, gameId, {
          force: request.body.force === true,
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
