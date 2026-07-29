import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  builderCourseReintegrationApplyRequestSchema,
  builderCourseReintegrationApplyResponseSchema,
  builderCourseReintegrationPreviewRequestSchema,
  builderCourseReintegrationPreviewResponseSchema,
} from '@chess-trainer/contracts/courses';
import { requireAuth } from '../../auth/request-auth';
import { apiErrorResponseSchema, validationErrorResponseSchema } from '../../routes/api-error.schemas';
import { unauthorizedResponseSchema } from '../../routes/legacy-route.schemas';
import { AnalysisReintegrationError } from './analysis-reintegration.service';
import { BuilderCourseReintegrationService } from './builder-course-reintegration.service';

const chapterIdParamsSchema = z.object({
  chapterId: z.coerce.number().int().positive(),
});

const builderCourseReintegrationRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post('/api/chapters/:chapterId/builder-course-reintegration/preview', {
    schema: {
      operationId: 'previewBuilderCourseReintegration',
      tags: ['Courses'],
      summary: 'Preview a completed builder draft against one owned chapter',
      params: chapterIdParamsSchema,
      body: builderCourseReintegrationPreviewRequestSchema,
      response: {
        200: builderCourseReintegrationPreviewResponseSchema,
        400: z.union([validationErrorResponseSchema, apiErrorResponseSchema]),
        401: unauthorizedResponseSchema,
        403: apiErrorResponseSchema,
        404: apiErrorResponseSchema,
        409: apiErrorResponseSchema,
      },
    },
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    try {
      return await BuilderCourseReintegrationService.previewChapter(
        auth.userId,
        request.params.chapterId,
        request.body,
      );
    } catch (error) {
      const status = error instanceof AnalysisReintegrationError ? error.status : 400;
      return reply.status(status as 400 | 403 | 404 | 409).send({
        error: error instanceof Error ? error.message : 'Could not preview builder course output.',
      });
    }
  });

  app.post('/api/chapters/:chapterId/builder-course-reintegration/apply', {
    schema: {
      operationId: 'applyBuilderCourseReintegration',
      tags: ['Courses'],
      summary: 'Apply an unchanged reviewed builder draft to one owned chapter',
      params: chapterIdParamsSchema,
      body: builderCourseReintegrationApplyRequestSchema,
      response: {
        200: builderCourseReintegrationApplyResponseSchema,
        400: z.union([validationErrorResponseSchema, apiErrorResponseSchema]),
        401: unauthorizedResponseSchema,
        403: apiErrorResponseSchema,
        404: apiErrorResponseSchema,
        409: apiErrorResponseSchema,
      },
    },
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    try {
      return await BuilderCourseReintegrationService.applyToChapter(
        auth.userId,
        request.params.chapterId,
        request.body,
      );
    } catch (error) {
      const status = error instanceof AnalysisReintegrationError ? error.status : 400;
      return reply.status(status as 400 | 403 | 404 | 409).send({
        error: error instanceof Error ? error.message : 'Could not apply builder course output.',
      });
    }
  });
};

export default builderCourseReintegrationRoutes;
