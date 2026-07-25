import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { ratingNormalizationProfileSchema } from '@chess-trainer/contracts/rating-normalization';
import { getDefaultRatingNormalizationProfile } from './rating-normalization.service';

const ratingNormalizationModule: FastifyPluginAsyncZod = async (app) => {
  app.get('/api/rating-normalization/default', {
    schema: {
      operationId: 'getDefaultRatingNormalizationProfile',
      tags: ['Rating normalization'],
      summary: 'Get the active cross-pool rating normalization profile',
      description: 'Returns the versioned online rating grade table. FIDE Standard is reference-only.',
      response: {
        200: ratingNormalizationProfileSchema,
      },
    },
  }, async () => getDefaultRatingNormalizationProfile());
};

export default ratingNormalizationModule;
