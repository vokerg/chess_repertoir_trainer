import { FastifyInstance } from 'fastify';
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

function sessionIdParam(params: unknown): number {
  return Number((params as { sessionId: string }).sessionId);
}

function statusFor(error: unknown): number {
  if (!(error instanceof Error)) return 400;
  if (error.message.includes('not found')) return 404;
  return 400;
}

export default async function scenarioTrainingModule(app: FastifyInstance) {
  app.post('/api/scenario-training/tactical-missed-shot/start', async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const parsed = tacticalScenarioStartSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      reply.code(400);
      return { error: parsed.error.errors };
    }
    try {
      return await startTacticalMissedShotScenario(auth.userId, parsed.data);
    } catch (error) {
      reply.code(statusFor(error));
      return {
        error: error instanceof Error ? error.message : 'Could not start scenario training',
      };
    }
  });

  app.get('/api/scenario-training/history', async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    return getScenarioTrainingHistory(auth.userId);
  });

  app.get('/api/scenario-training/:sessionId', async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const session = await getScenarioTrainingSession(auth.userId, sessionIdParam(request.params));
    if (!session) {
      reply.code(404);
      return { error: 'Scenario training session not found' };
    }
    return session;
  });

  app.post('/api/scenario-training/:sessionId/attempt', async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const parsed = scenarioTrainingAttemptSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      reply.code(400);
      return { error: parsed.error.errors };
    }
    try {
      return await submitScenarioTrainingAttempt(
        auth.userId,
        sessionIdParam(request.params),
        parsed.data,
      );
    } catch (error) {
      reply.code(statusFor(error));
      return { error: error instanceof Error ? error.message : 'Could not save scenario attempt' };
    }
  });

  app.post('/api/scenario-training/:sessionId/complete', async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    try {
      return await completeScenarioTraining(auth.userId, sessionIdParam(request.params));
    } catch (error) {
      reply.code(statusFor(error));
      return {
        error: error instanceof Error ? error.message : 'Could not complete scenario training',
      };
    }
  });

  app.post('/api/scenario-training/tactical-blunder/start', async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const parsed = tacticalScenarioStartSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      reply.code(400);
      return { error: parsed.error.errors };
    }
    try {
      return await startTacticalBlunderScenario(auth.userId, parsed.data);
    } catch (error) {
      reply.code(statusFor(error));
      return {
        error: error instanceof Error ? error.message : 'Could not start scenario training',
      };
    }
  });

  app.post('/api/scenario-training/:sessionId/dislike', async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const parsed = scenarioTrainingDislikeSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      reply.code(400);
      return { error: parsed.error.errors };
    }
    try {
      return await dislikeScenarioTrainingSource(
        auth.userId,
        sessionIdParam(request.params),
        parsed.data,
      );
    } catch (error) {
      reply.code(statusFor(error));
      return {
        error: error instanceof Error ? error.message : 'Could not dislike scenario source',
      };
    }
  });
}
