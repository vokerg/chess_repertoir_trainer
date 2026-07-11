import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { TrainingService } from '../../services/trainingService';
import { requireAuth } from '../../auth/request-auth';
import {
  apiErrorResponseSchema,
  legacyOpaqueResponseSchema,
  unauthorizedResponseSchema,
} from '../../routes/legacy-route.schemas';
import { validationErrorResponseSchema } from '../../routes/api-error.schemas';

const playMoveSchema = z.object({
  moveUci: z.string().min(4).max(5),
});
const lineIdParamsSchema = z.object({ lineId: z.coerce.number().int().positive() });
const sessionIdParamsSchema = z.object({ sessionId: z.coerce.number().int().positive() });

const trainingSchema = <T extends Record<string, unknown>>(operationId: string, summary: string, extra: T) => ({
  operationId,
  tags: ['Training'],
  summary,
  ...extra,
});

function isNotFound(error: unknown) {
  return error instanceof Error && (error.message === 'Line not found' || error.message === 'Training session not found');
}

const trainingModule: FastifyPluginAsyncZod = async (app) => {
  app.post('/api/lines/:lineId/training/start', {
    schema: trainingSchema('startLineTraining', 'Start a training session for one line', {
      description: 'Bodyless action: the line id selects the repertoire material.',
      params: lineIdParamsSchema,
      response: { 200: legacyOpaqueResponseSchema, 400: z.union([validationErrorResponseSchema, apiErrorResponseSchema]), 401: unauthorizedResponseSchema, 404: apiErrorResponseSchema },
    }),
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    try {
      const session = await TrainingService.start(auth.userId, request.params.lineId);
      reply.send(session);
    } catch (err: any) {
      reply.status(isNotFound(err) ? 404 : 400).send({ error: err.message });
    }
  });

  app.get('/api/training/history', {
    schema: trainingSchema('listTrainingHistory', 'List completed and active training sessions', {
      response: { 200: legacyOpaqueResponseSchema, 401: unauthorizedResponseSchema },
    }),
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    reply.send(await TrainingService.listHistory(auth.userId));
  });

  app.get('/api/training/:sessionId', {
    schema: trainingSchema('getTrainingSession', 'Get one training session', {
      params: sessionIdParamsSchema,
      response: { 200: legacyOpaqueResponseSchema, 400: validationErrorResponseSchema, 401: unauthorizedResponseSchema, 404: apiErrorResponseSchema },
    }),
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const session = await TrainingService.getSession(auth.userId, request.params.sessionId);
    if (!session) return reply.status(404).send({ error: 'Training session not found' });
    reply.send(session);
  });

  app.post('/api/training/:sessionId/move', {
    schema: trainingSchema('playTrainingMove', 'Play a move in a training session', {
      params: sessionIdParamsSchema,
      body: playMoveSchema,
      response: { 200: legacyOpaqueResponseSchema, 400: z.union([validationErrorResponseSchema, apiErrorResponseSchema]), 401: unauthorizedResponseSchema, 404: apiErrorResponseSchema },
    }),
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    try {
      const result = await TrainingService.playMove(auth.userId, request.params.sessionId, request.body.moveUci);
      reply.send(result);
    } catch (err: any) {
      reply.status(isNotFound(err) ? 404 : 400).send({ error: err.message });
    }
  });

  app.get('/api/training/:sessionId/review', {
    schema: trainingSchema('getTrainingReview', 'Get the review for one training session', {
      params: sessionIdParamsSchema,
      response: { 200: legacyOpaqueResponseSchema, 400: validationErrorResponseSchema, 401: unauthorizedResponseSchema, 404: apiErrorResponseSchema },
    }),
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const review = await TrainingService.getReview(auth.userId, request.params.sessionId);
    if (!review) return reply.status(404).send({ error: 'Training session not found' });
    reply.send(review);
  });

  app.post('/api/training/:sessionId/complete', {
    schema: trainingSchema('completeTrainingSession', 'Complete one training session', {
      description: 'Bodyless action: completion uses the persisted session state.',
      params: sessionIdParamsSchema,
      response: { 200: legacyOpaqueResponseSchema, 400: z.union([validationErrorResponseSchema, apiErrorResponseSchema]), 401: unauthorizedResponseSchema, 404: apiErrorResponseSchema },
    }),
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    try {
      const session = await TrainingService.complete(auth.userId, request.params.sessionId);
      reply.send(session);
    } catch (err: any) {
      reply.status(isNotFound(err) ? 404 : 400).send({ error: err.message });
    }
  });

  app.post('/api/training/:sessionId/abandon', {
    schema: trainingSchema('abandonTrainingSession', 'Abandon one training session', {
      description: 'Bodyless action: abandonment uses the persisted session state.',
      params: sessionIdParamsSchema,
      response: { 200: legacyOpaqueResponseSchema, 400: z.union([validationErrorResponseSchema, apiErrorResponseSchema]), 401: unauthorizedResponseSchema, 404: apiErrorResponseSchema },
    }),
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    try {
      const session = await TrainingService.abandon(auth.userId, request.params.sessionId);
      reply.send(session);
    } catch (err: any) {
      reply.status(isNotFound(err) ? 404 : 400).send({ error: err.message });
    }
  });
};

export default trainingModule;
