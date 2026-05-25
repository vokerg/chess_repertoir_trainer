import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { StatsService } from '../../services/statsService';

export default async function statsModule(app: FastifyInstance) {
  app.get('/api/stats/summary', async (_request: FastifyRequest, reply: FastifyReply) => {
    const summary = await StatsService.summary();
    reply.send(summary);
  });

  app.get('/api/lines/:lineId/stats', async (request: FastifyRequest, reply: FastifyReply) => {
    const { lineId } = request.params as { lineId: string };
    const stats = await StatsService.lineStats(parseInt(lineId, 10));
    if (!stats) {
      reply.status(404).send({ error: 'Line not found' });
    } else {
      reply.send(stats);
    }
  });

  app.get('/api/courses/:courseId/stats', async (request: FastifyRequest, reply: FastifyReply) => {
    const { courseId } = request.params as { courseId: string };
    const stats = await StatsService.courseStats(parseInt(courseId, 10));
    reply.send(stats);
  });
}
