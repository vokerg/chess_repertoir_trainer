import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { ImportExportService } from '../services/importExportService';
import { z } from 'zod';
import { requireAuth } from '../auth/request-auth';

const importSchema = z.object({
  version: z.number(),
  courses: z.array(z.any()),
});

export default async function importExportRoutes(app: FastifyInstance) {
  // Export data to JSON
  app.get('/api/export/json', async (request: FastifyRequest, reply: FastifyReply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const data = await ImportExportService.exportAll(auth.userId);
    reply.send(data);
  });
  // Import data from JSON
  app.post('/api/import/json', async (request: FastifyRequest, reply: FastifyReply) => {
    const auth = requireAuth(request, reply);
    if (!auth) return;
    const body = request.body;
    const result = importSchema.safeParse(body);
    if (!result.success) {
      return reply.status(400).send({ error: result.error.errors });
    }
    try {
      await ImportExportService.importAll(auth.userId, body);
      reply.send({ imported: true });
    } catch (err: any) {
      reply.status(400).send({ error: err.message });
    }
  });
}
