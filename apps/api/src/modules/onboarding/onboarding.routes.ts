import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { onboardingReadinessResponseSchema } from '@chess-trainer/contracts/onboarding';
import { requireAuth } from '../../auth/request-auth';
import { unauthorizedResponseSchema } from '../../routes/legacy-route.schemas';
import { OnboardingReadinessService } from './onboarding.service';

const onboardingModule: FastifyPluginAsyncZod = async (app) => {
  app.route({
    method: 'GET',
    url: '/api/me/onboarding',
    schema: {
      operationId: 'getMyOnboardingReadiness',
      tags: ['Onboarding'],
      summary: 'Get the authenticated user onboarding disposition and readiness projection',
      response: {
        200: onboardingReadinessResponseSchema,
        401: unauthorizedResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;
      return OnboardingReadinessService.get(auth.userId);
    },
  });
};

export default onboardingModule;
