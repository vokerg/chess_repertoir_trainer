import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  activityFeedErrorResponseSchema,
  activityHistoryQuerySchema,
  activityHistoryResponseSchema,
  activityPreferencesResponseSchema,
  todayActivityResponseSchema,
  updateActivityPreferencesSchema,
} from '@chess-trainer/contracts/activity-feed';
import { requireAuth } from '../../auth/request-auth';
import { validationErrorResponseSchema } from '../../routes/api-error.schemas';
import { unauthorizedResponseSchema } from '../../routes/legacy-route.schemas';
import { ActivityFeedError } from './activity-feed.errors';
import { ActivityFeedService } from './activity-feed.service';

const badRequestSchema = z.union([
  validationErrorResponseSchema,
  activityFeedErrorResponseSchema,
]);

const activityFeedModule: FastifyPluginAsyncZod = async (app) => {
  app.route({
    method: 'GET',
    url: '/api/me/activity',
    schema: {
      operationId: 'getMyActivityHistory',
      tags: ['Activity feed'],
      summary: 'Get authenticated user activity for a bounded calendar-date range',
      querystring: activityHistoryQuerySchema,
      response: {
        200: activityHistoryResponseSchema,
        400: badRequestSchema,
        401: unauthorizedResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;
      try {
        return await ActivityFeedService.history(auth.userId, request.query);
      } catch (error) {
        if (error instanceof ActivityFeedError) {
          reply.code(400);
          return { error: error.message, code: error.code };
        }
        throw error;
      }
    },
  });

  app.route({
    method: 'GET',
    url: '/api/me/activity/today',
    schema: {
      operationId: 'getMyActivityToday',
      tags: ['Activity feed'],
      summary: 'Get today activity aggregates and static daily-goal progress',
      response: {
        200: todayActivityResponseSchema,
        401: unauthorizedResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;
      return ActivityFeedService.today(auth.userId);
    },
  });

  app.route({
    method: 'GET',
    url: '/api/me/activity/preferences',
    schema: {
      operationId: 'getMyActivityPreferences',
      tags: ['Activity feed'],
      summary: 'Get the effective activity calendar time zone',
      response: {
        200: activityPreferencesResponseSchema,
        401: unauthorizedResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;
      return ActivityFeedService.preferences(auth.userId);
    },
  });

  app.route({
    method: 'PUT',
    url: '/api/me/activity/preferences',
    schema: {
      operationId: 'updateMyActivityPreferences',
      tags: ['Activity feed'],
      summary: 'Update the effective activity calendar time zone',
      body: updateActivityPreferencesSchema,
      response: {
        200: activityPreferencesResponseSchema,
        400: badRequestSchema,
        401: unauthorizedResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;
      try {
        return await ActivityFeedService.updatePreferences(auth.userId, request.body);
      } catch (error) {
        if (error instanceof ActivityFeedError) {
          reply.code(400);
          return { error: error.message, code: error.code };
        }
        throw error;
      }
    },
  });
};

export default activityFeedModule;
