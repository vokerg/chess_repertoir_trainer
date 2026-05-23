import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { ChapterService } from '../services/chapterService';
import { createChapterSchema, updateChapterSchema } from '../schemas/chapterSchemas';

export default async function chaptersRoutes(app: FastifyInstance, opts: FastifyPluginOptions) {
  // List chapters for a course
  app.get('/api/courses/:courseId/chapters', async (request, reply) => {
    const courseId = Number((request.params as any).courseId);
    const chapters = await ChapterService.list(courseId);
    return chapters;
  });

  // Create chapter under a course
  app.post('/api/courses/:courseId/chapters', async (request, reply) => {
    const courseId = Number((request.params as any).courseId);
    const data = createChapterSchema.parse(request.body);
    const chapter = await ChapterService.create(courseId, data);
    reply.code(201);
    return chapter;
  });

  // Update chapter by ID
  app.patch('/api/chapters/:id', async (request, reply) => {
    const id = Number((request.params as any).id);
    const data = updateChapterSchema.parse(request.body);
    try {
      const chapter = await ChapterService.update(id, data);
      return chapter;
    } catch (err: any) {
      reply.code(404);
      return { message: 'Chapter not found' };
    }
  });

  // Delete chapter
  app.delete('/api/chapters/:id', async (request, reply) => {
    const id = Number((request.params as any).id);
    try {
      await ChapterService.delete(id);
      reply.code(204);
      return;
    } catch (err: any) {
      reply.code(404);
      return { message: 'Chapter not found' };
    }
  });
}