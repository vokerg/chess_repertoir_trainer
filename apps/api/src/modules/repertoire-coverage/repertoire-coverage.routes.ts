import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { requireAuth } from '../../auth/request-auth';
import { courseReviewQuerySchema } from './course-review.schema';
import { CourseReviewService } from './repertoire-coverage.service';
import { legacyOpaqueResponseSchema, messageResponseSchema, unauthorizedResponseSchema } from '../../routes/legacy-route.schemas';
import { validationErrorResponseSchema } from '../../routes/api-error.schemas';

const paramsSchema = z.object({ courseId: z.coerce.number().int().positive() });

const repertoireCoverageModule: FastifyPluginAsyncZod = async (app) => {
  app.get('/api/courses/:courseId/review', {
    schema: {
      operationId: 'getCourseRepertoireReview',
      tags: ['Courses'],
      summary: 'Compare a course repertoire with imported games',
      params: paramsSchema,
      querystring: courseReviewQuerySchema,
      response: { 200: legacyOpaqueResponseSchema, 400: validationErrorResponseSchema, 401: unauthorizedResponseSchema, 404: messageResponseSchema },
    },
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const review = await CourseReviewService.calculate(auth.userId, request.params.courseId, request.query);
    if (!review) return reply.status(404).send({ message: 'Course not found' });
    return review;
  });
};

export default repertoireCoverageModule;
