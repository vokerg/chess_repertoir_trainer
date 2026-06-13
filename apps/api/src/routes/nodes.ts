import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { MoveNodeService } from '../modules/courses/courses.service';
import { requireAuth } from '../auth/request-auth';

// Schemas for request validation
const createNodeSchema = z.object({
  parentId: z.number().int().optional().nullable(),
  moveUci: z.string().min(4).max(5),
  comment: z.string().optional().nullable(),
  annotation: z.string().optional().nullable(),
  branchLabel: z.string().optional().nullable(),
  branchWeight: z.number().optional().nullable(),
  sortOrder: z.number().int().optional(),
});

const updateNodeSchema = z.object({
  comment: z.string().optional().nullable(),
  annotation: z.string().optional().nullable(),
  branchLabel: z.string().optional().nullable(),
  branchWeight: z.number().optional().nullable(),
  sortOrder: z.number().int().optional(),
  isCorrectUserMove: z.boolean().optional(),
});

export default async function nodesRoutes(fastify: FastifyInstance) {
  // Create a new move node under a line
  fastify.post('/api/lines/:lineId/nodes', async (request: FastifyRequest, reply: FastifyReply) => {
    const auth = requireAuth(request, reply); if (!auth) return;
    const { lineId } = request.params as { lineId: string };
    const bodyResult = createNodeSchema.safeParse(request.body);
    if (!bodyResult.success) {
      return reply.status(400).send({ error: bodyResult.error.errors });
    }
    try {
      const node = await MoveNodeService.create(auth.userId, parseInt(lineId, 10), bodyResult.data);
      reply.status(201).send(node);
    } catch (err: any) {
      if (err.message === 'Line not found' || err.message === 'Parent node not found') {
        return reply.status(404).send({ error: err.message });
      }
      reply.status(400).send({ error: err.message });
    }
  });
  // Update an existing node
  fastify.patch('/api/nodes/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const auth = requireAuth(request, reply); if (!auth) return;
    const { id } = request.params as { id: string };
    const bodyResult = updateNodeSchema.safeParse(request.body);
    if (!bodyResult.success) {
      return reply.status(400).send({ error: bodyResult.error.errors });
    }
    try {
      const node = await MoveNodeService.update(auth.userId, parseInt(id, 10), bodyResult.data);
      if (!node) return reply.status(404).send({ error: 'Node not found' });
      reply.send(node);
    } catch (err: any) {
      reply.status(400).send({ error: err.message });
    }
  });
  // Delete a node and its subtree
  fastify.delete('/api/nodes/:id/subtree', async (request: FastifyRequest, reply: FastifyReply) => {
    const auth = requireAuth(request, reply); if (!auth) return;
    const { id } = request.params as { id: string };
    try {
      const node = await MoveNodeService.deleteSubtree(auth.userId, parseInt(id, 10));
      if (!node) return reply.status(404).send({ error: 'Node not found' });
      reply.status(204).send();
    } catch (err: any) {
      reply.status(400).send({ error: err.message });
    }
  });
}
