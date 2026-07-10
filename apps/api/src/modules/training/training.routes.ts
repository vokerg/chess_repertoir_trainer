import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { TrainingService } from '../../services/trainingService';
import { requireAuth } from '../../auth/request-auth';

const playMoveSchema = z.object({
  moveUci: z.string().min(4).max(5),
});

function isNotFound(error: unknown) {
  return error instanceof Error && (error.message === 'Line not found' || error.message === 'Training session not found');
}

export default async function trainingModule(app: FastifyInstance) {
  app.post('/api/lines/:lineId/training/start', async (request: FastifyRequest, reply: FastifyReply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const { lineId } = request.params as { lineId: string };
    try {
      const session = await TrainingService.start(auth.userId, parseInt(lineId, 10));
      reply.send(session);
    } catch (err: any) {
      reply.status(isNotFound(err) ? 404 : 400).send({ error: err.message });
    }
  });

  app.get('/api/training/history', async (request: FastifyRequest, reply: FastifyReply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    reply.send(await TrainingService.listHistory(auth.userId));
  });

  app.get('/api/training/:sessionId', async (request: FastifyRequest, reply: FastifyReply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const { sessionId } = request.params as { sessionId: string };
    const session = await TrainingService.getSession(auth.userId, parseInt(sessionId, 10));
    if (!session) return reply.status(404).send({ error: 'Training session not found' });
    reply.send(session);
  });

  app.post('/api/training/:sessionId/move', async (request: FastifyRequest, reply: FastifyReply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const { sessionId } = request.params as { sessionId: string };
    const bodyResult = playMoveSchema.safeParse(request.body);
    if (!bodyResult.success) {
      return reply.status(400).send({ error: bodyResult.error.issues });
    }
    try {
      const result = await TrainingService.playMove(auth.userId, parseInt(sessionId, 10), bodyResult.data.moveUci);
      reply.send(result);
    } catch (err: any) {
      reply.status(isNotFound(err) ? 404 : 400).send({ error: err.message });
    }
  });

  app.get('/api/training/:sessionId/review', async (request: FastifyRequest, reply: FastifyReply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const { sessionId } = request.params as { sessionId: string };
    const review = await TrainingService.getReview(auth.userId, parseInt(sessionId, 10));
    if (!review) return reply.status(404).send({ error: 'Training session not found' });
    reply.send(review);
  });

  app.post('/api/training/:sessionId/complete', async (request: FastifyRequest, reply: FastifyReply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const { sessionId } = request.params as { sessionId: string };
    try {
      const session = await TrainingService.complete(auth.userId, parseInt(sessionId, 10));
      reply.send(session);
    } catch (err: any) {
      reply.status(isNotFound(err) ? 404 : 400).send({ error: err.message });
    }
  });

  app.post('/api/training/:sessionId/abandon', async (request: FastifyRequest, reply: FastifyReply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const { sessionId } = request.params as { sessionId: string };
    try {
      const session = await TrainingService.abandon(auth.userId, parseInt(sessionId, 10));
      reply.send(session);
    } catch (err: any) {
      reply.status(isNotFound(err) ? 404 : 400).send({ error: err.message });
    }
  });
}
