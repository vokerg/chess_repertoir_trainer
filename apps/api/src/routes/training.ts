import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { TrainingService } from '../services/trainingService';
import prisma from '../prisma';

const playMoveSchema = z.object({
  moveUci: z.string().min(4).max(5),
});

async function buildReview(sessionId: number) {
  const session = await prisma.trainingSession.findUnique({ where: { id: sessionId } });
  if (!session) throw new Error('Training session not found');

  const mistakes = await prisma.trainingAttemptMove.findMany({
    where: { sessionId, wasCorrect: false },
    orderBy: { createdAt: 'asc' },
    include: {
      moveNode: {
        select: {
          id: true,
          moveSan: true,
          moveUci: true,
          comment: true,
          annotation: true,
          branchLabel: true,
        },
      },
    },
  });

  return {
    ...session,
    mistakes: mistakes.map((attempt: any) => ({
      id: attempt.id,
      moveNodeId: attempt.moveNodeId,
      fenBefore: attempt.fenBefore,
      expectedMoveUci: attempt.expectedMoveUci,
      playedMoveUci: attempt.playedMoveUci,
      moveSan: attempt.moveNode?.moveSan ?? null,
      comment: attempt.moveNode?.comment ?? null,
      annotation: attempt.moveNode?.annotation ?? null,
      branchLabel: attempt.moveNode?.branchLabel ?? null,
      createdAt: attempt.createdAt,
    })),
  };
}

export default async function trainingRoutes(app: FastifyInstance) {
  app.post('/api/lines/:lineId/training/start', async (request: FastifyRequest, reply: FastifyReply) => {
    const { lineId } = request.params as { lineId: string };
    try {
      const session = await TrainingService.start(parseInt(lineId, 10));
      reply.send(session);
    } catch (err: any) {
      reply.status(400).send({ error: err.message });
    }
  });

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

  app.get('/api/training/:sessionId/review', async (request: FastifyRequest, reply: FastifyReply) => {
    const { sessionId } = request.params as { sessionId: string };
    try {
      const review = await buildReview(parseInt(sessionId, 10));
      reply.send(review);
    } catch (err: any) {
      reply.status(404).send({ error: err.message });
    }
  });

  app.post('/api/training/:sessionId/complete', async (request: FastifyRequest, reply: FastifyReply) => {
    const { sessionId } = request.params as { sessionId: string };
    try {
      const session = await TrainingService.complete(parseInt(sessionId, 10));
      reply.send(session);
    } catch (err: any) {
      reply.status(400).send({ error: err.message });
    }
  });

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
