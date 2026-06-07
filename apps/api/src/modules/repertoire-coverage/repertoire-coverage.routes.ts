import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { LineCoverageService } from './repertoire-coverage.service';

const paramsSchema = z.object({ lineId: z.coerce.number().int().positive() });
const querySchema = z.object({
  status: z.enum(LineCoverageService.statuses as [string, ...string[]]).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

export default async function repertoireCoverageModule(app: FastifyInstance) {
  app.get('/api/lines/:lineId/coverage', async (request, reply) => {
    const params = paramsSchema.safeParse(request.params);
    const query = querySchema.safeParse(request.query);
    if (!params.success) return reply.status(400).send({ error: params.error.errors });
    if (!query.success) return reply.status(400).send({ error: query.error.errors });

    try {
      const coverage = await LineCoverageService.calculate(params.data.lineId, query.data as any);
      if (!coverage) return reply.status(404).send({ message: 'Line not found' });
      return coverage;
    } catch (err: any) {
      return reply.status(400).send({ error: err?.message ?? String(err) });
    }
  });
}
