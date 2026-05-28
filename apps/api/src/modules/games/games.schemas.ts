import { z } from 'zod';

export const gameProviderSchema = z.enum(['LICHESS', 'CHESS_COM']);
export const gameResultForUserSchema = z.enum(['WIN', 'LOSS', 'DRAW']);
export const gameUserColorSchema = z.enum(['WHITE', 'BLACK']);
export const analyzedFilterSchema = z.enum(['ANY', 'ANALYZED', 'NOT_ANALYZED']);

const optionalBooleanQuerySchema = z.preprocess((value) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
  }
  return value;
}, z.boolean().optional());

export const listImportedGamesQuerySchema = z.object({
  take: z.coerce.number().int().min(1).max(500).optional(),
  skip: z.coerce.number().int().min(0).optional(),
  accountId: z.coerce.number().int().positive().optional(),
  provider: gameProviderSchema.optional(),
  resultForUser: gameResultForUserSchema.optional(),
  userColor: gameUserColorSchema.optional(),
  speedCategory: z.string().trim().min(1).optional(),
  timeControl: z.string().trim().min(1).optional(),
  rated: optionalBooleanQuerySchema,
  analyzed: analyzedFilterSchema.optional(),
  search: z.string().trim().optional(),
}).transform((query) => ({
  ...query,
  analyzed: query.analyzed ?? 'ANY',
  search: query.search || undefined,
}));

export type ListImportedGamesQuery = z.infer<typeof listImportedGamesQuerySchema>;
