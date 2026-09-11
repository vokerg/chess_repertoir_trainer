import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import {
  performanceByRatingQuerySchema,
  performanceByRatingResponseSchema,
} from '@chess-trainer/contracts/performance-by-rating';
import { requireAuth } from '../../auth/request-auth';
import { validationErrorResponseSchema } from '../../routes/api-error.schemas';
import { unauthorizedResponseSchema } from '../../routes/legacy-route.schemas';
import { getPerformanceByRating } from './performance-by-rating.service';

const response = {
  200: performanceByRatingResponseSchema,
  400: validationErrorResponseSchema,
  401: unauthorizedResponseSchema,
};

const performanceByRatingModule: FastifyPluginAsyncZod = async (app) => {
  app.get('/api/performance-by-rating', {
    schema: {
      operationId: 'getPerformanceByRatingReport',
      tags: ['Progress'],
      summary: 'Compare results across opponent rating bands',
      description:
        'Groups scored Lichess and Chess.com bullet, blitz, and rapid games by 100-point opponent rating bands, optionally filtered by minimum opponent rating.',
      querystring: performanceByRatingQuerySchema,
      response,
    },
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    return getPerformanceByRating(auth.userId, request.query);
  });

  app.get('/api/lab/performance-by-rating', {
    schema: {
      operationId: 'getPerformanceByRating',
      tags: ['Lab'],
      summary: 'Compare results across opponent rating bands',
      description:
        'Deprecated compatibility route. Use GET /api/performance-by-rating for the Progress report.',
      deprecated: true,
      querystring: performanceByRatingQuerySchema,
      response,
    },
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    return getPerformanceByRating(auth.userId, request.query);
  });
};

export default performanceByRatingModule;
