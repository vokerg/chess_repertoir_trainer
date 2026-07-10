import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../../auth/request-auth';
import {
  buildMarathonNextResponse,
  filterCandidatesByMode,
  MarathonCandidateError,
  pickMarathonSubline,
  resolveMarathonCandidates,
} from './training-marathon-candidates.service';

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

export default async function trainingMarathonsModule(app: FastifyInstance) {
  app.post('/api/training-marathons/next', async (request: FastifyRequest, reply: FastifyReply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const bodyResult = nextLineSchema.safeParse(request.body);
    if (!bodyResult.success) {
      return reply.status(400).send({ error: bodyResult.error.issues });
    }

    const requestBody = bodyResult.data;

    try {
      const { scope, scopeLabel, sublines } = await resolveMarathonCandidates(auth.userId, requestBody);
      const pool = await filterCandidatesByMode(auth.userId, sublines, requestBody.mode);
      if (pool.length === 0) {
        return reply.status(404).send({ error: `No weak or untrained candidates found for ${scopeLabel}.` });
      }
      const subline = pickMarathonSubline(pool, requestBody.recentSublineHashes);

      if (!subline) {
        return reply.status(404).send({ error: `No trainable sublines found for ${scopeLabel}.` });
      }

      return reply.send(await buildMarathonNextResponse(auth.userId, scope, requestBody.mode, subline));
    } catch (err: any) {
      if (err instanceof MarathonCandidateError) {
        return reply.status(err.statusCode).send({ error: err.message });
      }
      return reply.status(400).send({ error: err.message });
    }
  });
}
