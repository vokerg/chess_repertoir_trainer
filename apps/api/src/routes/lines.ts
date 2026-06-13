import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { LineService } from '../modules/courses/courses.service';
import { requireAuth } from '../auth/request-auth';
import { PgnService } from '../services/pgnService';
import { copyLineSchema, createLineSchema, updateLineSchema } from '../schemas/lineSchemas';
import { z } from 'zod';

const importPgnSchema = z.object({
  name: z.string().min(1),
  sideToTrain: z.enum(['WHITE', 'BLACK']),
  startingFen: z.string().optional(),
  pgn: z.string().min(1),
});

export default async function linesRoutes(app: FastifyInstance, opts: FastifyPluginOptions) {
  app.get('/api/chapters/:chapterId/lines', async (request, reply) => {
    const auth = requireAuth(request, reply); if (!auth) return;
    const chapterId = Number((request.params as any).chapterId);
    const lines = await LineService.list(auth.userId, chapterId);
    if (!lines) return reply.code(404).send({ message: 'Chapter not found' });
    return lines;
  });

  app.post('/api/chapters/:chapterId/lines', async (request, reply) => {
    const auth = requireAuth(request, reply); if (!auth) return;
    const chapterId = Number((request.params as any).chapterId);
    const data = createLineSchema.parse(request.body);
    const { tags, ...rest } = data;
    const line = await LineService.create(auth.userId, chapterId, {
      ...rest,
      tags: tags ? JSON.stringify(tags) : undefined,
    });
    if (!line) return reply.code(404).send({ message: 'Chapter not found' });
    reply.code(201);
    return line;
  });

  app.post('/api/chapters/:chapterId/lines/import-pgn', async (request, reply) => {
    const auth = requireAuth(request, reply); if (!auth) return;
    const chapterId = Number((request.params as any).chapterId);
    const parsed = importPgnSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400);
      return { error: parsed.error.errors };
    }
    try {
      const line = await PgnService.importLine(auth.userId, chapterId, parsed.data);
      reply.code(201);
      return line;
    } catch (err: any) {
      reply.code(400);
      return { error: err.message };
    }
  });

  app.get('/api/lines/:id', async (request, reply) => {
    const auth = requireAuth(request, reply); if (!auth) return;
    const id = Number((request.params as any).id);
    const line = await LineService.get(auth.userId, id);
    if (!line) {
      reply.code(404);
      return { message: 'Line not found' };
    }
    return line;
  });

  app.get('/api/lines/:id/export-pgn', async (request, reply) => {
    const auth = requireAuth(request, reply); if (!auth) return;
    const id = Number((request.params as any).id);
    try {
      const pgn = await PgnService.exportLine(auth.userId, id);
      return { pgn };
    } catch (err: any) {
      reply.code(404);
      return { message: err.message };
    }
  });

  app.get('/api/lines/:id/tree', async (request, reply) => {
    const auth = requireAuth(request, reply); if (!auth) return;
    const id = Number((request.params as any).id);
    const tree = await LineService.getMoveTree(auth.userId, id);
    if (!tree) {
      reply.code(404);
      return { message: 'Line not found' };
    }
    return tree;
  });

  app.patch('/api/lines/:id', async (request, reply) => {
    const auth = requireAuth(request, reply); if (!auth) return;
    const id = Number((request.params as any).id);
    const data = updateLineSchema.parse(request.body);
    const { tags, ...rest } = data;
    try {
      const updated = await LineService.update(auth.userId, id, {
        ...rest,
        tags: tags ? JSON.stringify(tags) : undefined,
      });
      if (!updated) return reply.code(404).send({ message: 'Line not found' });
      return updated;
    } catch (err) {
      reply.code(404);
      return { message: 'Line not found' };
    }
  });

  app.post('/api/lines/:id/copy', async (request, reply) => {
    const auth = requireAuth(request, reply); if (!auth) return;
    const id = Number((request.params as any).id);
    const data = copyLineSchema.parse(request.body);
    const copied = await LineService.copy(auth.userId, id, data.targetChapterId, data.name);
    if (!copied) {
      reply.code(404);
      return { message: 'Source line or target chapter not found' };
    }
    reply.code(201);
    return copied;
  });

  app.delete('/api/lines/:id', async (request, reply) => {
    const auth = requireAuth(request, reply); if (!auth) return;
    const id = Number((request.params as any).id);
    try {
      const line = await LineService.delete(auth.userId, id);
      if (!line) return reply.code(404).send({ message: 'Line not found' });
      reply.code(204);
      return;
    } catch (err) {
      reply.code(404);
      return { message: 'Line not found' };
    }
  });
}
