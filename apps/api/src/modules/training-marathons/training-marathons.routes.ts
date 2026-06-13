import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { TrainingService } from '../../services/trainingService';
import { extractAvailableSublines } from 'chess-domain';
import { buildMoveTreeFromNodes } from '../../utils/move-tree-builder';
import { getChapterLinesWithMoves, getCourseLinesWithMoves } from '../courses/courses.repository.prisma';
import { requireAuth } from '../../auth/request-auth';

const marathonScopeSchema = z.object({
  type: z.enum(['CHAPTER', 'COURSE']),
  id: z.coerce.number().int().positive(),
});

const nextLineSchema = z.object({
  scope: marathonScopeSchema,
  recentLineIds: z.array(z.coerce.number().int().positive()).optional().default([]),
});

async function findTrainableLines(userId: number, scope: z.infer<typeof marathonScopeSchema>) {
  const lines = scope.type === 'CHAPTER'
    ? await getChapterLinesWithMoves(userId, scope.id)
    : await getCourseLinesWithMoves(userId, scope.id);
  return lines.filter((line) =>
    extractAvailableSublines(buildMoveTreeFromNodes(line.moves, line)).length > 0);
}

function pickLine<T extends { id: number }>(lines: T[], recentLineIds: number[]) {
  const recent = new Set(recentLineIds);
  const fresh = lines.filter((line) => !recent.has(line.id));
  const candidates = fresh.length > 0 ? fresh : lines;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

export default async function trainingMarathonsModule(app: FastifyInstance) {
  app.post('/api/training-marathons/next', async (request: FastifyRequest, reply: FastifyReply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const bodyResult = nextLineSchema.safeParse(request.body);
    if (!bodyResult.success) {
      return reply.status(400).send({ error: bodyResult.error.errors });
    }

    const { scope, recentLineIds } = bodyResult.data;

    try {
      const lines = await findTrainableLines(auth.userId, scope);
      if (lines.length === 0) {
        return reply.status(404).send({ error: `No trainable lines found for this ${scope.type.toLowerCase()}.` });
      }

      const line = pickLine(lines, recentLineIds);
      const session = await TrainingService.start(auth.userId, line.id);

      return reply.send({
        scope,
        line: {
          id: line.id,
          name: line.name,
          sideToTrain: line.sideToTrain,
          startingFen: line.startingFen,
          chapterId: line.chapterId,
          chapterName: line.chapter.name,
          courseId: line.chapter.courseId,
        },
        session,
      });
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  });
}
