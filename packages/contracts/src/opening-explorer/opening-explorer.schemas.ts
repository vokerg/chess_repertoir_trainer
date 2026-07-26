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

export const lichessGamesRatingGroupSchema = z.union([
  z.literal(0),
  z.literal(1000),
  z.literal(1200),
  z.literal(1400),
  z.literal(1600),
  z.literal(1800),
  z.literal(2000),
  z.literal(2200),
  z.literal(2500),
]);
export type LichessGamesRatingGroup = z.infer<typeof lichessGamesRatingGroupSchema>;

export const lichessGamesSpeedSchema = z.enum([
  'ultraBullet',
  'bullet',
  'blitz',
  'rapid',
  'classical',
  'correspondence',
]);
export type LichessGamesSpeed = z.infer<typeof lichessGamesSpeedSchema>;

function csvArray<T extends z.ZodType>(itemSchema: T) {
  return z.preprocess((value) => {
    if (typeof value !== 'string') return value;
    return value.split(',').map((item) => item.trim()).filter(Boolean);
  }, z.array(itemSchema).min(1).optional());
}

const ratingCsv = z.preprocess((value) => {
  if (typeof value !== 'string') return value;
  return value.split(',').map((item) => Number(item.trim()));
}, z.array(lichessGamesRatingGroupSchema).min(1).optional());

const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);

export const lichessGamesExplorerQuerySchema = z.object({
  fen: z.string().min(1).default('startpos'),
  since: monthSchema.optional(),
  until: monthSchema.optional(),
  ratings: ratingCsv,
  speeds: csvArray(lichessGamesSpeedSchema),
}).refine(
  ({ since, until }) => !since || !until || since <= until,
  { message: 'since must not be after until', path: ['since'] },
);
export type LichessGamesExplorerQuery = z.infer<typeof lichessGamesExplorerQuerySchema>;

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
    topGamesLimit: z.number().int().nonnegative(),
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
