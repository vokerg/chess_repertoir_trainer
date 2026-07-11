import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { requireAuth } from '../../auth/request-auth';
import { z } from 'zod';
import {
  bulkPositionAnalysisLookupSchema,
  bulkStorePositionAnalysisSchema,
  clientGameAnalysisRunSchema,
  positionAnalysisLookupSchema,
  storePositionAnalysisSchema,
  updatePlyAnalysisSchema,
} from './analysis.schemas';
import { isLocalBatchStockfishAnalysisEnabled } from './batch-analysis.config';
import { ImportedGameBatchAnalysisService } from './batch-game-analysis.service';
import { GameAnalysisService } from './game-analysis.service';
import { ImportedGameAnalysisWorkflowService } from './imported-game-analysis-workflow.service';
import { PositionAnalysisService } from './position-analysis.service';
import { clearImportedGamePlyAnalysis, updateImportedGamePlyAnalysis } from './analysis.repository.prisma';
import {
  apiErrorResponseSchema,
  legacyOpaqueResponseSchema,
  messageResponseSchema,
  unauthorizedResponseSchema,
} from '../../routes/legacy-route.schemas';
import { validationErrorResponseSchema } from '../../routes/api-error.schemas';

const batchAnalysisRequestSchema = z.object({
  gameIds: z.array(z.number().int().positive()).min(1).max(500),
});

const importedGameParamsSchema = z.object({ gameId: z.coerce.number().int().positive() });
const analysisRouteSchema = <T extends Record<string, unknown>>(operationId: string, extra: T) => ({
  operationId,
  tags: ['Analysis'],
  ...extra,
});

