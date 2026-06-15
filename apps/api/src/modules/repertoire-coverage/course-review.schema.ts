import { z } from 'zod';
import {
  importedGameSearchQuerySchema,
  ImportedGameSummaryQuery,
} from '../imported-games/imported-games.schemas';

export const courseReviewQuerySchema = importedGameSearchQuerySchema
  .omit({ sort: true, cursor: true, limit: true })
  .extend({
    from: z.coerce.date(),
    to: z.coerce.date().optional(),
    limit: z.coerce.number().int().min(1).max(500).default(100),
    offset: z.coerce.number().int().min(0).default(0),
    minCoveredPlies: z.coerce.number().int().min(0).max(20).default(2),
  })
  .refine((value) => !value.to || value.to >= value.from, {
    message: 'to must be greater than or equal to from',
    path: ['to'],
  });

export type CourseReviewQuery = z.infer<typeof courseReviewQuerySchema>;

export function courseReviewGameFilters(query: CourseReviewQuery): ImportedGameSummaryQuery {
  const { limit: _limit, offset: _offset, minCoveredPlies: _minCoveredPlies, ...filters } = query;
  return filters;
}
