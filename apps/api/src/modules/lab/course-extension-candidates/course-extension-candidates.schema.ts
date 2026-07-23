import { z } from 'zod';
import { importedGameSearchQuerySchema } from '../../imported-games/imported-games.schemas';
import type { ImportedGameSummaryQuery } from '../../imported-games/imported-games.schemas';

const courseExtensionGameFiltersSchema = importedGameSearchQuerySchema.omit({
  sort: true,
  cursor: true,
  limit: true,
});

export const courseExtensionCandidatesQuerySchema = courseExtensionGameFiltersSchema.extend({
  courseId: z.coerce.number().int().positive(),
  minGames: z.coerce.number().int().min(1).max(1000).default(4),
});

export type CourseExtensionCandidatesApiQuery = z.infer<
  typeof courseExtensionCandidatesQuerySchema
>;

export function courseExtensionCandidateGameFilters(
  query: CourseExtensionCandidatesApiQuery,
): ImportedGameSummaryQuery {
  const { courseId: _courseId, minGames: _minGames, ...filters } = query;
  return filters;
}
