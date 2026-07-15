import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  performanceByRatingQuerySchema,
  performanceByRatingResponseSchema,
} from '@chess-trainer/contracts/lab';
import { requireAuth } from '../../auth/request-auth';
import { getMonthlyGames } from './monthly-games/monthly-games.service';
import { openingStrugglesQuerySchema } from './opening-struggles/opening-struggles.schema';
import { getOpeningStruggles } from './opening-struggles/opening-struggles.service';
import { getPerformanceByRating } from './performance-by-rating/performance-by-rating.service';
import {
  tacticalDetectionListSchema,
  tacticalDetectionRunSchema,
} from './tactical-detections/tactical-detection.schema';
import {
  getTacticalDetections,
  runTacticalDetection,
} from './tactical-detections/tactical-detection.service';
import { trainingLogQuerySchema } from './training-log/training-log.schema';
import { getTrainingLog } from './training-log/training-log.service';
import { getTopOpponents } from './top-opponents/top-opponents.service';
import { legacyOpaqueResponseSchema, unauthorizedResponseSchema } from '../../routes/legacy-route.schemas';
import { validationErrorResponseSchema } from '../../routes/api-error.schemas';

const limitQuerySchema = z.object({ limit: z.coerce.number().int().min(1).max(200).default(50) });
const monthlyGamesQuerySchema = z.object({
  excludeBullet: z.preprocess((value) => value === 'true' ? true : value === 'false' ? false : value, z.boolean().default(false)),
});
const labSchema = <T extends Record<string, unknown>>(operationId: string, summary: string, extra: T) => ({ operationId, tags: ['Lab'], summary, ...extra });

const labModule: FastifyPluginAsyncZod = async (app) => {
  app.get('/api/lab/top-opponents', {
    schema: labSchema('getTopOpponents', 'Get the most frequently faced opponents', {
      querystring: limitQuerySchema,
      response: { 200: legacyOpaqueResponseSchema, 400: validationErrorResponseSchema, 401: unauthorizedResponseSchema },
    }),
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    return getTopOpponents(auth.userId, request.query.limit);
  });

  app.get('/api/lab/monthly-games', {
    schema: labSchema('getMonthlyGames', 'Get imported-game counts by month', {
      querystring: monthlyGamesQuerySchema,
      response: { 200: legacyOpaqueResponseSchema, 400: validationErrorResponseSchema, 401: unauthorizedResponseSchema },
    }),
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    return getMonthlyGames(auth.userId, { excludeBullet: request.query.excludeBullet });
  });

  app.get('/api/lab/performance-by-rating', {
    schema: labSchema('getPerformanceByRating', 'Compare results across opponent rating bands', {
      description: 'Groups scored Lichess and Chess.com blitz/rapid games by 100-point opponent rating bands, optionally filtered by minimum opponent rating.',
      querystring: performanceByRatingQuerySchema,
      response: {
        200: performanceByRatingResponseSchema,
        400: validationErrorResponseSchema,
        401: unauthorizedResponseSchema,
      },
    }),
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    return getPerformanceByRating(auth.userId, request.query);
  });

  app.get('/api/lab/opening-struggles', {
    schema: labSchema('getOpeningStruggles', 'Find openings with the weakest results', {
      querystring: openingStrugglesQuerySchema,
      response: { 200: legacyOpaqueResponseSchema, 400: validationErrorResponseSchema, 401: unauthorizedResponseSchema },
    }),
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    return getOpeningStruggles(auth.userId, request.query);
  });

  app.get('/api/lab/training-log', {
    schema: labSchema('getTrainingLog', 'Get the training activity log', {
      querystring: trainingLogQuerySchema,
      response: { 200: legacyOpaqueResponseSchema, 400: validationErrorResponseSchema, 401: unauthorizedResponseSchema },
    }),
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    return getTrainingLog(auth.userId, request.query);
  });

  app.post('/api/lab/tactical-detections/run', {
    schema: labSchema('runTacticalDetection', 'Run tactical detection over imported games', {
      body: tacticalDetectionRunSchema,
      response: { 200: legacyOpaqueResponseSchema, 400: validationErrorResponseSchema, 401: unauthorizedResponseSchema },
    }),
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    return runTacticalDetection(auth.userId, request.body);
  });

  app.get('/api/lab/tactical-detections', {
    schema: labSchema('listTacticalDetections', 'List detected tactical opportunities', {
      querystring: tacticalDetectionListSchema,
      response: { 200: legacyOpaqueResponseSchema, 400: validationErrorResponseSchema, 401: unauthorizedResponseSchema },
    }),
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    return getTacticalDetections(auth.userId, request.query);
  });
};

export default labModule;
