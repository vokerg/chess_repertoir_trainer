import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../auth/request-auth';
import { z } from 'zod';
import { registerOpenApiRoute, registerOpenApiSchemas } from '../../openapi/route-registry';
import {
  analysisOpenApiSchemas,
  bulkPositionAnalysisLookupOpenApiOperation,
  bulkStorePositionAnalysisOpenApiOperation,
  clearPlyAnalysisOpenApiOperation,
  createClientGameAnalysisRunOpenApiOperation,
  getImportedGameAnalysisOpenApiOperation,
  getPositionAnalysisOpenApiOperation,
  storePositionAnalysisOpenApiOperation,
  updatePlyAnalysisOpenApiOperation,
} from './analysis.openapi';
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
import { PositionAnalysisService } from './position-analysis.service';
import { clearImportedGamePlyAnalysis, updateImportedGamePlyAnalysis } from './analysis.repository.prisma';

function parseGameId(params: unknown): number | null {
  const gameId = Number((params as any).gameId);
  return Number.isInteger(gameId) && gameId > 0 ? gameId : null;
}

const batchAnalysisRequestSchema = z.object({
  gameIds: z.array(z.number().int().positive()).min(1).max(500),
});

export default async function analysisModule(app: FastifyInstance) {
  registerOpenApiSchemas(analysisOpenApiSchemas);

  app.get('/api/imported-games/batch-analysis/config', async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    return { enabled: isLocalBatchStockfishAnalysisEnabled() };
  });

  app.post('/api/imported-games/batch-analysis-runs', async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    if (!isLocalBatchStockfishAnalysisEnabled()) {
      reply.code(403);
      return { error: 'Local batch Stockfish analysis is disabled' };
    }

    const parsed = batchAnalysisRequestSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      reply.code(400);
      return { error: parsed.error.errors };
    }

    const gameIds = Array.from(new Set(parsed.data.gameIds));
    try {
      ImportedGameBatchAnalysisService.enqueue(auth.userId, gameIds);
      reply.code(200);
      return {
        accepted: true,
        gameIds,
      };
    } catch (err: any) {
      reply.code(400);
      return { error: err?.message ?? String(err) };
    }
  });

  registerOpenApiRoute(app, {
    method: 'get',
    url: '/api/position-analysis',
    operation: getPositionAnalysisOpenApiOperation,
    handler: async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;
      const parsed = positionAnalysisLookupSchema.safeParse(request.query ?? {});
      if (!parsed.success) {
        reply.code(400);
        return { error: parsed.error.errors };
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

  registerOpenApiRoute(app, {
    method: 'post',
    url: '/api/position-analysis/bulk-lookup',
    operation: bulkPositionAnalysisLookupOpenApiOperation,
    handler: async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;
      const parsed = bulkPositionAnalysisLookupSchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        reply.code(400);
        return { error: parsed.error.errors };
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

  registerOpenApiRoute(app, {
    method: 'post',
    url: '/api/position-analysis/store',
    operation: storePositionAnalysisOpenApiOperation,
    handler: async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;
      const parsed = storePositionAnalysisSchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        reply.code(400);
        return { error: parsed.error.errors };
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

  registerOpenApiRoute(app, {
    method: 'post',
    url: '/api/position-analysis/bulk-store',
    operation: bulkStorePositionAnalysisOpenApiOperation,
    handler: async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;
      const parsed = bulkStorePositionAnalysisSchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        reply.code(400);
        return { error: parsed.error.errors };
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

  registerOpenApiRoute(app, {
    method: 'get',
    url: '/api/imported-games/:gameId/analysis',
    operation: getImportedGameAnalysisOpenApiOperation,
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

  registerOpenApiRoute(app, {
    method: 'post',
    url: '/api/imported-games/:gameId/analysis-runs',
    operation: createClientGameAnalysisRunOpenApiOperation,
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
        return { error: parsed.error.errors };
      }

      try {
        const result = await GameAnalysisService.createClientAnalysisSummary(auth.userId, gameId, parsed.data);
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

  registerOpenApiRoute(app, {
    method: 'patch',
    url: '/api/imported-games/:gameId/plies/analysis',
    operation: updatePlyAnalysisOpenApiOperation,
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
        return { error: parsed.error.errors };
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

  registerOpenApiRoute(app, {
    method: 'post',
    url: '/api/imported-games/:gameId/plies/analysis/clear',
    operation: clearPlyAnalysisOpenApiOperation,
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
