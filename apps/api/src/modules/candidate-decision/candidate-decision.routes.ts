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
      description: 'Returns a bounded deterministic candidate decision for one legal position and versioned repertoire target. USER_MOVE preset-persona ranking uses selected-population frequency and score relative to the exact-position baseline, Masters support, and depth-qualified stored engine safety evidence. Personal history, static target/profile classification, reviewed opening knowledge, and existing-course context remain inspectable but do not contribute preset-persona ranking components or primary rank reasons; static target-fit conflicts do not eligibility-sort preset personas. Course conflicts remain independent eligibility warnings. Opponent-response ranking and CUSTOM legacy ranking remain separate policy surfaces.',
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
