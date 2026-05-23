import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { LineService } from '../services/lineService';
import { createLineSchema, updateLineSchema } from '../schemas/lineSchemas';

export default async function linesRoutes(app: FastifyInstance, opts: FastifyPluginOptions) {
  // List lines for a chapter
  app.get('/api/chapters/:chapterId/lines', async (request, reply) => {
    const chapterId = Number((request.params as any).chapterId);
    const lines = await LineService.list(chapterId);
    return lines;
  });

  // Create line under a chapter
  app.post('/api/chapters/:chapterId/lines', async (request, reply) => {
    const chapterId = Number((request.params as any).chapterId);
    const data = createLineSchema.parse(request.body);
    // convert tags array to JSON string if provided
    const { tags, ...rest } = data;
    const line = await LineService.create(chapterId, {
      ...rest,
      tags: tags ? JSON.stringify(tags) : undefined,
    });
    reply.code(201);
    return line;
  });

  // Get line by ID
  app.get('/api/lines/:id', async (request, reply) => {
    const id = Number((request.params as any).id);
    const line = await LineService.get(id);
    if (!line) {
      reply.code(404);
      return { message: 'Line not found' };
    }
    return line;
  });

  // Get full move tree for a line
  app.get('/api/lines/:id/tree', async (request, reply) => {
    const id = Number((request.params as any).id);
    const tree = await LineService.getMoveTree(id);
    if (!tree) {
      reply.code(404);
      return { message: 'Line not found' };
    }
    return tree;
  });

  // Update line
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

  // Delete line
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