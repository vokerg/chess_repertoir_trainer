import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { LineService } from '../services/lineService';
import { PgnService } from '../services/pgnService';
import { createLineSchema, updateLineSchema } from '../schemas/lineSchemas';
import { z } from 'zod';

const importPgnSchema = z.object({
  name: z.string().min(1),
  sideToTrain: z.enum(['WHITE', 'BLACK']),
  startingFen: z.string().optional(),
  pgn: z.string().min(1),
});

export default async function linesRoutes(app: FastifyInstance, opts: FastifyPluginOptions) {
  app.get('/api/chapters/:chapterId/lines', async (request, reply) => {
    const chapterId = Number((request.params as any).chapterId);
    const lines = await LineService.list(chapterId);
    return lines;
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
    if (!parsed.success) {
      reply.code(400);
      return { error: parsed.error.errors };
    }
    try {
      const line = await PgnService.importLine(chapterId, parsed.data);
      reply.code(201);
      return line;
    } catch (err: any) {
      reply.code(400);
      return { error: err.message };
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

  app.get('/api/lines/:id/export-pgn', async (request, reply) => {
    const id = Number((request.params as any).id);
    try {
      const pgn = await PgnService.exportLine(id);
      reply.header('content-type', 'text/plain; charset=utf-8');
      return pgn;
    } catch (err: any) {
      reply.code(404);
      return { message: err.message };
    }
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

  app.patch('/api/lines/:id', async (request, reply) => {
    const id = Number((request.params as any).id);
    const data = updateLineSchema.parse(request.body);
    const { tags, ...rest } = data;
    try {
      const updated = await LineService.update(id, {
        ...rest,
        tags: tags ? JSON.stringify(tags) : undefined,
      });
      return updated;
    } catch (err) {
      reply.code(404);
      return { message: 'Line not found' };
    }
  });

  app.delete('/api/lines/:id', async (request, reply) => {
    const id = Number((request.params as any).id);
    try {
      await LineService.delete(id);
      reply.code(204);
      return;
    } catch (err) {
      reply.code(404);
      return { message: 'Line not found' };
    }
  });
}
