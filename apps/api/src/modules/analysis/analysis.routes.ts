import { FastifyInstance } from 'fastify';
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

function parseGameId(params: unknown): number | null {
  const gameId = Number((params as any).gameId);
  return Number.isInteger(gameId) && gameId > 0 ? gameId : null;
}

const batchAnalysisRequestSchema = z.object({
  gameIds: z.array(z.number().int().positive()).min(1).max(500),
});

const importedGameParamsSchema = z.object({ gameId: z.coerce.number().int().positive() });
const analysisRouteSchema = (operationId: string, extra: Record<string, unknown> = {}) => ({
  operationId,
  tags: ['Analysis'],
  ...extra,
});

export default async function analysisModule(app: FastifyInstance) {
  app.get('/api/imported-games/batch-analysis/config', {
    schema: analysisRouteSchema('getBatchAnalysisConfig'),
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    return { enabled: isLocalBatchStockfishAnalysisEnabled() };
  });

  app.post('/api/imported-games/batch-analysis-runs', {
    schema: analysisRouteSchema('createBatchAnalysisRun', { body: batchAnalysisRequestSchema }),
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    if (!isLocalBatchStockfishAnalysisEnabled()) {
      reply.code(403);
      return { error: 'Local batch Stockfish analysis is disabled' };
    }

    const parsed = batchAnalysisRequestSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      reply.code(400);
      return { error: parsed.error.issues };
    }

    const gameIds = Array.from(new Set(parsed.data.gameIds));
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
    schema: analysisRouteSchema('getPositionAnalysis', { querystring: positionAnalysisLookupSchema }),
    handler: async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;
      const parsed = positionAnalysisLookupSchema.safeParse(request.query ?? {});
      if (!parsed.success) {
        reply.code(400);
        return { error: parsed.error.issues };
      }

      try {
        const positionAnalysis = await PositionAnalysisService.getPositionAnalysis(parsed.data.fen);
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
    schema: analysisRouteSchema('bulkLookupPositionAnalysis', { body: bulkPositionAnalysisLookupSchema }),
    handler: async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;
      const parsed = bulkPositionAnalysisLookupSchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        reply.code(400);
        return { error: parsed.error.issues };
      }

      try {
        const positionAnalyses = await PositionAnalysisService.getPositionAnalyses(parsed.data.fens);
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
    schema: analysisRouteSchema('storePositionAnalysis', { body: storePositionAnalysisSchema }),
    handler: async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;
      const parsed = storePositionAnalysisSchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        reply.code(400);
        return { error: parsed.error.issues };
      }

      try {
        const positionAnalysis = await PositionAnalysisService.storePositionSearch(parsed.data);
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
    schema: analysisRouteSchema('bulkStorePositionAnalysis', { body: bulkStorePositionAnalysisSchema }),
    handler: async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;
      const parsed = bulkStorePositionAnalysisSchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        reply.code(400);
        return { error: parsed.error.issues };
      }

      try {
        const positionAnalyses = await PositionAnalysisService.storePositionSearches(parsed.data.positions);
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
    schema: analysisRouteSchema('getImportedGameAnalysis', { params: importedGameParamsSchema }),
    handler: async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;
      const gameId = parseGameId(request.params);
      if (!gameId) {
        reply.code(400);
        return { error: 'Invalid imported game id' };
      }

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
      params: importedGameParamsSchema,
      body: clientGameAnalysisRunSchema,
    }),
    handler: async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;
      const gameId = parseGameId(request.params);
      if (!gameId) {
        reply.code(400);
        return { error: 'Invalid imported game id' };
      }

      const parsed = clientGameAnalysisRunSchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        reply.code(400);
        return { error: parsed.error.issues };
      }

      try {
        const result = await ImportedGameAnalysisWorkflowService.recordClientAnalysisAndRefreshTags(
          auth.userId,
          gameId,
          parsed.data,
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
      params: importedGameParamsSchema,
      body: updatePlyAnalysisSchema,
    }),
    handler: async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;
      const gameId = parseGameId(request.params);
      if (!gameId) {
        reply.code(400);
        return { error: 'Invalid imported game id' };
      }

      const parsed = updatePlyAnalysisSchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        reply.code(400);
        return { error: parsed.error.issues };
      }

      try {
        return await updateImportedGamePlyAnalysis(auth.userId, gameId, parsed.data.plies);
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
    schema: analysisRouteSchema('clearImportedGamePlyAnalysis', { params: importedGameParamsSchema }),
    handler: async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;
      const gameId = parseGameId(request.params);
      if (!gameId) {
        reply.code(400);
        return { error: 'Invalid imported game id' };
      }

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
}
