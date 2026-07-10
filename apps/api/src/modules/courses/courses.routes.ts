import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../auth/request-auth';
import {
  ChapterService,
  CoursePositionSuggestionService,
  CourseService,
  LineService,
  MoveNodeService,
} from './courses.service';
import {
  createChapterSchema,
  createCourseSchema,
  createLineSchema,
  copyLineSchema,
  createNodeSchema,
  positionSuggestionsQuerySchema,
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

const importPgnSchema = z.object({
  name: z.string().min(1),
  sideToTrain: z.enum(['WHITE', 'BLACK']),
  startingFen: z.string().optional(),
  pgn: z.string().min(1),
});

const courseIdParamsSchema = z.object({ courseId: z.coerce.number().int().positive() });
const sublineSchema = z.object({
  hash: z.string(),
  canonicalKeyVersion: z.number().int(),
  lineId: z.number().int(),
  lineName: z.string(),
  chapterId: z.number().int(),
  chapterName: z.string(),
  leafNodeId: z.number().int(),
  moveText: z.string(),
  moves: z.array(z.object({
    nodeId: z.number().int(),
    moveUci: z.string(),
    moveSan: z.string(),
    plyNumber: z.number().int(),
    sortOrder: z.number().int(),
  })),
});

export default async function coursesModule(app: FastifyInstance) {
  app.get('/api/courses', async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    return CourseService.list(auth.userId);
  });

  app.post('/api/courses', async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const data = createCourseSchema.parse(request.body);
    const course = await CourseService.create(auth.userId, data);
    reply.code(201);
    return course;
  });

  app.get('/api/courses/position-suggestions', async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const parsed = positionSuggestionsQuerySchema.safeParse(request.query ?? {});
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.issues });
    try {
      return await CoursePositionSuggestionService.listForFen(auth.userId, parsed.data.fen);
    } catch (err: any) {
      return reply.status(400).send({ error: err?.message ?? String(err) });
    }
  });

  app.get('/api/courses/:id', async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const id = Number((request.params as any).id);
    const course = await CourseService.get(auth.userId, id);
    if (!course) {
      reply.code(404);
      return { message: 'Course not found' };
    }
    return course;
  });

  app.patch('/api/courses/:id', async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const id = Number((request.params as any).id);
    const data = updateCourseSchema.parse(request.body);
    try {
      const course = await CourseService.update(auth.userId, id, data);
      if (!course) return reply.status(404).send({ message: 'Course not found' });
      return course;
    } catch {
      reply.code(404);
      return { message: 'Course not found' };
    }
  });

  app.delete('/api/courses/:id', async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const id = Number((request.params as any).id);
    try {
      const course = await CourseService.delete(auth.userId, id);
      if (!course) return reply.status(404).send({ message: 'Course not found' });
      reply.code(204);
      return;
    } catch {
      reply.code(404);
      return { message: 'Course not found' };
    }
  });

  app.get('/api/courses/:courseId/chapters', async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const courseId = Number((request.params as any).courseId);
    const chapters = await ChapterService.list(auth.userId, courseId);
    if (!chapters) return reply.status(404).send({ message: 'Course not found' });
    return chapters;
  });

  app.post('/api/courses/:courseId/chapters', async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const courseId = Number((request.params as any).courseId);
    const data = createChapterSchema.parse(request.body);
    const chapter = await ChapterService.create(auth.userId, courseId, data);
    if (!chapter) return reply.status(404).send({ message: 'Course not found' });
    reply.code(201);
    return chapter;
  });

  app.get('/api/chapters/:id', async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const id = Number((request.params as any).id);
    const chapter = await ChapterService.get(auth.userId, id);
    if (!chapter) {
      reply.code(404);
      return { message: 'Chapter not found' };
    }
    return chapter;
  });

  app.patch('/api/chapters/:id', async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const id = Number((request.params as any).id);
    const data = updateChapterSchema.parse(request.body);
    try {
      const chapter = await ChapterService.update(auth.userId, id, data);
      if (!chapter) return reply.status(404).send({ message: 'Chapter not found' });
      return chapter;
    } catch {
      reply.code(404);
      return { message: 'Chapter not found' };
    }
  });

  app.delete('/api/chapters/:id', async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const id = Number((request.params as any).id);
    try {
      const chapter = await ChapterService.delete(auth.userId, id);
      if (!chapter) return reply.status(404).send({ message: 'Chapter not found' });
      reply.code(204);
      return;
    } catch {
      reply.code(404);
      return { message: 'Chapter not found' };
    }
  });

  app.get('/api/chapters/:chapterId/lines', async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const chapterId = Number((request.params as any).chapterId);
    const lines = await LineService.list(auth.userId, chapterId);
    if (!lines) return reply.status(404).send({ message: 'Chapter not found' });
    return lines;
  });

  app.route({
    method: 'GET',
    url: '/api/courses/:courseId/sublines',
    schema: {
      operationId: 'listCourseSublines',
      tags: ['Courses'],
      summary: 'List all terminal move-tree variations in a course',
      params: courseIdParamsSchema,
      response: {
        200: z.array(sublineSchema),
        400: z.object({ error: z.string() }),
        404: z.object({ error: z.string() }),
      },
    },
    handler: async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;
      const courseId = Number((request.params as any).courseId);
      if (!Number.isInteger(courseId) || courseId <= 0) {
        return reply.status(400).send({ error: 'Invalid course id' });
      }
      const sublines = await getAvailableSublineRows(auth.userId, { type: 'COURSE', id: courseId });
      if (sublines === null) return reply.status(404).send({ error: 'Course not found' });
      return reply.send(sublines);
    },
  });

  app.post('/api/chapters/:chapterId/analysis-reintegration/preview', async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const chapterId = Number((request.params as any).chapterId);
    if (!Number.isInteger(chapterId) || chapterId <= 0) return reply.status(400).send({ error: 'Invalid chapter id' });
    const parsed = previewAnalysisReintegrationSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.issues });
    try {
      return await AnalysisReintegrationService.previewChapter(auth.userId, chapterId, parsed.data);
    } catch (error) {
      const status = error instanceof AnalysisReintegrationError ? error.status : 400;
      return reply.status(status).send({ error: error instanceof Error ? error.message : 'Could not preview analysis reintegration.' });
    }
  });

  app.post('/api/chapters/:chapterId/analysis-reintegration/apply', async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const chapterId = Number((request.params as any).chapterId);
    if (!Number.isInteger(chapterId) || chapterId <= 0) return reply.status(400).send({ error: 'Invalid chapter id' });
    const parsed = applyAnalysisReintegrationSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.issues });
    try {
      return await AnalysisReintegrationService.applyToChapter(auth.userId, chapterId, parsed.data);
    } catch (error) {
      const status = error instanceof AnalysisReintegrationError ? error.status : 400;
      return reply.status(status).send({ error: error instanceof Error ? error.message : 'Could not apply analysis reintegration.',
        conflicts: error instanceof AnalysisReintegrationError ? error.conflicts : undefined });
    }
  });

  app.post('/api/chapters/:chapterId/lines', async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const chapterId = Number((request.params as any).chapterId);
    const data = createLineSchema.parse(request.body);
    const { tags, ...rest } = data;
    const line = await LineService.create(auth.userId, chapterId, {
      ...rest,
      tags: tags ? JSON.stringify(tags) : undefined,
    });
    if (!line) return reply.status(404).send({ message: 'Chapter not found' });
    reply.code(201);
    return line;
  });

  app.post('/api/chapters/:chapterId/lines/import-pgn', async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const chapterId = Number((request.params as any).chapterId);
    const parsed = importPgnSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.issues });
    try {
      const line = await PgnService.importLine(auth.userId, chapterId, parsed.data);
      return reply.status(201).send(line);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  });

  app.get('/api/lines/:id', async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const id = Number((request.params as any).id);
    const line = await LineService.get(auth.userId, id);
    if (!line) {
      reply.code(404);
      return { message: 'Line not found' };
    }
    return line;
  });

  app.get('/api/lines/:id/tree', async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const id = Number((request.params as any).id);
    const tree = await LineService.getMoveTree(auth.userId, id);
    if (!tree) {
      reply.code(404);
      return { message: 'Line not found' };
    }
    return tree;
  });

  app.get('/api/lines/:id/export-pgn', async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const id = Number((request.params as any).id);
    try {
      return { pgn: await PgnService.exportLine(auth.userId, id) };
    } catch (err: any) {
      return reply.status(404).send({ message: err.message });
    }
  });

  app.patch('/api/lines/:id', async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const id = Number((request.params as any).id);
    const data = updateLineSchema.parse(request.body);
    const { tags, ...rest } = data;
    try {
      const line = await LineService.update(auth.userId, id, {
        ...rest,
        tags: tags ? JSON.stringify(tags) : undefined,
      });
      if (!line) return reply.status(404).send({ message: 'Line not found' });
      return line;
    } catch {
      reply.code(404);
      return { message: 'Line not found' };
    }
  });

  app.post('/api/lines/:id/copy', async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const id = Number((request.params as any).id);
    const data = copyLineSchema.parse(request.body);
    const copied = await LineService.copy(auth.userId, id, data.targetChapterId, data.name);
    if (!copied) {
      return reply.status(404).send({ message: 'Source line or target chapter not found' });
    }
    return reply.status(201).send(copied);
  });

  app.delete('/api/lines/:id', async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const id = Number((request.params as any).id);
    try {
      const line = await LineService.delete(auth.userId, id);
      if (!line) return reply.status(404).send({ message: 'Line not found' });
      reply.code(204);
      return;
    } catch {
      reply.code(404);
      return { message: 'Line not found' };
    }
  });

  app.post('/api/lines/:lineId/nodes', async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const lineId = Number((request.params as any).lineId);
    const bodyResult = createNodeSchema.safeParse(request.body);
    if (!bodyResult.success) return reply.status(400).send({ error: bodyResult.error.issues });
    try {
      const node = await MoveNodeService.create(auth.userId, lineId, bodyResult.data);
      return reply.status(201).send(node);
    } catch (err: any) {
      if (err.message === 'Line not found' || err.message === 'Parent node not found') {
        return reply.status(404).send({ error: err.message });
      }
      return reply.status(400).send({ error: err.message });
    }
  });

  app.patch('/api/nodes/:id', async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const id = Number((request.params as any).id);
    const bodyResult = updateNodeSchema.safeParse(request.body);
    if (!bodyResult.success) return reply.status(400).send({ error: bodyResult.error.issues });
    try {
      const node = await MoveNodeService.update(auth.userId, id, bodyResult.data);
      if (!node) return reply.status(404).send({ message: 'Node not found' });
      return node;
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  });

  app.delete('/api/nodes/:id/subtree', async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const id = Number((request.params as any).id);
    try {
      const node = await MoveNodeService.deleteSubtree(auth.userId, id);
      if (!node) return reply.status(404).send({ message: 'Node not found' });
      return reply.status(204).send();
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  });
}
