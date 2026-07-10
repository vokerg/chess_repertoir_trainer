import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../../auth/request-auth';
import { courseReviewQuerySchema } from './course-review.schema';
import { CourseReviewService } from './repertoire-coverage.service';

const paramsSchema = z.object({ courseId: z.coerce.number().int().positive() });

export default async function repertoireCoverageModule(app: FastifyInstance) {
  app.get('/api/courses/:courseId/review', async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const params = paramsSchema.safeParse(request.params);
    const query = courseReviewQuerySchema.safeParse(request.query);
    if (!params.success) return reply.status(400).send({ error: params.error.issues });
    if (!query.success) return reply.status(400).send({ error: query.error.issues });

    const review = await CourseReviewService.calculate(auth.userId, params.data.courseId, query.data);
    if (!review) return reply.status(404).send({ message: 'Course not found' });
    return review;
  });
}
