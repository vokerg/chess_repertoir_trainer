import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import {
  createImportedGameJobRunBodySchema,
  createImportedGameJobRunResponseSchema,
  jobRunDetailResponseSchema,
  jobRunErrorResponseSchema,
  jobRunListQuerySchema,
  jobRunListResponseSchema,
  jobRunParamsSchema,
  jobTaskListQuerySchema,
  jobTaskListResponseSchema,
} from '@chess-trainer/contracts/jobs';
import { requireAuth } from '../../auth/request-auth';
import { validationErrorResponseSchema } from '../../routes/api-error.schemas';
import {
  noContentResponseSchema,
  unauthorizedResponseSchema,
} from '../../routes/legacy-route.schemas';
import {
  JobRunNotDismissibleError,
  JobRunNotFoundError,
  JobRunNotRetryableError,
  JobRunService,
  NoImportedGamesFoundError,
} from './job-run.service';

const jobRunModule: FastifyPluginAsyncZod = async (app) => {
  app.route({
    method: 'POST',
    url: '/api/imported-games/job-runs',
    schema: {
      operationId: 'createImportedGameJobRun',
      tags: ['Jobs'],
      summary: 'Create a persistent imported-game job',
      description: 'Creates one durable job run with newest-first queued tasks for the owned imported games supplied by the current user.',
      body: createImportedGameJobRunBodySchema,
      response: {
        202: createImportedGameJobRunResponseSchema,
        400: validationErrorResponseSchema,
        401: unauthorizedResponseSchema,
        404: jobRunErrorResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;

      try {
        const result = await JobRunService.createUserAction({
          userId: auth.userId,
          kind: request.body.kind,
          importedGameIds: request.body.gameIds,
          force: request.body.force,
        });
        reply.code(202);
        return result;
      } catch (error) {
        if (error instanceof NoImportedGamesFoundError) {
          reply.code(404);
          return { error: error.message, code: error.code };
        }
        throw error;
      }
    },
  });

  app.route({
    method: 'DELETE',
    url: '/api/job-runs/:jobRunId',
    schema: {
      operationId: 'dismissJobRun',
      tags: ['Jobs'],
      summary: 'Permanently dismiss one current-user terminal job run',
      description: 'Marks a terminal job run as dismissed so it no longer appears in current-user job reads. Active jobs must be cancelled and allowed to settle first.',
      params: jobRunParamsSchema,
      response: {
        204: noContentResponseSchema,
        400: validationErrorResponseSchema,
        401: unauthorizedResponseSchema,
        404: jobRunErrorResponseSchema,
        409: jobRunErrorResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;

      try {
        await JobRunService.dismissForUser(auth.userId, request.params.jobRunId);
        reply.code(204);
        return;
      } catch (error) {
        if (error instanceof JobRunNotFoundError) {
          reply.code(404);
          return { error: error.message, code: error.code };
        }
        if (error instanceof JobRunNotDismissibleError) {
          reply.code(409);
          return { error: error.message, code: error.code };
        }
        throw error;
      }
    },
  });

  app.route({
    method: 'GET',
    url: '/api/job-runs',
    schema: {
      operationId: 'listJobRuns',
      tags: ['Jobs'],
      summary: 'List current-user job runs',
      querystring: jobRunListQuerySchema,
      response: {
        200: jobRunListResponseSchema,
        400: validationErrorResponseSchema,
        401: unauthorizedResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;

      return JobRunService.listForUser(
        auth.userId,
        request.query.active,
        request.query.limit,
      );
    },
  });

  app.route({
    method: 'GET',
    url: '/api/job-runs/:jobRunId',
    schema: {
      operationId: 'getJobRun',
      tags: ['Jobs'],
      summary: 'Get one current-user job run',
      params: jobRunParamsSchema,
      response: {
        200: jobRunDetailResponseSchema,
        400: validationErrorResponseSchema,
        401: unauthorizedResponseSchema,
        404: jobRunErrorResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;

      try {
        return {
          jobRun: await JobRunService.getForUser(auth.userId, request.params.jobRunId),
        };
      } catch (error) {
        if (error instanceof JobRunNotFoundError) {
          reply.code(404);
          return { error: error.message, code: error.code };
        }
        throw error;
      }
    },
  });

  app.route({
    method: 'POST',
    url: '/api/job-runs/:jobRunId/cancel',
    schema: {
      operationId: 'cancelJobRun',
      tags: ['Jobs'],
      summary: 'Cancel one current-user job run',
      description: 'Bodyless action: cancels every queued or running task. Running workers lose their fenced claim and abort cooperatively on the next heartbeat.',
      params: jobRunParamsSchema,
      response: {
        200: jobRunDetailResponseSchema,
        400: validationErrorResponseSchema,
        401: unauthorizedResponseSchema,
        404: jobRunErrorResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;

      try {
        return {
          jobRun: await JobRunService.cancelForUser(auth.userId, request.params.jobRunId),
        };
      } catch (error) {
        if (error instanceof JobRunNotFoundError) {
          reply.code(404);
          return { error: error.message, code: error.code };
        }
        throw error;
      }
    },
  });

  app.route({
    method: 'POST',
    url: '/api/job-runs/:jobRunId/retry',
    schema: {
      operationId: 'retryJobRun',
      tags: ['Jobs'],
      summary: 'Retry failed or cancelled tasks as a new job',
      description: 'Bodyless action: creates a new user-action job containing only the owned games from failed or cancelled tasks in the terminal source job.',
      params: jobRunParamsSchema,
      response: {
        202: createImportedGameJobRunResponseSchema,
        400: validationErrorResponseSchema,
        401: unauthorizedResponseSchema,
        404: jobRunErrorResponseSchema,
        409: jobRunErrorResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;

      try {
        const result = await JobRunService.retryForUser(auth.userId, request.params.jobRunId);
        reply.code(202);
        return result;
      } catch (error) {
        if (error instanceof JobRunNotFoundError) {
          reply.code(404);
          return { error: error.message, code: error.code };
        }
        if (error instanceof JobRunNotRetryableError) {
          reply.code(409);
          return { error: error.message, code: error.code };
        }
        throw error;
      }
    },
  });

  app.route({
    method: 'GET',
    url: '/api/job-runs/:jobRunId/tasks',
    schema: {
      operationId: 'listJobRunTasks',
      tags: ['Jobs'],
      summary: 'List ordered tasks for one current-user job run',
      params: jobRunParamsSchema,
      querystring: jobTaskListQuerySchema,
      response: {
        200: jobTaskListResponseSchema,
        400: validationErrorResponseSchema,
        401: unauthorizedResponseSchema,
        404: jobRunErrorResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;

      try {
        return await JobRunService.listTasksForUser(
          auth.userId,
          request.params.jobRunId,
          request.query.offset,
          request.query.limit,
        );
      } catch (error) {
        if (error instanceof JobRunNotFoundError) {
          reply.code(404);
          return { error: error.message, code: error.code };
        }
        throw error;
      }
    },
  });
};

export default jobRunModule;
