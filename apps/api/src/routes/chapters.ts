import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { ChapterService } from '../modules/courses/courses.service';
import { requireAuth } from '../auth/request-auth';
import { createChapterSchema, updateChapterSchema } from '../schemas/chapterSchemas';

export default async function chaptersRoutes(app: FastifyInstance, opts: FastifyPluginOptions) {
  // List chapters for a course
  app.get('/api/courses/:courseId/chapters', async (request, reply) => {
    const auth = requireAuth(request, reply); if (!auth) return;
    const courseId = Number((request.params as any).courseId);
    const chapters = await ChapterService.list(auth.userId, courseId);
    if (!chapters) return reply.code(404).send({ message: 'Course not found' });
    return chapters;
  });

  // Create chapter under a course
  app.post('/api/courses/:courseId/chapters', async (request, reply) => {
    const auth = requireAuth(request, reply); if (!auth) return;
    const courseId = Number((request.params as any).courseId);
    const data = createChapterSchema.parse(request.body);
    const chapter = await ChapterService.create(auth.userId, courseId, data);
    if (!chapter) return reply.code(404).send({ message: 'Course not found' });
    reply.code(201);
    return chapter;
  });

  // Update chapter by ID
  app.get('/api/chapters/:id', async (request, reply) => {
    const auth = requireAuth(request, reply); if (!auth) return;
    const id = Number((request.params as any).id);
    const chapter = await ChapterService.get(auth.userId, id);
    if (!chapter) {
      reply.code(404);
      return { message: 'Chapter not found' };
    }
    return chapter;
  });

  // Update chapter by ID
  app.patch('/api/chapters/:id', async (request, reply) => {
    const auth = requireAuth(request, reply); if (!auth) return;
    const id = Number((request.params as any).id);
    const data = updateChapterSchema.parse(request.body);
    try {
      const chapter = await ChapterService.update(auth.userId, id, data);
      if (!chapter) return reply.code(404).send({ message: 'Chapter not found' });
      return chapter;
    } catch (err: any) {
      reply.code(404);
      return { message: 'Chapter not found' };
    }
  });

  // Delete chapter
  app.delete('/api/chapters/:id', async (request, reply) => {
    const auth = requireAuth(request, reply); if (!auth) return;
    const id = Number((request.params as any).id);
    try {
      const chapter = await ChapterService.delete(auth.userId, id);
      if (!chapter) return reply.code(404).send({ message: 'Chapter not found' });
      reply.code(204);
      return;
    } catch (err: any) {
      reply.code(404);
      return { message: 'Chapter not found' };
    }
  });
}
