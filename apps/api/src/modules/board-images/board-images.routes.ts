import { FastifyInstance } from 'fastify';
import { registerOpenApiRoute, registerOpenApiSchemas } from '../../openapi/route-registry';
import {
  boardImagesOpenApiSchemas,
  getBoardImageOpenApiOperation,
  getBoardImageUrlOpenApiOperation,
} from './board-images.openapi';
import { boardImageQuerySchema } from './board-images.schemas';
import { BoardImagesService } from './board-images.service';

function parseBoardImageRequest(query: unknown) {
  const parsed = boardImageQuerySchema.safeParse(query ?? {});
  if (!parsed.success) return { error: parsed.error.errors } as const;

  try {
    return { result: BoardImagesService.buildBoardImageUrl(parsed.data) } as const;
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) } as const;
  }
}

export default async function boardImagesModule(app: FastifyInstance) {
  registerOpenApiSchemas(boardImagesOpenApiSchemas);

  registerOpenApiRoute(app, {
    method: 'get',
    url: '/api/board-image-url',
    operation: getBoardImageUrlOpenApiOperation,
    handler: async (request, reply) => {
      const parsed = parseBoardImageRequest(request.query);
      if ('error' in parsed) {
        reply.code(400);
        return { error: parsed.error };
      }
      return parsed.result;
    },
  });

  registerOpenApiRoute(app, {
    method: 'get',
    url: '/api/board-image',
    operation: getBoardImageOpenApiOperation,
    handler: async (request, reply) => {
      const parsed = parseBoardImageRequest(request.query);
      if ('error' in parsed) {
        reply.code(400);
        return { error: parsed.error };
      }
      return reply
        .header('Cache-Control', 'public, max-age=86400')
        .redirect(parsed.result.url);
    },
  });
}
