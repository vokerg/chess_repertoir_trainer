import { FastifyInstance } from 'fastify';
import { ChapterService, CourseService, LineService, MoveNodeService } from './courses.service';
import {
  createChapterSchema,
  createCourseSchema,
  createLineSchema,
  copyLineSchema,
  createNodeSchema,
  updateChapterSchema,
  updateCourseSchema,
  updateLineSchema,
  updateNodeSchema,
} from './courses.schemas';
import { z } from 'zod';
import { PgnService } from '../../services/pgnService';
import { applyAnalysisReintegrationSchema, previewAnalysisReintegrationSchema } from './analysis-reintegration.schemas';
import { AnalysisReintegrationError, AnalysisReintegrationService } from './analysis-reintegration.service';
import { getAvailableSublineRows } from './sublines.service';
import { registerOpenApiRoute } from '../../openapi/route-registry';

const importPgnSchema = z.object({
  name: z.string().min(1),
  sideToTrain: z.enum(['WHITE', 'BLACK']),
  startingFen: z.string().optional(),
  pgn: z.string().min(1),
});

export default async function coursesModule(app: FastifyInstance) {
  app.get('/api/courses', async () => CourseService.list());

  app.post('/api/courses', async (request, reply) => {
    const data = createCourseSchema.parse(request.body);
    const course = await CourseService.create(data);
    reply.code(201);
    return course;
  });

  app.get('/api/courses/:id', async (request, reply) => {
    const id = Number((request.params as any).id);
    const course = await CourseService.get(id);
    if (!course) {
      reply.code(404);
      return { message: 'Course not found' };
    }
    return course;
  });

  app.patch('/api/courses/:id', async (request, reply) => {
    const id = Number((request.params as any).id);
    const data = updateCourseSchema.parse(request.body);
    try {
      return await CourseService.update(id, data);
    } catch {
      reply.code(404);
      return { message: 'Course not found' };
    }
  });

  app.delete('/api/courses/:id', async (request, reply) => {
    const id = Number((request.params as any).id);
    try {
      await CourseService.delete(id);
      reply.code(204);
      return;
    } catch {
      reply.code(404);
      return { message: 'Course not found' };
    }
  });

  app.get('/api/courses/:courseId/chapters', async (request) => {
    const courseId = Number((request.params as any).courseId);
    return ChapterService.list(courseId);
  });

  app.post('/api/courses/:courseId/chapters', async (request, reply) => {
    const courseId = Number((request.params as any).courseId);
    const data = createChapterSchema.parse(request.body);
    const chapter = await ChapterService.create(courseId, data);
    reply.code(201);
    return chapter;
  });

  app.get('/api/chapters/:id', async (request, reply) => {
    const id = Number((request.params as any).id);
    const chapter = await ChapterService.get(id);
    if (!chapter) {
      reply.code(404);
      return { message: 'Chapter not found' };
    }
    return chapter;
  });

  app.patch('/api/chapters/:id', async (request, reply) => {
    const id = Number((request.params as any).id);
    const data = updateChapterSchema.parse(request.body);
    try {
      return await ChapterService.update(id, data);
    } catch {
      reply.code(404);
      return { message: 'Chapter not found' };
    }
  });

  app.delete('/api/chapters/:id', async (request, reply) => {
    const id = Number((request.params as any).id);
    try {
      await ChapterService.delete(id);
      reply.code(204);
      return;
    } catch {
      reply.code(404);
      return { message: 'Chapter not found' };
    }
  });

  app.get('/api/chapters/:chapterId/lines', async (request) => {
    const chapterId = Number((request.params as any).chapterId);
    return LineService.list(chapterId);
  });

  registerOpenApiRoute(app, {
    method: 'get',
    url: '/api/courses/:courseId/sublines',
    operation: {
      tags: ['Courses'],
      summary: 'List all terminal move-tree variations in a course',
      parameters: [{ name: 'courseId', in: 'path', required: true,
        schema: { type: 'integer', minimum: 1 } }],
      responses: {
        '200': {
          description: 'One row per available terminal variation',
          content: { 'application/json': { schema: { type: 'array', items: {
            type: 'object',
            required: ['lineId', 'lineName', 'chapterId', 'chapterName', 'leafNodeId', 'moves', 'moveText'],
            properties: {
              lineId: { type: 'integer' }, lineName: { type: 'string' },
              chapterId: { type: 'integer' }, chapterName: { type: 'string' },
              leafNodeId: { type: 'integer' }, moveText: { type: 'string' },
              moves: { type: 'array', items: { type: 'object',
                required: ['nodeId', 'moveUci', 'moveSan', 'plyNumber', 'sortOrder'],
                properties: { nodeId: { type: 'integer' }, moveUci: { type: 'string' },
                  moveSan: { type: 'string' }, plyNumber: { type: 'integer' },
                  sortOrder: { type: 'integer' } } } },
            },
          } } } },
        },
        '400': { description: 'Invalid course id' },
        '404': { description: 'Course not found' },
      },
    },
    handler: async (request, reply) => {
      const courseId = Number((request.params as any).courseId);
      if (!Number.isInteger(courseId) || courseId <= 0) {
        return reply.status(400).send({ error: 'Invalid course id' });
      }
      const sublines = await getAvailableSublineRows({ type: 'COURSE', id: courseId });
      if (sublines === null) return reply.status(404).send({ error: 'Course not found' });
      return reply.send(sublines);
    },
  });

  app.post('/api/chapters/:chapterId/analysis-reintegration/preview', async (request, reply) => {
    const chapterId = Number((request.params as any).chapterId);
    if (!Number.isInteger(chapterId) || chapterId <= 0) return reply.status(400).send({ error: 'Invalid chapter id' });
    const parsed = previewAnalysisReintegrationSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.errors });
    try {
      return await AnalysisReintegrationService.previewChapter(chapterId, parsed.data);
    } catch (error) {
      const status = error instanceof AnalysisReintegrationError ? error.status : 400;
      return reply.status(status).send({ error: error instanceof Error ? error.message : 'Could not preview analysis reintegration.' });
    }
  });

  app.post('/api/chapters/:chapterId/analysis-reintegration/apply', async (request, reply) => {
    const chapterId = Number((request.params as any).chapterId);
    if (!Number.isInteger(chapterId) || chapterId <= 0) return reply.status(400).send({ error: 'Invalid chapter id' });
    const parsed = applyAnalysisReintegrationSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.errors });
    try {
      return await AnalysisReintegrationService.applyToChapter(chapterId, parsed.data);
    } catch (error) {
      const status = error instanceof AnalysisReintegrationError ? error.status : 400;
      return reply.status(status).send({ error: error instanceof Error ? error.message : 'Could not apply analysis reintegration.',
        conflicts: error instanceof AnalysisReintegrationError ? error.conflicts : undefined });
    }
  });

  app.post('/api/chapters/:chapterId/lines', async (request, reply) => {
    const chapterId = Number((request.params as any).chapterId);
    const data = createLineSchema.parse(request.body);
    const { tags, ...rest } = data;
    const line = await LineService.create(chapterId, {
      ...rest,
      tags: tags ? JSON.stringify(tags) : undefined,
    });
    reply.code(201);
    return line;
  });

  app.post('/api/chapters/:chapterId/lines/import-pgn', async (request, reply) => {
    const chapterId = Number((request.params as any).chapterId);
    const parsed = importPgnSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.errors });
    try {
      const line = await PgnService.importLine(chapterId, parsed.data);
      return reply.status(201).send(line);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  });

  app.get('/api/lines/:id', async (request, reply) => {
    const id = Number((request.params as any).id);
    const line = await LineService.get(id);
    if (!line) {
      reply.code(404);
      return { message: 'Line not found' };
    }
    return line;
  });

  app.get('/api/lines/:id/tree', async (request, reply) => {
    const id = Number((request.params as any).id);
    const tree = await LineService.getMoveTree(id);
    if (!tree) {
      reply.code(404);
      return { message: 'Line not found' };
    }
    return tree;
  });

  app.get('/api/lines/:id/export-pgn', async (request, reply) => {
    const id = Number((request.params as any).id);
    try {
      return { pgn: await PgnService.exportLine(id) };
    } catch (err: any) {
      return reply.status(404).send({ message: err.message });
    }
  });

  app.patch('/api/lines/:id', async (request, reply) => {
    const id = Number((request.params as any).id);
    const data = updateLineSchema.parse(request.body);
    const { tags, ...rest } = data;
    try {
      return await LineService.update(id, {
        ...rest,
        tags: tags ? JSON.stringify(tags) : undefined,
      });
    } catch {
      reply.code(404);
      return { message: 'Line not found' };
    }
  });

  app.post('/api/lines/:id/copy', async (request, reply) => {
    const id = Number((request.params as any).id);
    const data = copyLineSchema.parse(request.body);
    const copied = await LineService.copy(id, data.targetChapterId, data.name);
    if (!copied) {
      return reply.status(404).send({ message: 'Source line or target chapter not found' });
    }
    return reply.status(201).send(copied);
  });

  app.delete('/api/lines/:id', async (request, reply) => {
    const id = Number((request.params as any).id);
    try {
      await LineService.delete(id);
      reply.code(204);
      return;
    } catch {
      reply.code(404);
      return { message: 'Line not found' };
    }
  });

  app.post('/api/lines/:lineId/nodes', async (request, reply) => {
    const lineId = Number((request.params as any).lineId);
    const bodyResult = createNodeSchema.safeParse(request.body);
    if (!bodyResult.success) return reply.status(400).send({ error: bodyResult.error.errors });
    try {
      const node = await MoveNodeService.create(lineId, bodyResult.data);
      return reply.status(201).send(node);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  });

  app.patch('/api/nodes/:id', async (request, reply) => {
    const id = Number((request.params as any).id);
    const bodyResult = updateNodeSchema.safeParse(request.body);
    if (!bodyResult.success) return reply.status(400).send({ error: bodyResult.error.errors });
    try {
      return await MoveNodeService.update(id, bodyResult.data);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  });

  app.delete('/api/nodes/:id/subtree', async (request, reply) => {
    const id = Number((request.params as any).id);
    try {
      await MoveNodeService.deleteSubtree(id);
      return reply.status(204).send();
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  });
}
