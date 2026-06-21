import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { StatsService } from '../../services/statsService';
import { requireAuth } from '../../auth/request-auth';

export default async function statsModule(app: FastifyInstance) {
  app.get('/api/stats/summary', async (request: FastifyRequest, reply: FastifyReply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const summary = await StatsService.summary(auth.userId);
    reply.send(summary);
  });

  app.get('/api/lines/:lineId/stats', async (request: FastifyRequest, reply: FastifyReply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const { lineId } = request.params as { lineId: string };
    const stats = await StatsService.lineStats(auth.userId, parseInt(lineId, 10));
    if (!stats) {
      reply.status(404).send({ error: 'Line not found' });
    } else {
      reply.send(stats);
    }
  });

  app.get('/api/lines/:lineId/sublines/status', async (request: FastifyRequest, reply: FastifyReply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const { lineId } = request.params as { lineId: string };
    const statuses = await StatsService.lineSublineStatus(auth.userId, parseInt(lineId, 10));
    if (!statuses) {
      reply.status(404).send({ error: 'Line not found' });
    } else {
      reply.send(statuses);
    }
  });

  app.get('/api/courses/:courseId/stats', async (request: FastifyRequest, reply: FastifyReply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const { courseId } = request.params as { courseId: string };
    const stats = await StatsService.courseStats(auth.userId, parseInt(courseId, 10));
    if (!stats) return reply.status(404).send({ error: 'Course not found' });
    reply.send(stats);
  });

  app.get('/api/chapters/:chapterId/stats', async (request: FastifyRequest, reply: FastifyReply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const { chapterId } = request.params as { chapterId: string };
    const stats = await StatsService.chapterStats(auth.userId, parseInt(chapterId, 10));
    if (!stats) return reply.status(404).send({ error: 'Chapter not found' });
    reply.send(stats);
  });
}
