import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { TrainingService } from '../../services/trainingService';
import {
  getAvailableSublineRows,
  getWeakSublinePool,
  pickRandomSubline,
} from '../courses/sublines.service';
import { TRAINING_MODE_MARATHON, TRAINING_MODE_WEAK_SUBLINES } from '../training/training.constants';
import { requireAuth } from '../../auth/request-auth';

const marathonScopeSchema = z.object({
  type: z.enum(['CHAPTER', 'COURSE']),
  id: z.coerce.number().int().positive(),
});

const nextLineSchema = z.object({
  scope: marathonScopeSchema,
  mode: z.enum(['ALL', 'WEAK_SUBLINES']).optional().default('ALL'),
  recentSublineHashes: z.array(z.string().length(64)).optional().default([]),
});

export default async function trainingMarathonsModule(app: FastifyInstance) {
  app.post('/api/training-marathons/next', async (request: FastifyRequest, reply: FastifyReply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const bodyResult = nextLineSchema.safeParse(request.body);
    if (!bodyResult.success) {
      return reply.status(400).send({ error: bodyResult.error.errors });
    }

    const { scope, mode, recentSublineHashes } = bodyResult.data;

    try {
      const sublines = await getAvailableSublineRows(auth.userId, scope);
      if (sublines === null) {
        return reply.status(404).send({ error: `${scope.type === 'COURSE' ? 'Course' : 'Chapter'} not found.` });
      }
      if (sublines.length === 0) {
        return reply.status(404).send({ error: `No trainable sublines found for this ${scope.type.toLowerCase()}.` });
      }

      const pool = mode === 'WEAK_SUBLINES'
        ? await getWeakSublinePool(auth.userId, sublines)
        : sublines;
      const subline = pickRandomSubline(pool, recentSublineHashes);

      if (!subline) {
        return reply.status(404).send({ error: `No trainable sublines found for this ${scope.type.toLowerCase()}.` });
      }

      const session = await TrainingService.startForSubline(
        auth.userId,
        subline,
        mode === 'WEAK_SUBLINES' ? TRAINING_MODE_WEAK_SUBLINES : TRAINING_MODE_MARATHON,
      );
      return reply.send({
        scope,
        mode,
        line: {
          id: subline.lineId,
          name: subline.lineName,
          sideToTrain: subline.lineSideToTrain,
          startingFen: subline.lineStartingFen,
          chapterId: subline.chapterId,
          chapterName: subline.chapterName,
          courseId: subline.courseId,
        },
        subline: {
          hash: subline.hash,
          canonicalKeyVersion: subline.canonicalKeyVersion,
          moveText: subline.moveText,
          leafNodeId: subline.leafNodeId,
          moves: subline.moves,
        },
        session,
      });
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  });
}
