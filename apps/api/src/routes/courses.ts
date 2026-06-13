import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { CourseService } from '../modules/courses/courses.service';
import { requireAuth } from '../auth/request-auth';
import { createCourseSchema, updateCourseSchema } from '../schemas/courseSchemas';

export default async function coursesRoutes(app: FastifyInstance, opts: FastifyPluginOptions) {
  // List courses
  app.get('/', async (request, reply) => {
    const auth = requireAuth(request, reply); if (!auth) return;
    const courses = await CourseService.list(auth.userId);
    return courses;
  });

  // Create course
  app.post('/', async (request, reply) => {
    const auth = requireAuth(request, reply); if (!auth) return;
    const data = createCourseSchema.parse(request.body);
    const course = await CourseService.create(auth.userId, data);
    reply.code(201);
    return course;
  });

  // Get course by ID
  app.get('/:id', async (request, reply) => {
    const auth = requireAuth(request, reply); if (!auth) return;
    const id = Number((request.params as any).id);
    const course = await CourseService.get(auth.userId, id);
    if (!course) {
      reply.code(404);
      return { message: 'Course not found' };
    }
    return course;
  });

  // Update course
  app.patch('/:id', async (request, reply) => {
    const auth = requireAuth(request, reply); if (!auth) return;
    const id = Number((request.params as any).id);
    const data = updateCourseSchema.parse(request.body);
    try {
      const course = await CourseService.update(auth.userId, id, data);
      if (!course) return reply.code(404).send({ message: 'Course not found' });
      return course;
    } catch (err: any) {
      reply.code(404);
      return { message: 'Course not found' };
    }
  });

  // Delete course
  app.delete('/:id', async (request, reply) => {
    const auth = requireAuth(request, reply); if (!auth) return;
    const id = Number((request.params as any).id);
    try {
      const course = await CourseService.delete(auth.userId, id);
      if (!course) return reply.code(404).send({ message: 'Course not found' });
      reply.code(204);
      return;
    } catch (err: any) {
      reply.code(404);
      return { message: 'Course not found' };
    }
  });
}
