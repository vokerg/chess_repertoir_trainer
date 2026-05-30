import { FastifyInstance } from 'fastify';
import { LabService } from './lab.service';

function parseLimit(value: unknown) {
  const limit = Number(value ?? 50);
  if (!Number.isInteger(limit)) return 50;
  return Math.min(Math.max(limit, 1), 200);
}

function parseBoolean(value: unknown) {
  return value === true || value === 'true';
}

export default async function labModule(app: FastifyInstance) {
  app.get('/api/lab/top-opponents', async (request) => {
    const query = request.query as { limit?: string };
    return LabService.topOpponents(parseLimit(query.limit));
  });

  app.get('/api/lab/monthly-games', async (request) => {
    const query = request.query as { excludeBullet?: string };
    return LabService.monthlyGames({ excludeBullet: parseBoolean(query.excludeBullet) });
  });
}
