import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { ImportExportService } from '../services/importExportService';
import { z } from 'zod';

const importSchema = z.object({
  version: z.number(),
  courses: z.array(z.any()),
});

export default async function importExportRoutes(app: FastifyInstance) {
  // Export data to JSON
  app.get('/api/export/json', async (request: FastifyRequest, reply: FastifyReply) => {
    const data = await ImportExportService.exportAll();
    reply.send(data);
  });
  // Import data from JSON
  app.post('/api/import/json', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body;
    const result = importSchema.safeParse(body);
    if (!result.success) {
      return reply.status(400).send({ error: result.error.errors });
    }
    try {
      await ImportExportService.importAll(body);
      reply.send({ imported: true });
    } catch (err: any) {
      reply.status(400).send({ error: err.message });
    }
  });
}