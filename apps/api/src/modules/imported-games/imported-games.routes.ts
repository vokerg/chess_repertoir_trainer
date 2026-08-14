import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import {
  importedGameDetailResponseSchema,
  importedGameFacetsResponseSchema,
  importedGameIdParamsSchema,
  importedGameIndexWorkflowResponseSchema,
  importedGamePgnResponseSchema,
  importedGameSearchQuerySchema,
  importedGameSearchResponseSchema,
  importedGameTagDefinitionsResponseSchema,
  importedGameTagsRefreshResponseSchema,
  legacyApiErrorResponseSchema,
  legacyMessageResponseSchema,
  openingAnalysisCoreResponseSchema,
  openingAnalysisPerformanceResponseSchema,
  openingAnalysisTopGamesResponseSchema,
  type ImportedGameIndexWorkflowResult,
  type OpeningAnalysisAppliedFilters,
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
import { z } from 'zod';
import { unauthorizedResponseSchema } from '../../routes/legacy-route.schemas';
import { apiErrorResponseSchema } from '../../routes/api-error.schemas';

const forceSchema = z.object({ force: z.boolean().optional() });
const importedGamesRouteSchema = <T extends Record<string, unknown>>(operationId: string, extra: T) => ({
  operationId,
  tags: ['Imported games'],
  ...extra,
});

type OpeningAnalysisServiceAppliedFilters = Awaited<
  ReturnType<typeof OpeningAnalysisService.getPosition>
>['appliedFilters'];

function toOpeningAnalysisAppliedFilters(
  filters: OpeningAnalysisServiceAppliedFilters,
): OpeningAnalysisAppliedFilters {
  const { from, to, ...rest } = filters;
  return {
    ...rest,
    rated: filters.rated ?? true,
    ...(from ? { from: from.toISOString() } : {}),
    ...(to ? { to: to.toISOString() } : {}),
  };
}

function toOpeningAnalysisWireResponse<T extends { appliedFilters: OpeningAnalysisServiceAppliedFilters }>(response: T) {
  return {
    ...response,
    appliedFilters: toOpeningAnalysisAppliedFilters(response.appliedFilters),
  };
}

function toImportedGameIndexWorkflowResponse(
  result: Awaited<ReturnType<typeof ImportedGameIndexWorkflowService.indexGame>>,
): ImportedGameIndexWorkflowResult {
  const plyIndex = result.plyIndex
    ? {
        importedGameId: result.plyIndex.importedGameId,
        status: result.plyIndex.status,
        ...(result.plyIndex.pliesIndexed !== undefined ? { pliesIndexed: result.plyIndex.pliesIndexed } : {}),
        ...(result.plyIndex.plyIndexedAt !== undefined
          ? { plyIndexedAt: result.plyIndex.plyIndexedAt?.toISOString() ?? null }
          : {}),
        ...(result.plyIndex.error !== undefined ? { error: result.plyIndex.error } : {}),
      }
    : undefined;

  return {
    importedGameId: result.importedGameId,
    eligible: result.eligible,
    speedCategory: result.speedCategory,
    ...(result.skippedReason !== undefined ? { skippedReason: result.skippedReason } : {}),
    ...(plyIndex ? { plyIndex } : {}),
    ...(result.openingAssignment ? { openingAssignment: result.openingAssignment } : {}),
  };
}

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
      response: { 200: openingAnalysisCoreResponseSchema, 400: apiErrorResponseSchema, 401: unauthorizedResponseSchema },
    }),
    handler: async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;

      let response;
      try {
        response = await OpeningAnalysisService.getPosition(auth.userId, request.query, request.log);
      } catch (err: any) {
        reply.code(400);
        return { error: err?.message ?? String(err) };
      }
      return openingAnalysisCoreResponseSchema.parse(toOpeningAnalysisWireResponse(response));
    },
  });

  app.route({
    method: 'GET',
    url: '/api/opening-analysis/performance',
    schema: importedGamesRouteSchema('getOpeningAnalysisPerformance', {
      summary: 'Get opening-position performance',
      description: 'Returns bounded database-backed performance buckets for games reaching the position.',
      querystring: openingAnalysisQuerySchema,
      response: { 200: openingAnalysisPerformanceResponseSchema, 400: apiErrorResponseSchema, 401: unauthorizedResponseSchema },
    }),
    handler: async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;

      let response;
      try {
        response = await OpeningAnalysisService.getPerformance(auth.userId, request.query, request.log);
      } catch (err: any) {
        reply.code(400);
        return { error: err?.message ?? String(err) };
      }
      return openingAnalysisPerformanceResponseSchema.parse(toOpeningAnalysisWireResponse(response));
    },
  });

  app.route({
    method: 'GET',
    url: '/api/opening-analysis/top-games',
    schema: importedGamesRouteSchema('getOpeningAnalysisTopGames', {
      summary: 'Get recent games reaching an opening position',
      querystring: openingAnalysisTopGamesQuerySchema,
      response: { 200: openingAnalysisTopGamesResponseSchema, 400: apiErrorResponseSchema, 401: unauthorizedResponseSchema },
    }),
    handler: async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;

      let response;
      try {
        response = await OpeningAnalysisService.getTopGames(auth.userId, request.query, request.query.limit, request.log);
      } catch (err: any) {
        reply.code(400);
        return { error: err?.message ?? String(err) };
      }
      return openingAnalysisTopGamesResponseSchema.parse(toOpeningAnalysisWireResponse(response));
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
    schema: importedGamesRouteSchema('refreshImportedGameTags', {
      summary: 'Refresh derived tags for one imported game',
      description: 'Bodyless action: tags are recalculated from the persisted game and analysis.',
      params: importedGameIdParamsSchema,
      response: { 200: importedGameTagsRefreshResponseSchema, 400: apiErrorResponseSchema, 401: unauthorizedResponseSchema, 404: apiErrorResponseSchema },
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
        200: importedGameIndexWorkflowResponseSchema,
        201: importedGameIndexWorkflowResponseSchema,
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
        if (result.plyIndex?.status === 'FAILED') {
          reply.code(400);
          return { error: result.plyIndex.error ?? 'Imported game indexing failed' };
        }
        if (result.plyIndex?.status === 'INDEXED') reply.code(201);
        return toImportedGameIndexWorkflowResponse(result);
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
