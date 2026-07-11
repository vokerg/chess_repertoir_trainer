import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { StatsService } from '../../services/statsService';
import { requireAuth } from '../../auth/request-auth';
import { apiErrorResponseSchema, legacyOpaqueResponseSchema, unauthorizedResponseSchema } from '../../routes/legacy-route.schemas';
import { validationErrorResponseSchema } from '../../routes/api-error.schemas';

const lineIdParamsSchema = z.object({ lineId: z.coerce.number().int().positive() });
const courseIdParamsSchema = z.object({ courseId: z.coerce.number().int().positive() });
const chapterIdParamsSchema = z.object({ chapterId: z.coerce.number().int().positive() });
const statsSchema = <T extends Record<string, unknown>>(operationId: string, summary: string, extra: T) => ({ operationId, tags: ['Statistics'], summary, ...extra });

const statsModule: FastifyPluginAsyncZod = async (app) => {
  app.get('/api/stats/summary', {
    schema: statsSchema('getTrainingStatsSummary', 'Get aggregate training statistics', {
      response: { 200: legacyOpaqueResponseSchema, 401: unauthorizedResponseSchema },
    }),
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const summary = await StatsService.summary(auth.userId);
    reply.send(summary);
  });

  app.get('/api/lines/:lineId/stats', {
    schema: statsSchema('getLineStats', 'Get statistics for one repertoire line', {
      params: lineIdParamsSchema,
      response: { 200: legacyOpaqueResponseSchema, 400: validationErrorResponseSchema, 401: unauthorizedResponseSchema, 404: apiErrorResponseSchema },
    }),
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const stats = await StatsService.lineStats(auth.userId, request.params.lineId);
    if (!stats) {
      reply.status(404).send({ error: 'Line not found' });
    } else {
      reply.send(stats);
    }
  });

  app.get('/api/lines/:lineId/sublines/status', {
    schema: statsSchema('getLineSublineStatuses', 'Get training status for line sublines', {
      params: lineIdParamsSchema,
      response: { 200: legacyOpaqueResponseSchema, 400: validationErrorResponseSchema, 401: unauthorizedResponseSchema, 404: apiErrorResponseSchema },
    }),
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const statuses = await StatsService.lineSublineStatus(auth.userId, request.params.lineId);
    if (!statuses) {
      reply.status(404).send({ error: 'Line not found' });
    } else {
      reply.send(statuses);
    }
  });

  app.get('/api/courses/:courseId/stats', {
    schema: statsSchema('getCourseStats', 'Get statistics for one course', {
      params: courseIdParamsSchema,
      response: { 200: legacyOpaqueResponseSchema, 400: validationErrorResponseSchema, 401: unauthorizedResponseSchema, 404: apiErrorResponseSchema },
    }),
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const stats = await StatsService.courseStats(auth.userId, request.params.courseId);
    if (!stats) return reply.status(404).send({ error: 'Course not found' });
    reply.send(stats);
  });

  app.get('/api/chapters/:chapterId/stats', {
    schema: statsSchema('getChapterStats', 'Get statistics for one chapter', {
      params: chapterIdParamsSchema,
      response: { 200: legacyOpaqueResponseSchema, 400: validationErrorResponseSchema, 401: unauthorizedResponseSchema, 404: apiErrorResponseSchema },
    }),
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const stats = await StatsService.chapterStats(auth.userId, request.params.chapterId);
    if (!stats) return reply.status(404).send({ error: 'Chapter not found' });
    reply.send(stats);
  });
};

export default statsModule;
