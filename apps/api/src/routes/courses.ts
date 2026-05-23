import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { CourseService } from '../services/courseService';
import { createCourseSchema, updateCourseSchema } from '../schemas/courseSchemas';

export default async function coursesRoutes(app: FastifyInstance, opts: FastifyPluginOptions) {
  // List courses
  app.get('/', async (request, reply) => {
    const courses = await CourseService.list();
    return courses;
  });

  // Create course
  app.post('/', async (request, reply) => {
    const data = createCourseSchema.parse(request.body);
    const course = await CourseService.create(data);
    reply.code(201);
    return course;
  });

  // Get course by ID
  app.get('/:id', async (request, reply) => {
    const id = Number((request.params as any).id);
    const course = await CourseService.get(id);
    if (!course) {
      reply.code(404);
      return { message: 'Course not found' };
    }
    return course;
  });

  // Update course
  app.patch('/:id', async (request, reply) => {
    const id = Number((request.params as any).id);
    const data = updateCourseSchema.parse(request.body);
    try {
      const course = await CourseService.update(id, data);
      return course;
    } catch (err: any) {
      reply.code(404);
      return { message: 'Course not found' };
    }
  });

  // Delete course
  app.delete('/:id', async (request, reply) => {
    const id = Number((request.params as any).id);
    try {
      await CourseService.delete(id);
      reply.code(204);
      return;
    } catch (err: any) {
      reply.code(404);
      return { message: 'Course not found' };
    }
  });
}