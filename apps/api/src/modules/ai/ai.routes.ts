import type { FastifyReply } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  aiCapabilitiesResponseSchema,
  aiErrorResponseSchema,
  aiGameReviewResponseSchema,
  aiGameReviewStateResponseSchema,
} from '@chess-trainer/contracts/ai';
import { requireAuth } from '../../auth/request-auth';
import { unauthorizedResponseSchema } from '../../routes/legacy-route.schemas';
import { loadAiConfig, gameReviewAvailable } from './ai.config';
import { asAiFeatureError } from './ai.errors';
import { GameReviewService } from './game-review/game-review.service';

const gameIdParamsSchema = z.object({
  gameId: z.coerce.number().int().positive(),
});

const aiModule: FastifyPluginAsyncZod = async (app) => {
  app.get('/api/ai/capabilities', {
    schema: {
      operationId: 'getAiCapabilities',
      tags: ['AI'],
      summary: 'Get enabled AI widgets',
      description: 'Returns provider-neutral AI widget availability for the authenticated client.',
      response: {
        200: aiCapabilitiesResponseSchema,
        401: unauthorizedResponseSchema,
      },
    },
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    return { widgets: { gameReview: gameReviewAvailable(loadAiConfig()) } };
  });

  app.get('/api/imported-games/:gameId/ai-review', {
    schema: {
      operationId: 'getImportedGameAiReview',
      tags: ['AI'],
      summary: 'Get the saved AI overview for one imported game',
      description: 'Returns the current persisted AI review for the owned imported game, or null when none has been generated.',
      params: gameIdParamsSchema,
      response: {
        200: aiGameReviewStateResponseSchema,
        401: unauthorizedResponseSchema,
        404: aiErrorResponseSchema,
        500: aiErrorResponseSchema,
      },
    },
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;

    try {
      return await GameReviewService.getStored(auth.userId, request.params.gameId);
    } catch (error) {
      return sendAiError(reply, error);
    }
  });

  app.post('/api/imported-games/:gameId/ai-review', {
    schema: {
      operationId: 'generateImportedGameAiReview',
      tags: ['AI'],
      summary: 'Generate an AI overview for one imported game',
      description: 'Bodyless on-demand action using persisted game metadata and completed engine analysis; the generated review replaces the current saved review.',
      params: gameIdParamsSchema,
      response: {
        200: aiGameReviewResponseSchema,
        401: unauthorizedResponseSchema,
        404: aiErrorResponseSchema,
        409: aiErrorResponseSchema,
        429: aiErrorResponseSchema,
        500: aiErrorResponseSchema,
        502: aiErrorResponseSchema,
        503: aiErrorResponseSchema,
        504: aiErrorResponseSchema,
      },
    },
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;

    try {
      return await GameReviewService.generate(auth.userId, request.params.gameId, request.log);
    } catch (error) {
      return sendAiError(reply, error);
    }
  });
};

function sendAiError(reply: FastifyReply, error: unknown) {
  const mapped = asAiFeatureError(error);
  return reply.code(mapped.statusCode).send({
    code: mapped.code,
    error: mapped.message,
  });
}

export default aiModule;
