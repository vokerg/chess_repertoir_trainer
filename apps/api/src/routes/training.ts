import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { TrainingService } from '../services/trainingService';

const playMoveSchema = z.object({
  moveUci: z.string().min(4).max(5),
});

export default async function trainingRoutes(app: FastifyInstance) {
  // Start a training session for a line
  app.post('/api/lines/:lineId/training/start', async (request: FastifyRequest, reply: FastifyReply) => {
    const { lineId } = request.params as { lineId: string };
    try {
      const session = await TrainingService.start(parseInt(lineId, 10));
      reply.send(session);
    } catch (err: any) {
      reply.status(400).send({ error: err.message });
    }
  });
  // Play a user move in a training session
  app.post('/api/training/:sessionId/move', async (request: FastifyRequest, reply: FastifyReply) => {
    const { sessionId } = request.params as { sessionId: string };
    const bodyResult = playMoveSchema.safeParse(request.body);
    if (!bodyResult.success) {
      return reply.status(400).send({ error: bodyResult.error.errors });
    }
    try {
      const result = await TrainingService.playMove(parseInt(sessionId, 10), bodyResult.data.moveUci);
      reply.send(result);
    } catch (err: any) {
      reply.status(400).send({ error: err.message });
    }
  });
  // Complete a training session
  app.post('/api/training/:sessionId/complete', async (request: FastifyRequest, reply: FastifyReply) => {
    const { sessionId } = request.params as { sessionId: string };
    try {
      const session = await TrainingService.complete(parseInt(sessionId, 10));
      reply.send(session);
    } catch (err: any) {
      reply.status(400).send({ error: err.message });
    }
  });
  // Abandon a training session
  app.post('/api/training/:sessionId/abandon', async (request: FastifyRequest, reply: FastifyReply) => {
    const { sessionId } = request.params as { sessionId: string };
    try {
      const session = await TrainingService.abandon(parseInt(sessionId, 10));
      reply.send(session);
    } catch (err: any) {
      reply.status(400).send({ error: err.message });
    }
  });
}