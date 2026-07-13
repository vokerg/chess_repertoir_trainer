import {
  mobileCourseBundleSchema,
  mobileSyncManifestSchema,
  mobileTrainingAttemptBatchRequestSchema,
  mobileTrainingAttemptBatchResponseSchema,
} from '@chess-trainer/contracts/mobile-sync';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { requireAuth } from '../../auth/request-auth';
import { validationErrorResponseSchema } from '../../routes/api-error.schemas';
import { unauthorizedResponseSchema } from '../../routes/legacy-route.schemas';
import { MobileSyncService } from './mobile-sync.service';
import { mobileSyncCourseParamsSchema, mobileSyncErrorSchema } from './mobile-sync.schemas';

const mobileSyncModule: FastifyPluginAsyncZod = async (app) => {
  app.get('/api/mobile-sync/manifest', {
    schema: {
      operationId: 'getMobileSyncManifest',
      tags: ['Mobile sync'],
      summary: 'List downloadable course revisions for the authenticated user',
      response: {
        200: mobileSyncManifestSchema,
        401: unauthorizedResponseSchema,
      },
    },
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    return MobileSyncService.manifest(auth.userId);
  });

  app.get('/api/mobile-sync/courses/:courseId', {
    schema: {
      operationId: 'getMobileCourseBundle',
      tags: ['Mobile sync'],
      summary: 'Download one complete offline training course bundle',
      params: mobileSyncCourseParamsSchema,
      response: {
        200: mobileCourseBundleSchema,
        400: validationErrorResponseSchema,
        401: unauthorizedResponseSchema,
        404: mobileSyncErrorSchema,
      },
    },
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const bundle = await MobileSyncService.courseBundle(auth.userId, request.params.courseId);
    if (!bundle) return reply.status(404).send({ error: 'Course not found' });
    return bundle;
  });

  app.post('/api/mobile-sync/training-attempts', {
    schema: {
      operationId: 'ingestMobileTrainingAttempts',
      tags: ['Mobile sync'],
      summary: 'Ingest an idempotent batch of completed offline training attempts',
      description: 'Each schema-valid attempt is accepted, marked duplicate, or rejected independently with a stable rejection code.',
      body: mobileTrainingAttemptBatchRequestSchema,
      response: {
        200: mobileTrainingAttemptBatchResponseSchema,
        400: validationErrorResponseSchema,
        401: unauthorizedResponseSchema,
      },
    },
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    return MobileSyncService.ingestTrainingAttempts(auth.userId, request.body);
  });
};

export default mobileSyncModule;
