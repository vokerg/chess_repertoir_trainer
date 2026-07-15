import { z } from 'zod';
import { importedGameSearchQuerySchema } from '../imported-games/imported-games.schemas';

const importedGameFiltersSchema = importedGameSearchQuerySchema.omit({
  sort: true,
  cursor: true,
  limit: true,
});

export const openingStrugglesQuerySchema = importedGameFiltersSchema.extend({
  mode: z.enum(['results', 'repeatedMistakes', 'badPositions']).default('results'),
  minGames: z.coerce.number().int().min(1).default(5),
  minLossRate: z.coerce.number().min(0).max(100).default(60),
  minOccurrences: z.coerce.number().int().min(1).default(5),
  minAverageCentipawnLoss: z.coerce.number().min(0).default(60),
  minEvaluatedGames: z.coerce.number().int().min(1).default(5),
  maxAverageUserEvalCp: z.coerce.number().default(-80),
  maxPly: z.coerce.number().int().min(1).max(60).default(20),
  limit: z.coerce.number().int().min(1).max(500).default(100),
});

export type OpeningStrugglesQuery = z.infer<typeof openingStrugglesQuerySchema>;
