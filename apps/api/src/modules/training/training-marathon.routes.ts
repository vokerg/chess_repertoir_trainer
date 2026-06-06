import prisma from '../../prisma';
import { TrainingService } from '../../services/trainingService';

export default async function trainingMarathonModule(app: any) {
  app.post('/api/training-marathons/next', async (request: any, reply: any) => {
    const body = request.body ?? {};
    const scope = body.scope;
    if (!scope || !['CHAPTER', 'COURSE'].includes(scope.type) || !Number.isInteger(scope.id)) {
      return reply.status(400).send({ error: 'Invalid marathon scope' });
    }
    const where = scope.type === 'COURSE' ? { chapter: { courseId: scope.id } } : { chapterId: scope.id };
    const lines = await prisma.line.findMany({ where: { ...where, moves: { some: {} } }, select: { id: true, name: true, chapterId: true, sideToTrain: true } });
    if (lines.length === 0) return reply.status(404).send({ error: 'No trainable lines in this scope' });
    const recent = new Set(body.recentLineIds ?? []);
    const pool = lines.filter((line) => !recent.has(line.id));
    const choices =