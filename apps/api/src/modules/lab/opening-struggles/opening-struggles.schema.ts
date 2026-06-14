import { z } from 'zod';
import { importedGameSearchQuerySchema } from '../../imported-games/imported-games.schemas';

const importedGameFiltersSchema = importedGameSearchQuerySchema.omit({
  sort: true,
  cursor: true,
  limit: true,
});

export const openingStrugglesQuerySchema = importedGameFiltersSchema.extend({
  minGames: z.coerce.number().int().min(1).default(5),
  maxPly: z.coerce.number().int().min(1).max(60).default(20),
  limit: z.coerce.number().int().min(1).max(500).default(100),
  resultMetric: z.enum(['none', 'lossRate', 'winRate', 'scorePct']).default('lossRate'),
  minLossRate: z.coerce.number().min(0).max(100).default(60),
  maxWinRate: z.coerce.number().min(0).max(100).optional(),
  maxScorePct: z.coerce.number().min(0).max(100).optional(),
  evalMetric: z.enum(['none', 'userEvalCp']).default('none'),
  maxUserEvalCp: z.coerce.number().int().default(-100),
});

export type OpeningStrugglesQuery = z.infer<typeof openingStrugglesQuerySchema>;
