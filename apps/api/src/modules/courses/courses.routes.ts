import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
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
import {
  apiErrorResponseSchema,
  legacyOpaqueResponseSchema,
  messageResponseSchema,
  noContentResponseSchema,
  unauthorizedResponseSchema,
} from '../../routes/legacy-route.schemas';
import { validationErrorResponseSchema } from '../../routes/api-error.schemas';

const importPgnSchema = z.object({
  name: z.string().min(1),
  sideToTrain: z.enum(['WHITE', 'BLACK']),
  startingFen: z.string().optional(),
  pgn: z.string().min(1),
});

const courseIdParamsSchema = z.object({ courseId: z.coerce.number().int().positive() });
const chapterIdParamsSchema = z.object({ chapterId: z.coerce.number().int().positive() });
const lineIdParamsSchema = z.object({ lineId: z.coerce.number().int().positive() });
const idParamsSchema = z.object({ id: z.coerce.number().int().positive() });
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

const courseRouteSchema = <T extends Record<string, unknown>>(
  operationId: string,
  tags: string[],
  summary: string,
  extra: T,
) => ({ operationId, tags, summary, ...extra });

const coursesModule: FastifyPluginAsyncZod = async (app) => {
  app.get('/api/courses', {
    schema: courseRouteSchema('listCourses', ['Courses'], 'List courses for the current user', {
      response: { 200: legacyOpaqueResponseSchema, 401: unauthorizedResponseSchema },
    }),
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    return CourseService.list(auth.userId);
  });

  app.post('/api/courses', {
    schema: courseRouteSchema('createCourse', ['Courses'], 'Create a course', {
      body: createCourseSchema,
      response: { 201: legacyOpaqueResponseSchema, 400: validationErrorResponseSchema, 401: unauthorizedResponseSchema },
    }),
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const course = await CourseService.create(auth.userId, request.body);
    reply.code(201);
    return course;
  });

  app.get('/api/courses/position-suggestions', {
    schema: courseRouteSchema('listCoursePositionSuggestions', ['Courses'], 'List repertoire suggestions for a position', {
      querystring: positionSuggestionsQuerySchema,
      response: { 200: legacyOpaqueResponseSchema, 400: z.union([validationErrorResponseSchema, apiErrorResponseSchema]), 401: unauthorizedResponseSchema },
    }),
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    try {
      return await CoursePositionSuggestionService.listForFen(auth.userId, request.query.fen);
    } catch (err: any) {
      return reply.status(400).send({ error: err?.message ?? String(err) });
    }
  });

  app.get('/api/courses/:id', {
    schema: courseRouteSchema('getCourse', ['Courses'], 'Get one course', {
      params: idParamsSchema,
      response: { 200: legacyOpaqueResponseSchema, 400: validationErrorResponseSchema, 401: unauthorizedResponseSchema, 404: messageResponseSchema },
    }),
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const id = request.params.id;
    const course = await CourseService.get(auth.userId, id);
    if (!course) {
      reply.code(404);
      return { message: 'Course not found' };
    }
    return course;
  });

  app.patch('/api/courses/:id', {
    schema: courseRouteSchema('updateCourse', ['Courses'], 'Update one course', {
      params: idParamsSchema,
      body: updateCourseSchema,
      response: { 200: legacyOpaqueResponseSchema, 400: validationErrorResponseSchema, 401: unauthorizedResponseSchema, 404: messageResponseSchema },
    }),
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const id = request.params.id;
    try {
      const course = await CourseService.update(auth.userId, id, request.body);
      if (!course) return reply.status(404).send({ message: 'Course not found' });
      return course;
    } catch {
      reply.code(404);
      return { message: 'Course not found' };
    }
  });

  app.delete('/api/courses/:id', {
    schema: courseRouteSchema('deleteCourse', ['Courses'], 'Delete one course', {
      params: idParamsSchema,
      response: { 204: noContentResponseSchema, 400: validationErrorResponseSchema, 401: unauthorizedResponseSchema, 404: messageResponseSchema },
    }),
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const id = request.params.id;
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

  app.get('/api/courses/:courseId/chapters', {
    schema: courseRouteSchema('listCourseChapters', ['Chapters'], 'List chapters in a course', {
      params: courseIdParamsSchema,
      response: { 200: legacyOpaqueResponseSchema, 400: validationErrorResponseSchema, 401: unauthorizedResponseSchema, 404: messageResponseSchema },
    }),
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const courseId = request.params.courseId;
    const chapters = await ChapterService.list(auth.userId, courseId);
    if (!chapters) return reply.status(404).send({ message: 'Course not found' });
    return chapters;
  });

  app.post('/api/courses/:courseId/chapters', {
    schema: courseRouteSchema('createCourseChapter', ['Chapters'], 'Create a chapter in a course', {
      params: courseIdParamsSchema,
      body: createChapterSchema,
      response: { 201: legacyOpaqueResponseSchema, 400: validationErrorResponseSchema, 401: unauthorizedResponseSchema, 404: messageResponseSchema },
    }),
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const courseId = request.params.courseId;
    const chapter = await ChapterService.create(auth.userId, courseId, request.body);
    if (!chapter) return reply.status(404).send({ message: 'Course not found' });
    reply.code(201);
    return chapter;
  });

  app.get('/api/chapters/:id', {
    schema: courseRouteSchema('getChapter', ['Chapters'], 'Get one chapter', {
      params: idParamsSchema,
      response: { 200: legacyOpaqueResponseSchema, 400: validationErrorResponseSchema, 401: unauthorizedResponseSchema, 404: messageResponseSchema },
    }),
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const id = request.params.id;
    const chapter = await ChapterService.get(auth.userId, id);
    if (!chapter) {
      reply.code(404);
      return { message: 'Chapter not found' };
    }
    return chapter;
  });

  app.patch('/api/chapters/:id', {
    schema: courseRouteSchema('updateChapter', ['Chapters'], 'Update one chapter', {
      params: idParamsSchema,
      body: updateChapterSchema,
      response: { 200: legacyOpaqueResponseSchema, 400: validationErrorResponseSchema, 401: unauthorizedResponseSchema, 404: messageResponseSchema },
    }),
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const id = request.params.id;
    try {
      const chapter = await ChapterService.update(auth.userId, id, request.body);
      if (!chapter) return reply.status(404).send({ message: 'Chapter not found' });
      return chapter;
    } catch {
      reply.code(404);
      return { message: 'Chapter not found' };
    }
  });

  app.delete('/api/chapters/:id', {
    schema: courseRouteSchema('deleteChapter', ['Chapters'], 'Delete one chapter', {
      params: idParamsSchema,
      response: { 204: noContentResponseSchema, 400: validationErrorResponseSchema, 401: unauthorizedResponseSchema, 404: messageResponseSchema },
    }),
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const id = request.params.id;
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

  app.get('/api/chapters/:chapterId/lines', {
    schema: courseRouteSchema('listChapterLines', ['Lines'], 'List lines in a chapter', {
      params: chapterIdParamsSchema,
      response: { 200: legacyOpaqueResponseSchema, 400: validationErrorResponseSchema, 401: unauthorizedResponseSchema, 404: messageResponseSchema },
    }),
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const chapterId = request.params.chapterId;
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
        400: validationErrorResponseSchema,
        401: unauthorizedResponseSchema,
        404: z.object({ error: z.string() }),
      },
    },
    handler: async (request, reply) => {
      const auth = requireAuth(request, reply);
      if (!auth) return;
      const courseId = request.params.courseId;
      const sublines = await getAvailableSublineRows(auth.userId, { type: 'COURSE', id: courseId });
      if (sublines === null) return reply.status(404).send({ error: 'Course not found' });
      return reply.send(sublines);
    },
  });

  app.post('/api/chapters/:chapterId/analysis-reintegration/preview', {
    schema: courseRouteSchema('previewChapterAnalysisReintegration', ['Chapters'], 'Preview analysis moves that can be added to a chapter', {
      params: chapterIdParamsSchema,
      body: previewAnalysisReintegrationSchema,
      response: { 200: legacyOpaqueResponseSchema, 400: z.union([validationErrorResponseSchema, apiErrorResponseSchema]), 401: unauthorizedResponseSchema, 404: apiErrorResponseSchema },
    }),
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const chapterId = request.params.chapterId;
    try {
      return await AnalysisReintegrationService.previewChapter(auth.userId, chapterId, request.body);
    } catch (error) {
      const status = error instanceof AnalysisReintegrationError ? error.status : 400;
      return reply.status(status as 400 | 404).send({ error: error instanceof Error ? error.message : 'Could not preview analysis reintegration.' });
    }
  });

  app.post('/api/chapters/:chapterId/analysis-reintegration/apply', {
    schema: courseRouteSchema('applyChapterAnalysisReintegration', ['Chapters'], 'Apply selected analysis moves to a chapter', {
      params: chapterIdParamsSchema,
      body: applyAnalysisReintegrationSchema,
      response: { 200: legacyOpaqueResponseSchema, 400: legacyOpaqueResponseSchema, 401: unauthorizedResponseSchema, 404: apiErrorResponseSchema, 409: legacyOpaqueResponseSchema },
    }),
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const chapterId = request.params.chapterId;
    try {
      return await AnalysisReintegrationService.applyToChapter(auth.userId, chapterId, request.body);
    } catch (error) {
      const status = error instanceof AnalysisReintegrationError ? error.status : 400;
      return reply.status(status as 400 | 404 | 409).send({ error: error instanceof Error ? error.message : 'Could not apply analysis reintegration.',
        conflicts: error instanceof AnalysisReintegrationError ? error.conflicts : undefined });
    }
  });

  app.post('/api/chapters/:chapterId/lines', {
    schema: courseRouteSchema('createChapterLine', ['Lines'], 'Create a repertoire line in a chapter', {
      params: chapterIdParamsSchema,
      body: createLineSchema,
      response: { 201: legacyOpaqueResponseSchema, 400: validationErrorResponseSchema, 401: unauthorizedResponseSchema, 404: messageResponseSchema },
    }),
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const chapterId = request.params.chapterId;
    const { tags, ...rest } = request.body;
    const line = await LineService.create(auth.userId, chapterId, {
      ...rest,
      tags: tags ? JSON.stringify(tags) : undefined,
    });
    if (!line) return reply.status(404).send({ message: 'Chapter not found' });
    reply.code(201);
    return line;
  });

  app.post('/api/chapters/:chapterId/lines/import-pgn', {
    schema: courseRouteSchema('importChapterLinePgn', ['Lines'], 'Import a PGN as a repertoire line', {
      params: chapterIdParamsSchema,
      body: importPgnSchema,
      response: { 201: legacyOpaqueResponseSchema, 400: z.union([validationErrorResponseSchema, apiErrorResponseSchema]), 401: unauthorizedResponseSchema },
    }),
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const chapterId = request.params.chapterId;
    try {
      const line = await PgnService.importLine(auth.userId, chapterId, request.body);
      return reply.status(201).send(line);
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  });

  app.get('/api/lines/:id', {
    schema: courseRouteSchema('getLine', ['Lines'], 'Get one repertoire line', {
      params: idParamsSchema,
      response: { 200: legacyOpaqueResponseSchema, 400: validationErrorResponseSchema, 401: unauthorizedResponseSchema, 404: messageResponseSchema },
    }),
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const id = request.params.id;
    const line = await LineService.get(auth.userId, id);
    if (!line) {
      reply.code(404);
      return { message: 'Line not found' };
    }
    return line;
  });

  app.get('/api/lines/:id/tree', {
    schema: courseRouteSchema('getLineTree', ['Lines'], 'Get the move tree for a repertoire line', {
      params: idParamsSchema,
      response: { 200: legacyOpaqueResponseSchema, 400: validationErrorResponseSchema, 401: unauthorizedResponseSchema, 404: messageResponseSchema },
    }),
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const id = request.params.id;
    const tree = await LineService.getMoveTree(auth.userId, id);
    if (!tree) {
      reply.code(404);
      return { message: 'Line not found' };
    }
    return tree;
  });

  app.get('/api/lines/:id/export-pgn', {
    schema: courseRouteSchema('exportLinePgn', ['Lines'], 'Export a repertoire line as PGN', {
      params: idParamsSchema,
      response: { 200: z.object({ pgn: z.string() }), 400: validationErrorResponseSchema, 401: unauthorizedResponseSchema, 404: messageResponseSchema },
    }),
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const id = request.params.id;
    try {
      return { pgn: await PgnService.exportLine(auth.userId, id) };
    } catch (err: any) {
      return reply.status(404).send({ message: err.message });
    }
  });

  app.patch('/api/lines/:id', {
    schema: courseRouteSchema('updateLine', ['Lines'], 'Update one repertoire line', {
      params: idParamsSchema,
      body: updateLineSchema,
      response: { 200: legacyOpaqueResponseSchema, 400: validationErrorResponseSchema, 401: unauthorizedResponseSchema, 404: messageResponseSchema },
    }),
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const id = request.params.id;
    const { tags, ...rest } = request.body;
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

  app.post('/api/lines/:id/copy', {
    schema: courseRouteSchema('copyLine', ['Lines'], 'Copy a repertoire line to a chapter', {
      params: idParamsSchema,
      body: copyLineSchema,
      response: { 201: legacyOpaqueResponseSchema, 400: validationErrorResponseSchema, 401: unauthorizedResponseSchema, 404: messageResponseSchema },
    }),
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const id = request.params.id;
    const copied = await LineService.copy(auth.userId, id, request.body.targetChapterId, request.body.name);
    if (!copied) {
      return reply.status(404).send({ message: 'Source line or target chapter not found' });
    }
    return reply.status(201).send(copied);
  });

  app.delete('/api/lines/:id', {
    schema: courseRouteSchema('deleteLine', ['Lines'], 'Delete one repertoire line', {
      params: idParamsSchema,
      response: { 204: noContentResponseSchema, 400: validationErrorResponseSchema, 401: unauthorizedResponseSchema, 404: messageResponseSchema },
    }),
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const id = request.params.id;
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

  app.post('/api/lines/:lineId/nodes', {
    schema: courseRouteSchema('createLineNode', ['Lines'], 'Add a move node to a repertoire line', {
      params: lineIdParamsSchema,
      body: createNodeSchema,
      response: { 201: legacyOpaqueResponseSchema, 400: z.union([validationErrorResponseSchema, apiErrorResponseSchema]), 401: unauthorizedResponseSchema, 404: apiErrorResponseSchema },
    }),
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const lineId = request.params.lineId;
    try {
      const node = await MoveNodeService.create(auth.userId, lineId, request.body);
      return reply.status(201).send(node);
    } catch (err: any) {
      if (err.message === 'Line not found' || err.message === 'Parent node not found') {
        return reply.status(404).send({ error: err.message });
      }
      return reply.status(400).send({ error: err.message });
    }
  });

  app.patch('/api/nodes/:id', {
    schema: courseRouteSchema('updateMoveNode', ['Lines'], 'Update one move node', {
      params: idParamsSchema,
      body: updateNodeSchema,
      response: { 200: legacyOpaqueResponseSchema, 400: z.union([validationErrorResponseSchema, apiErrorResponseSchema]), 401: unauthorizedResponseSchema, 404: messageResponseSchema },
    }),
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const id = request.params.id;
    try {
      const node = await MoveNodeService.update(auth.userId, id, request.body);
      if (!node) return reply.status(404).send({ message: 'Node not found' });
      return node;
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  });

  app.delete('/api/nodes/:id/subtree', {
    schema: courseRouteSchema('deleteMoveNodeSubtree', ['Lines'], 'Delete a move-node subtree', {
      params: idParamsSchema,
      response: { 204: noContentResponseSchema, 400: z.union([validationErrorResponseSchema, apiErrorResponseSchema]), 401: unauthorizedResponseSchema, 404: messageResponseSchema },
    }),
  }, async (request, reply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const id = request.params.id;
    try {
      const node = await MoveNodeService.deleteSubtree(auth.userId, id);
      if (!node) return reply.status(404).send({ message: 'Node not found' });
      return reply.status(204).send();
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  });
};

export default coursesModule;
