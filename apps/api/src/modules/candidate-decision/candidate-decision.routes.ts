import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import {
  candidateDecisionErrorResponseSchema,
  candidateDecisionRequestSchema,
  candidateDecisionResponseSchema,
} from '@chess-trainer/contracts/candidate-decision';
import { requireAuth } from '../../auth/request-auth';
import { validationErrorResponseSchema } from '../../routes/api-error.schemas';
import { unauthorizedResponseSchema } from '../../routes/legacy-route.schemas';
import {
  CandidateDecisionRoleMismatchError,
  CandidateDecisionService,
  IllegalIncludedCandidateMoveError,
  InvalidCandidateDecisionFenError,
} from './candidate-decision.service';

const candidateDecisionModule: FastifyPluginAsyncZod = async (app) => {
  app.route({
    method: 'POST',
    url: '/api/candidate-decisions',
    schema: {
      operationId: 'createCandidateDecision',
      tags: ['Candidate decisions'],
      summary: 'Aggregate and rank repertoire candidate evidence',
      description: 'Returns a bounded deterministic candidate decision for one legal position and versioned repertoire target. Engine, Masters, selected-population, personal, opening classification and reviewed side-aware opening knowledge, player-profile, and owned-course evidence remain separated with explicit availability, reasons, warnings, target fit, profile fit, and opponent-coverage contribution. Opening knowledge is explanatory only and does not affect ranking or Builder state.',
      body: candidateDecisionRequestSchema,
      response: {
        200: candidateDecisionResponseSchema,
        400: candidateDecisionErrorResponseSchema.or(validationErrorResponseSchema),
        401: unauthorizedResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;

      try {
        return await CandidateDecisionService.get(auth.userId, request.body);
      } catch (error) {
        if (error instanceof InvalidCandidateDecisionFenError
          || error instanceof CandidateDecisionRoleMismatchError
          || error instanceof IllegalIncludedCandidateMoveError) {
          reply.code(400);
          return { error: error.message, code: error.code };
        }
        throw error;
      }
    },
  });
};

export default candidateDecisionModule;
