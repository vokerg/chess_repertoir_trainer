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
import { unauthorizedResponseSchema } from '../../routes/legacy-route.schemas';
import {
  JobRunNotFoundError,
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