const analysisModule: FastifyPluginAsyncZod = async (app) => {
  app.get('/api/imported-games/batch-analysis/config', {
    schema: analysisRouteSchema('getBatchAnalysisConfig', {
      summary: 'Get local batch-analysis availability',
      response: {
        200: z.object({ enabled: z.boolean() }),
        401: unauthorizedResponseSchema,
      },
    }),
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    return { enabled: isLocalBatchStockfishAnalysisEnabled() };
  });

  app.post('/api/imported-games/batch-analysis-runs', {
    schema: analysisRouteSchema('createBatchAnalysisRun', {
      summary: 'Queue analysis for imported games',
      body: batchAnalysisRequestSchema,
      response: {
        200: z.object({ accepted: z.literal(true), gameIds: z.array(z.number().int().positive()) }),
        400: validationErrorResponseSchema,
        401: unauthorizedResponseSchema,
        403: apiErrorResponseSchema,
      },
    }),
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    if (!isLocalBatchStockfishAnalysisEnabled()) {
      reply.code(403);
      return { error: 'Local batch Stockfish analysis is disabled' };
    }

    const gameIds = Array.from(new Set(request.body.gameIds));
    try {
      const acceptedGameIds = await ImportedGameBatchAnalysisService.enqueue(auth.userId, gameIds);
      reply.code(200);
      return {
        accepted: true,
        gameIds: acceptedGameIds,
      };
    } catch (err: any) {
      reply.code(400);
      return { error: err?.message ?? String(err) };
    }
  });

  app.route({
    method: 'GET',
    url: '/api/position-analysis',
    schema: analysisRouteSchema('getPositionAnalysis', {
      summary: 'Look up cached analysis for one position',
      querystring: positionAnalysisLookupSchema,
      response: { 200: legacyOpaqueResponseSchema, 400: validationErrorResponseSchema, 401: unauthorizedResponseSchema },
    }),
    handler: async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;
      try {
        const positionAnalysis = await PositionAnalysisService.getPositionAnalysis(request.query.fen);
        return { positionAnalysis };
      } catch (err: any) {
        reply.code(400);
        return { error: err?.message ?? String(err) };
      }
    },
  });

  app.route({
    method: 'POST',
    url: '/api/position-analysis/bulk-lookup',
    schema: analysisRouteSchema('bulkLookupPositionAnalysis', {
      summary: 'Look up cached analysis for multiple positions',
      body: bulkPositionAnalysisLookupSchema,
      response: { 200: legacyOpaqueResponseSchema, 400: validationErrorResponseSchema, 401: unauthorizedResponseSchema },
    }),
    handler: async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;
      try {
        const positionAnalyses = await PositionAnalysisService.getPositionAnalyses(request.body.fens);
        return { positionAnalyses };
      } catch (err: any) {
        reply.code(400);
        return { error: err?.message ?? String(err) };
      }
    },
  });

  app.route({
    method: 'POST',
    url: '/api/position-analysis/store',
    schema: analysisRouteSchema('storePositionAnalysis', {
      summary: 'Store analysis for one position',
      body: storePositionAnalysisSchema,
      response: { 200: legacyOpaqueResponseSchema, 400: validationErrorResponseSchema, 401: unauthorizedResponseSchema },
    }),
    handler: async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;
      try {
        const positionAnalysis = await PositionAnalysisService.storePositionSearch(request.body);
        // Legacy compatibility for older clients. Bulk-store intentionally returns only positionAnalyses.
        return { positionAnalysis, position: positionAnalysis };
      } catch (err: any) {
        reply.code(400);
        return { error: err?.message ?? String(err) };
      }
    },
  });

  app.route({
    method: 'POST',
    url: '/api/position-analysis/bulk-store',
    schema: analysisRouteSchema('bulkStorePositionAnalysis', {
      summary: 'Store analysis for multiple positions',
      body: bulkStorePositionAnalysisSchema,
      response: { 200: legacyOpaqueResponseSchema, 400: validationErrorResponseSchema, 401: unauthorizedResponseSchema },
    }),
    handler: async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;
      try {
        const positionAnalyses = await PositionAnalysisService.storePositionSearches(request.body.positions);
        return { positionAnalyses };
      } catch (err: any) {
        reply.code(400);
        return { error: err?.message ?? String(err) };
      }
    },
  });

  app.route({
    method: 'GET',
    url: '/api/imported-games/:gameId/analysis',
    schema: analysisRouteSchema('getImportedGameAnalysis', {
      summary: 'Get the latest analysis run for an imported game',
      params: importedGameParamsSchema,
      response: {
        200: legacyOpaqueResponseSchema,
        400: validationErrorResponseSchema,
        401: unauthorizedResponseSchema,
        404: apiErrorResponseSchema,
      },
    }),
    handler: async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;
      const gameId = request.params.gameId;

      try {
        return await GameAnalysisService.getImportedGameAnalysis(auth.userId, gameId);
      } catch (err: any) {
        const message = err?.message ?? String(err);
        if (message === 'Imported game not found' || message === 'Imported game analysis not found') {
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
    url: '/api/imported-games/:gameId/analysis-runs',
    schema: analysisRouteSchema('createClientGameAnalysisRun', {
      summary: 'Record a client-computed imported-game analysis run',
      params: importedGameParamsSchema,
      body: clientGameAnalysisRunSchema,
      response: {
        201: legacyOpaqueResponseSchema,
        400: validationErrorResponseSchema,
        401: unauthorizedResponseSchema,
        404: apiErrorResponseSchema,
      },
    }),
    handler: async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;
      const gameId = request.params.gameId;

      try {
        const result = await ImportedGameAnalysisWorkflowService.recordClientAnalysisAndRefreshTags(
          auth.userId,
          gameId,
          request.body,
        );
        reply.code(201);
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

  app.route({
    method: 'PATCH',
    url: '/api/imported-games/:gameId/plies/analysis',
    schema: analysisRouteSchema('updateImportedGamePlyAnalysis', {
      summary: 'Update analysis classifications for imported-game plies',
      params: importedGameParamsSchema,
      body: updatePlyAnalysisSchema,
      response: {
        200: legacyOpaqueResponseSchema,
        400: validationErrorResponseSchema,
        401: unauthorizedResponseSchema,
        404: apiErrorResponseSchema,
      },
    }),
    handler: async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;
      const gameId = request.params.gameId;

      try {
        return await updateImportedGamePlyAnalysis(auth.userId, gameId, request.body.plies);
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
    url: '/api/imported-games/:gameId/plies/analysis/clear',
    schema: analysisRouteSchema('clearImportedGamePlyAnalysis', {
      summary: 'Clear persisted analysis from imported-game plies',
      description: 'Bodyless action: the imported game id fully identifies the analysis rows to clear.',
      params: importedGameParamsSchema,
      response: {
        200: legacyOpaqueResponseSchema,
        400: validationErrorResponseSchema,
        401: unauthorizedResponseSchema,
        404: apiErrorResponseSchema,
      },
    }),
    handler: async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;
      const gameId = request.params.gameId;

      try {
        return await clearImportedGamePlyAnalysis(auth.userId, gameId);
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

export default analysisModule;
