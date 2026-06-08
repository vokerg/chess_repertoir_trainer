import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { CourseReviewService } from './repertoire-coverage.service';

const paramsSchema = z.object({ courseId: z.coerce.number().int().positive() });
const dateSchema = z.string().refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid date');
const querySchema = z.object({
  from: dateSchema,
  to: dateSchema.optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
  offset: z.coerce.number().int().min(0).default(0),
}).refine((value) => !value.to || Date.parse(value.to) >= Date.parse(value.from), {
  message: 'to must be greater than or equal to from',
  path: ['to'],
});

export default async function repertoireCoverageModule(app: FastifyInstance) {
  app.get('/api/courses/:courseId/review', async (request, reply) => {
    const params = paramsSchema.safeParse(request.params);
    const query = querySchema.safeParse(request.query);
    if (!params.success) return reply.status(400).send({ error: params.error.errors });
    if (!query.success) return reply.status(400).send({ error: query.error.errors });

    const review = await CourseReviewService.calculate(params.data.courseId, {
      from: new Date(query.data.from),
      to: query.data.to ? new Date(query.data.to) : undefined,
      limit: query.data.limit,
      offset: query.data.offset,
    });
    if (!review) return reply.status(404).send({ message: 'Course not found' });
    return review;
  });
}
