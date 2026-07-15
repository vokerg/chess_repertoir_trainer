import { z } from 'zod';

export const mastersExplorerSourceSchema = z.literal('LICHESS_MASTERS');
export type MastersExplorerSource = z.infer<typeof mastersExplorerSourceSchema>;

export const mastersExplorerCacheStatusSchema = z.enum(['HIT', 'REFRESHED', 'STALE']);
export type MastersExplorerCacheStatus = z.infer<typeof mastersExplorerCacheStatusSchema>;

export const mastersExplorerQuerySchema = z.object({
  fen: z.string().min(1).default('startpos'),
});
export type MastersExplorerQuery = z.infer<typeof mastersExplorerQuerySchema>;

export const mastersExplorerOpeningSchema = z.object({
  eco: z.string().min(1),
  name: z.string().min(1),
});
export type MastersExplorerOpening = z.infer<typeof mastersExplorerOpeningSchema>;

export const mastersExplorerCountsSchema = z.object({
  total: z.number().int().nonnegative(),
  whiteWins: z.number().int().nonnegative(),
  draws: z.number().int().nonnegative(),
  blackWins: z.number().int().nonnegative(),
});
export type MastersExplorerCounts = z.infer<typeof mastersExplorerCountsSchema>;

export const mastersExplorerPlayerSchema = z.object({
  name: z.string().min(1),
  rating: z.number().int().nonnegative().nullable(),
});
export type MastersExplorerPlayer = z.infer<typeof mastersExplorerPlayerSchema>;

export const mastersExplorerGameReferenceSchema = z.object({
  id: z.string().min(1),
  moveUci: z.string().min(4).max(5).nullable(),
  winner: z.enum(['WHITE', 'BLACK']).nullable(),
  white: mastersExplorerPlayerSchema,
  black: mastersExplorerPlayerSchema,
  year: z.number().int().nonnegative(),
  month: z.string().min(1).nullable(),
});
export type MastersExplorerGameReference = z.infer<typeof mastersExplorerGameReferenceSchema>;

export const mastersExplorerMoveSchema = z.object({
  uci: z.string().min(4).max(5),
  san: z.string().min(1),
  averageRating: z.number().int().nonnegative(),
  games: mastersExplorerCountsSchema,
  opening: mastersExplorerOpeningSchema.nullable(),
  representativeGame: mastersExplorerGameReferenceSchema.nullable(),
});
export type MastersExplorerMove = z.infer<typeof mastersExplorerMoveSchema>;

export const mastersExplorerSnapshotSchema = z.object({
  opening: mastersExplorerOpeningSchema.nullable(),
  games: mastersExplorerCountsSchema,
  moves: z.array(mastersExplorerMoveSchema),
  topGames: z.array(mastersExplorerGameReferenceSchema),
});
export type MastersExplorerSnapshot = z.infer<typeof mastersExplorerSnapshotSchema>;

export const mastersExplorerResponseSchema = mastersExplorerSnapshotSchema.extend({
  fen: z.string().min(1),
  normalizedFen: z.string().min(1),
  dataset: z.object({
    source: mastersExplorerSourceSchema,
    profileVersion: z.number().int().positive(),
    sinceYear: z.number().int().nonnegative(),
    untilYear: z.number().int().nonnegative(),
    movesLimit: z.number().int().positive(),
    topGamesLimit: z.number().int().positive(),
  }),
  cache: z.object({
    status: mastersExplorerCacheStatusSchema,
    fetchedAt: z.iso.datetime({ offset: true }),
    expiresAt: z.iso.datetime({ offset: true }),
  }),
});
export type MastersExplorerResponse = z.infer<typeof mastersExplorerResponseSchema>;

export const mastersExplorerErrorCodeSchema = z.enum([
  'INVALID_FEN',
  'MASTERS_EXPLORER_UNAVAILABLE',
]);
export type MastersExplorerErrorCode = z.infer<typeof mastersExplorerErrorCodeSchema>;

export const mastersExplorerErrorResponseSchema = z.object({
  error: z.string().min(1),
  code: mastersExplorerErrorCodeSchema,
});
export type MastersExplorerErrorResponse = z.infer<typeof mastersExplorerErrorResponseSchema>;
