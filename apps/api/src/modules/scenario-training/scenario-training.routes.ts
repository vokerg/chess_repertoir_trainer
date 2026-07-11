import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { requireAuth } from '../../auth/request-auth';
import {
  completeScenarioTraining,
  dislikeScenarioTrainingSource,
  getScenarioTrainingHistory,
  getScenarioTrainingSession,
  startTacticalBlunderScenario,
  startTacticalMissedShotScenario,
  submitScenarioTrainingAttempt,
} from './scenario-training.service';
import {
  scenarioTrainingDislikeSchema,
  scenarioTrainingAttemptSchema,
  tacticalScenarioStartSchema,
} from './scenario-training.schema';
import { apiErrorResponseSchema, legacyOpaqueResponseSchema, unauthorizedResponseSchema } from '../../routes/legacy-route.schemas';
import { validationErrorResponseSchema } from '../../routes/api-error.schemas';

const sessionIdParamsSchema = z.object({ sessionId: z.coerce.number().int().positive() });
const scenarioSchema = <T extends Record<string, unknown>>(operationId: string, summary: string, extra: T) => ({ operationId, tags: ['Scenario training'], summary, ...extra });

function statusFor(error: unknown): 400 | 404 {
  if (!(error instanceof Error)) return 400;
  if (error.message.includes('not found')) return 404;
  return 400;
}

const scenarioTrainingModule: FastifyPluginAsyncZod = async (app) => {
  app.post('/api/scenario-training/tactical-missed-shot/start', {
    schema: scenarioSchema('startMissedShotScenarioTraining', 'Start missed-shot scenario training', {
      body: tacticalScenarioStartSchema,
      response: { 200: legacyOpaqueResponseSchema, 400: z.union([validationErrorResponseSchema, apiErrorResponseSchema]), 401: unauthorizedResponseSchema, 404: apiErrorResponseSchema },
    }),
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    try {
      return await startTacticalMissedShotScenario(auth.userId, request.body);
    } catch (error) {
      reply.code(statusFor(error));
      return {
        error: error instanceof Error ? error.message : 'Could not start scenario training',
      };
    }
  });

  app.get('/api/scenario-training/history', {
    schema: scenarioSchema('listScenarioTrainingHistory', 'List scenario-training history', {
      response: { 200: legacyOpaqueResponseSchema, 401: unauthorizedResponseSchema },
    }),
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    return getScenarioTrainingHistory(auth.userId);
  });

  app.get('/api/scenario-training/:sessionId', {
    schema: scenarioSchema('getScenarioTrainingSession', 'Get one scenario-training session', {
      params: sessionIdParamsSchema,
      response: { 200: legacyOpaqueResponseSchema, 400: validationErrorResponseSchema, 401: unauthorizedResponseSchema, 404: apiErrorResponseSchema },
    }),
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const session = await getScenarioTrainingSession(auth.userId, request.params.sessionId);
    if (!session) {
      reply.code(404);
      return { error: 'Scenario training session not found' };
    }
    return session;
  });

  app.post('/api/scenario-training/:sessionId/attempt', {
    schema: scenarioSchema('submitScenarioTrainingAttempt', 'Submit an attempt for a scenario-training session', {
      params: sessionIdParamsSchema,
      body: scenarioTrainingAttemptSchema,
      response: { 200: legacyOpaqueResponseSchema, 400: z.union([validationErrorResponseSchema, apiErrorResponseSchema]), 401: unauthorizedResponseSchema, 404: apiErrorResponseSchema },
    }),
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    try {
      return await submitScenarioTrainingAttempt(
        auth.userId,
        request.params.sessionId,
        request.body,
      );
    } catch (error) {
      reply.code(statusFor(error));
      return { error: error instanceof Error ? error.message : 'Could not save scenario attempt' };
    }
  });

  app.post('/api/scenario-training/:sessionId/complete', {
    schema: scenarioSchema('completeScenarioTrainingSession', 'Complete a scenario-training session', {
      description: 'Bodyless action: completion uses the persisted session attempt state.',
      params: sessionIdParamsSchema,
      response: { 200: legacyOpaqueResponseSchema, 400: z.union([validationErrorResponseSchema, apiErrorResponseSchema]), 401: unauthorizedResponseSchema, 404: apiErrorResponseSchema },
    }),
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    try {
      return await completeScenarioTraining(auth.userId, request.params.sessionId);
    } catch (error) {
      reply.code(statusFor(error));
      return {
        error: error instanceof Error ? error.message : 'Could not complete scenario training',
      };
    }
  });

  app.post('/api/scenario-training/tactical-blunder/start', {
    schema: scenarioSchema('startBlunderScenarioTraining', 'Start tactical-blunder scenario training', {
      body: tacticalScenarioStartSchema,
      response: { 200: legacyOpaqueResponseSchema, 400: z.union([validationErrorResponseSchema, apiErrorResponseSchema]), 401: unauthorizedResponseSchema, 404: apiErrorResponseSchema },
    }),
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    try {
      return await startTacticalBlunderScenario(auth.userId, request.body);
    } catch (error) {
      reply.code(statusFor(error));
      return {
        error: error instanceof Error ? error.message : 'Could not start scenario training',
      };
    }
  });

  app.post('/api/scenario-training/:sessionId/dislike', {
    schema: scenarioSchema('dislikeScenarioTrainingSource', 'Hide a scenario source from future training', {
      params: sessionIdParamsSchema,
      body: scenarioTrainingDislikeSchema,
      response: { 200: legacyOpaqueResponseSchema, 400: z.union([validationErrorResponseSchema, apiErrorResponseSchema]), 401: unauthorizedResponseSchema, 404: apiErrorResponseSchema },
    }),
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    try {
      return await dislikeScenarioTrainingSource(
        auth.userId,
        request.params.sessionId,
        request.body,
      );
    } catch (error) {
      reply.code(statusFor(error));
      return {
        error: error instanceof Error ? error.message : 'Could not dislike scenario source',
      };
    }
  });
};

export default scenarioTrainingModule;
