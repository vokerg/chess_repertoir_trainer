import { z } from 'zod';

export const openingExplorerSourceSchema = z.enum([
  'LICHESS_MASTERS',
  'LICHESS_GAMES',
]);
export type OpeningExplorerSource = z.infer<typeof openingExplorerSourceSchema>;

export const openingExplorerCacheStatusSchema = z.enum(['HIT', 'REFRESHED', 'STALE']);
export type OpeningExplorerCacheStatus = z.infer<typeof openingExplorerCacheStatusSchema>;

export const openingExplorerQuerySchema = z.object({
  fen: z.string().min(1).default('startpos'),
});
export type OpeningExplorerQuery = z.infer<typeof openingExplorerQuerySchema>;

export const openingExplorerOpeningSchema = z.object({
  eco: z.string().min(1),
  name: z.string().min(1),
});
export type OpeningExplorerOpening = z.infer<typeof openingExplorerOpeningSchema>;

export const openingExplorerCountsSchema = z.object({
  total: z.number().int().nonnegative(),
  whiteWins: z.number().int().nonnegative(),
  draws: z.number().int().nonnegative(),
  blackWins: z.number().int().nonnegative(),
});
export type OpeningExplorerCounts = z.infer<typeof openingExplorerCountsSchema>;

export const openingExplorerPlayerSchema = z.object({
  name: z.string().min(1),
  rating: z.number().int().nonnegative().nullable(),
});
export type OpeningExplorerPlayer = z.infer<typeof openingExplorerPlayerSchema>;

export const openingExplorerGameReferenceSchema = z.object({
  id: z.string().min(1),
  moveUci: z.string().min(4).max(5).nullable(),
  winner: z.enum(['WHITE', 'BLACK']).nullable(),
  white: openingExplorerPlayerSchema,
  black: openingExplorerPlayerSchema,
  year: z.number().int().nonnegative(),
  month: z.string().min(1).nullable(),
});
export type OpeningExplorerGameReference = z.infer<typeof openingExplorerGameReferenceSchema>;

export const openingExplorerMoveSchema = z.object({
  uci: z.string().min(4).max(5),
  san: z.string().min(1),
  averageRating: z.number().int().nonnegative(),
  games: openingExplorerCountsSchema,
  opening: openingExplorerOpeningSchema.nullable(),
  representativeGame: openingExplorerGameReferenceSchema.nullable(),
});
export type OpeningExplorerMove = z.infer<typeof openingExplorerMoveSchema>;

export const openingExplorerSnapshotSchema = z.object({
  opening: openingExplorerOpeningSchema.nullable(),
  games: openingExplorerCountsSchema,
  moves: z.array(openingExplorerMoveSchema),
  topGames: z.array(openingExplorerGameReferenceSchema),
});
export type OpeningExplorerSnapshot = z.infer<typeof openingExplorerSnapshotSchema>;

export const openingExplorerResponseSchema = openingExplorerSnapshotSchema.extend({
  fen: z.string().min(1),
  normalizedFen: z.string().min(1),
  dataset: z.object({
    source: openingExplorerSourceSchema,
    profileVersion: z.number().int().positive(),
    sinceYear: z.number().int().nonnegative(),
    untilYear: z.number().int().nonnegative(),
    movesLimit: z.number().int().positive(),
    topGamesLimit: z.number().int().positive(),
  }),
  cache: z.object({
    status: openingExplorerCacheStatusSchema,
    fetchedAt: z.iso.datetime({ offset: true }),
    expiresAt: z.iso.datetime({ offset: true }),
  }),
});
export type OpeningExplorerResponse = z.infer<typeof openingExplorerResponseSchema>;

export const openingExplorerErrorCodeSchema = z.enum([
  'INVALID_FEN',
  'MASTERS_EXPLORER_UNAVAILABLE',
  'LICHESS_GAMES_EXPLORER_UNAVAILABLE',
]);
export type OpeningExplorerErrorCode = z.infer<typeof openingExplorerErrorCodeSchema>;

export const openingExplorerErrorResponseSchema = z.object({
  error: z.string().min(1),
  code: openingExplorerErrorCodeSchema,
});
export type OpeningExplorerErrorResponse = z.infer<typeof openingExplorerErrorResponseSchema>;
