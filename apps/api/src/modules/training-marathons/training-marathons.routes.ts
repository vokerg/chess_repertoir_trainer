import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { requireAuth } from '../../auth/request-auth';
import {
  buildMarathonNextResponse,
  filterCandidatesByMode,
  MarathonCandidateError,
  pickMarathonSubline,
  resolveMarathonCandidates,
} from './training-marathon-candidates.service';
import { apiErrorResponseSchema, legacyOpaqueResponseSchema, unauthorizedResponseSchema } from '../../routes/legacy-route.schemas';
import { validationErrorResponseSchema } from '../../routes/api-error.schemas';
import { performanceDebug } from '../../utils/performance-debug';
import { TrainingMarathonRunService } from './training-marathon-runs.service';

const marathonScopeSchema = z.object({
  type: z.enum(['CHAPTER', 'COURSE']),
  id: z.coerce.number().int().positive(),
});

const nextLineSchema = z.object({
  scope: marathonScopeSchema.optional(),
  mode: z
    .enum(['ALL', 'WEAK_SUBLINES', 'UNTRAINED_SUBLINES', 'MIXED_WEAK_UNTRAINED'])
    .optional()
    .default('ALL'),
  lineIds: z.array(z.coerce.number().int().positive()).optional().default([]),
  sublineHashes: z.array(z.string().length(64)).optional().default([]),
  recentSublineHashes: z.array(z.string().length(64)).optional().default([]),
  recentLineIds: z.array(z.coerce.number().int().positive()).optional().default([]),
});

const trainingMarathonsModule: FastifyPluginAsyncZod = async (app) => {
  app.post('/api/training-marathons', {
    schema: { operationId: 'createTrainingMarathonRun', tags: ['Training'], summary: 'Prepare a short-lived training marathon run', body: nextLineSchema,
      response: { 201: z.object({ runId: z.string().uuid() }), 400: z.union([validationErrorResponseSchema, apiErrorResponseSchema]), 401: unauthorizedResponseSchema, 404: apiErrorResponseSchema } },
  }, async (request, reply) => {
    const auth = requireAuth(request, reply); if (!auth) return;
    try {
      const run = await TrainingMarathonRunService.create(auth.userId, request.body);
      if (!run) return reply.status(404).send({ error: 'No weak or untrained candidates found.' });
      return reply.status(201).send(run);
    } catch (error) {
      if (error instanceof MarathonCandidateError) return reply.status(error.statusCode as 400 | 404).send({ error: error.message });
      throw error;
    }
  });

  app.post('/api/training-marathons/:runId/next', {
    schema: { operationId: 'getNextTrainingMarathonRunLine', tags: ['Training'], summary: 'Start the next prepared candidate in a marathon run',
      params: z.object({ runId: z.string().uuid() }), response: { 200: legacyOpaqueResponseSchema, 400: validationErrorResponseSchema, 401: unauthorizedResponseSchema, 404: apiErrorResponseSchema } },
  }, async (request, reply) => {
    const auth = requireAuth(request, reply); if (!auth) return;
    const response = await TrainingMarathonRunService.next(auth.userId, request.params.runId);
    if (!response) return reply.status(404).send({ error: 'Training marathon run not found or expired.' });
    return response;
  });

  app.post('/api/training-marathons/next', {
    schema: {
      operationId: 'getNextTrainingMarathonLine',
      tags: ['Training'],
      summary: 'Select the next line for a training marathon',
      body: nextLineSchema,
      response: {
        200: legacyOpaqueResponseSchema,
        400: z.union([validationErrorResponseSchema, apiErrorResponseSchema]),
        401: unauthorizedResponseSchema,
        404: apiErrorResponseSchema,
      },
    },
  }, async (request, reply) => {
    const endpointStartedAt = performance.now();
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const requestBody = request.body;

    try {
      const { scope, scopeLabel, sublines, preparedLines } = await resolveMarathonCandidates(auth.userId, requestBody);
      const pool = await filterCandidatesByMode(auth.userId, sublines, requestBody.mode);
      if (pool.length === 0) {
        return reply.status(404).send({ error: `No weak or untrained candidates found for ${scopeLabel}.` });
      }
      const subline = pickMarathonSubline(pool, requestBody.recentSublineHashes);

      if (!subline) {
        return reply.status(404).send({ error: `No trainable sublines found for ${scopeLabel}.` });
      }

      const preparedLine = preparedLines.get(subline.lineId);
      if (!preparedLine) throw new MarathonCandidateError(404, 'Line not found.');
      const response = await buildMarathonNextResponse(auth.userId, scope, requestBody.mode, subline, preparedLine);
      performanceDebug('training-marathon-next-endpoint', endpointStartedAt, { candidates: sublines.length, filteredCandidates: pool.length });
      return reply.send(response);
    } catch (err: any) {
      if (err instanceof MarathonCandidateError) {
        return reply.status(err.statusCode as 400 | 404).send({ error: err.message });
      }
      return reply.status(400).send({ error: err.message });
    }
  });
};

export default trainingMarathonsModule;
