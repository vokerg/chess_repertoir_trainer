import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import {
  onboardingDispositionCommandResponseSchema,
  onboardingErrorResponseSchema,
  onboardingExpandBodySchema,
  onboardingReadinessResponseSchema,
  onboardingRunCommandResponseSchema,
  onboardingRunParamsSchema,
  onboardingStartBodySchema,
} from '@chess-trainer/contracts/onboarding';
import { requireAuth } from '../../auth/request-auth';
import { validationErrorResponseSchema } from '../../routes/api-error.schemas';
import { unauthorizedResponseSchema } from '../../routes/legacy-route.schemas';
import { OnboardingCommandDispositionBlockedError } from './onboarding-command.repository.prisma';
import {
  OnboardingCommandAccountNotFoundError,
  OnboardingCommandActiveRunError,
  OnboardingCommandImportActiveError,
  OnboardingCommandInvalidStateError,
  OnboardingCommandNotFoundError,
  OnboardingCommandService,
} from './onboarding-command.service';
import { OnboardingReadinessService } from './onboarding.service';

const controlDescriptions = {
  pause: 'The run id selects the persisted preparation whose quiescent pause is requested.',
  resume: 'The run id selects the persisted paused preparation to return to active reconciliation.',
  cancel: 'The run id selects the persisted preparation whose acknowledged cancellation is requested.',
} as const;

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

  app.route({
    method: 'POST',
    url: '/api/me/onboarding/start',
    schema: {
      operationId: 'startMyOnboarding',
      tags: ['Onboarding'],
      summary: 'Accept the default onboarding preparation recipe',
      description: 'Persists the bounded first-run recipe and returns after durable acceptance without waiting for provider, indexing, or analysis work.',
      body: onboardingStartBodySchema,
      response: commandResponses(202),
    },
    handler: async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;
      try {
        const result = await OnboardingCommandService.start(auth.userId, request.body.accountId);
        reply.code(202);
        return result;
      } catch (error) {
        return handleCommandError(error, reply);
      }
    },
  });

  app.route({
    method: 'POST',
    url: '/api/me/onboarding/skip',
    schema: {
      operationId: 'skipMyOnboarding',
      tags: ['Onboarding'],
      summary: 'Skip first-run guidance without cancelling accepted preparation',
      description: 'Uses the authenticated user persisted onboarding disposition and does not require a request body.',
      response: dispositionResponses(),
    },
    handler: async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;
      try {
        return await OnboardingCommandService.skip(auth.userId);
      } catch (error) {
        return handleCommandError(error, reply);
      }
    },
  });

  app.route({
    method: 'POST',
    url: '/api/me/onboarding/runs/:runId/finish',
    schema: {
      operationId: 'finishMyOnboardingWithAttention',
      tags: ['Onboarding'],
      summary: 'Explicitly finish onboarding from a finishable attention outcome',
      description: 'The run id selects the persisted finishable attention outcome; no request body is required.',
      params: onboardingRunParamsSchema,
      response: dispositionResponses(),
    },
    handler: async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;
      try {
        return await OnboardingCommandService.finish(auth.userId, request.params.runId);
      } catch (error) {
        return handleCommandError(error, reply);
      }
    },
  });

  for (const action of ['pause', 'resume', 'cancel'] as const) {
    app.route({
      method: 'POST',
      url: `/api/me/onboarding/runs/:runId/${action}`,
      schema: {
        operationId: `${action}MyOnboardingPreparation`,
        tags: ['Onboarding'],
        summary: `${capitalize(action)} owned onboarding preparation`,
        description: controlDescriptions[action],
        params: onboardingRunParamsSchema,
        response: commandResponses(200),
      },
      handler: async (request, reply) => {
        const auth = requireAuth(request, reply);
        if (!auth) return;
        try {
          switch (action) {
            case 'pause':
              return await OnboardingCommandService.pause(auth.userId, request.params.runId);
            case 'resume':
              return await OnboardingCommandService.resume(auth.userId, request.params.runId);
            case 'cancel':
              return await OnboardingCommandService.cancel(auth.userId, request.params.runId);
          }
        } catch (error) {
          return handleCommandError(error, reply);
        }
      },
    });
  }

  app.route({
    method: 'POST',
    url: '/api/me/onboarding/runs/:runId/retry',
    schema: {
      operationId: 'retryMyOnboardingPreparation',
      tags: ['Onboarding'],
      summary: 'Retry failed preparation evidence in a new retry generation',
      description: 'The run id selects persisted failed preparation evidence eligible for a retry generation; no request body is required.',
      params: onboardingRunParamsSchema,
      response: commandResponses(202),
    },
    handler: async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;
      try {
        const result = await OnboardingCommandService.retry(auth.userId, request.params.runId);
        reply.code(202);
        return result;
      } catch (error) {
        return handleCommandError(error, reply);
      }
    },
  });

  app.route({
    method: 'POST',
    url: '/api/me/onboarding/runs/:runId/restart',
    schema: {
      operationId: 'restartMyOnboardingPreparation',
      tags: ['Onboarding'],
      summary: 'Restart terminal failed or cancelled preparation as a linked recovery run',
      description: 'The run id supplies the persisted immutable preparation scope and recovery lineage; no request body is required.',
      params: onboardingRunParamsSchema,
      response: commandResponses(202),
    },
    handler: async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;
      try {
        const result = await OnboardingCommandService.restart(auth.userId, request.params.runId);
        reply.code(202);
        return result;
      } catch (error) {
        return handleCommandError(error, reply);
      }
    },
  });

  app.route({
    method: 'POST',
    url: '/api/me/onboarding/runs/:runId/expand',
    schema: {
      operationId: 'expandMyOnboardingPreparation',
      tags: ['Onboarding'],
      summary: 'Create an immutable preparation expansion for history, bullet, or another account',
      params: onboardingRunParamsSchema,
      body: onboardingExpandBodySchema,
      response: commandResponses(202),
    },
    handler: async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;
      try {
        const result = await OnboardingCommandService.expand(auth.userId, request.params.runId, request.body);
        reply.code(202);
        return result;
      } catch (error) {
        return handleCommandError(error, reply);
      }
    },
  });
};

function commandResponses(success: 200 | 202) {
  return {
    [success]: onboardingRunCommandResponseSchema,
    400: validationErrorResponseSchema,
    401: unauthorizedResponseSchema,
    404: onboardingErrorResponseSchema,
    409: onboardingErrorResponseSchema,
  };
}

function dispositionResponses() {
  return {
    200: onboardingDispositionCommandResponseSchema,
    400: validationErrorResponseSchema,
    401: unauthorizedResponseSchema,
    404: onboardingErrorResponseSchema,
    409: onboardingErrorResponseSchema,
  };
}

function handleCommandError(error: unknown, reply: { code(statusCode: number): unknown }) {
  if (error instanceof OnboardingCommandNotFoundError) {
    reply.code(404);
    return { error: error.message, code: error.code };
  }
  if (
    error instanceof OnboardingCommandInvalidStateError
    || error instanceof OnboardingCommandActiveRunError
    || error instanceof OnboardingCommandImportActiveError
    || error instanceof OnboardingCommandDispositionBlockedError
  ) {
    reply.code(409);
    return { error: error.message, code: error.code };
  }
  if (error instanceof OnboardingCommandAccountNotFoundError) {
    reply.code(404);
    return { error: error.message, code: error.code };
  }
  throw error;
}

function capitalize(value: string): string {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

export default onboardingModule;