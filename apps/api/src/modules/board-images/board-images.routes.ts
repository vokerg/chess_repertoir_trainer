import {
  boardImageErrorResponseSchema,
  boardImageQuerySchema,
  boardImageUrlResponseSchema,
} from '@chess-trainer/contracts/board-images';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { BoardImagesService } from './board-images.service';

const boardImagesModule: FastifyPluginAsyncZod = async (app) => {
  app.get('/api/board-image-url', {
    schema: {
      operationId: 'getBoardImageUrl',
      tags: ['Board images'],
      summary: 'Build a Chessvision board image URL',
      querystring: boardImageQuerySchema,
      response: {
        200: boardImageUrlResponseSchema,
        400: boardImageErrorResponseSchema,
      },
    },
  }, async (request, reply) => {
    try {
      return BoardImagesService.buildBoardImageUrl(request.query);
    } catch (error) {
      return reply.code(400).send({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.get('/api/board-image', {
    schema: {
      operationId: 'redirectToBoardImage',
      tags: ['Board images'],
      summary: 'Redirect to a Chessvision board image',
      querystring: boardImageQuerySchema,
      response: {
        302: boardImageUrlResponseSchema.optional(),
        400: boardImageErrorResponseSchema,
      },
    },
  }, async (request, reply) => {
    try {
      const result = BoardImagesService.buildBoardImageUrl(request.query);
      return reply.header('Cache-Control', 'public, max-age=86400').redirect(result.url);
    } catch (error) {
      return reply.code(400).send({ error: error instanceof Error ? error.message : String(error) });
    }
  });
};

export default boardImagesModule;
