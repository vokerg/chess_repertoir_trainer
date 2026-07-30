import type { FastifyReply } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  aiBuilderCandidateExplanationRequestSchema,
  aiBuilderCandidateExplanationResponseSchema,
  aiCapabilitiesResponseSchema,
  aiErrorResponseSchema,
  aiGameReviewResponseSchema,
  aiGameReviewStateResponseSchema,
} from '@chess-trainer/contracts/ai';
import { requireAuth } from '../../auth/request-auth';
import { validationErrorResponseSchema } from '../../routes/api-error.schemas';
import { unauthorizedResponseSchema } from '../../routes/legacy-route.schemas';
import {
  builderCandidateExplanationAvailable,
  gameReviewAvailable,
  loadAiConfig,
} from './ai.config';
import { asAiFeatureError } from './ai.errors';
import { GameReviewService } from './game-review/game-review.service';
import { CandidateExplanationService } from './repertoire-builder/candidate-explanation/candidate-explanation.service';

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
    const config = loadAiConfig();
    return {
      widgets: {
        gameReview: gameReviewAvailable(config),
        builderCandidateExplanation: builderCandidateExplanationAvailable(config),
      },
    };
  });

  app.post('/api/ai/repertoire-builder/candidate-explanation', {
    schema: {
      operationId: 'generateBuilderCandidateExplanation',
      tags: ['AI'],
      summary: 'Generate an advisory explanation for one Builder candidate',
      description: 'Rebuilds the authoritative deterministic candidate decision server-side, then returns a transient generated interpretation whose references are reconciled against that response. It cannot change ranking, selection, Builder state, or course output.',
      body: aiBuilderCandidateExplanationRequestSchema,
      response: {
        200: aiBuilderCandidateExplanationResponseSchema,
        400: validationErrorResponseSchema,
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
      return await CandidateExplanationService.generate(auth.userId, request.body, request.log);
    } catch (error) {
      return sendAiError(reply, error);
    }
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
