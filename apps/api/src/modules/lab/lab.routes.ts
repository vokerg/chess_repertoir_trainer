import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../auth/request-auth';
import { getMonthlyGames } from './monthly-games/monthly-games.service';
import { openingStrugglesQuerySchema } from './opening-struggles/opening-struggles.schema';
import { getOpeningStruggles } from './opening-struggles/opening-struggles.service';
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

function parseLimit(value: unknown) {
  const limit = Number(value ?? 50);
  if (!Number.isInteger(limit)) return 50;
  return Math.min(Math.max(limit, 1), 200);
}

function parseBoolean(value: unknown) {
  return value === true || value === 'true';
}

export default async function labModule(app: FastifyInstance) {
  app.get('/api/lab/top-opponents', async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const query = request.query as { limit?: string };
    return getTopOpponents(auth.userId, parseLimit(query.limit));
  });

  app.get('/api/lab/monthly-games', async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const query = request.query as { excludeBullet?: string };
    return getMonthlyGames(auth.userId, { excludeBullet: parseBoolean(query.excludeBullet) });
  });

  app.get('/api/lab/opening-struggles', async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const parsed = openingStrugglesQuerySchema.safeParse(request.query ?? {});
    if (!parsed.success) {
      reply.code(400);
      return { error: parsed.error.issues };
    }
    return getOpeningStruggles(auth.userId, parsed.data);
  });

  app.get('/api/lab/training-log', async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const parsed = trainingLogQuerySchema.safeParse(request.query ?? {});
    if (!parsed.success) {
      reply.code(400);
      return { error: parsed.error.issues };
    }
    return getTrainingLog(auth.userId, parsed.data);
  });

  app.post('/api/lab/tactical-detections/run', async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const parsed = tacticalDetectionRunSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      reply.code(400);
      return { error: parsed.error.issues };
    }
    return runTacticalDetection(auth.userId, parsed.data);
  });

  app.get('/api/lab/tactical-detections', async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const parsed = tacticalDetectionListSchema.safeParse(request.query ?? {});
    if (!parsed.success) {
      reply.code(400);
      return { error: parsed.error.issues };
    }
    return getTacticalDetections(auth.userId, parsed.data);
  });
}
