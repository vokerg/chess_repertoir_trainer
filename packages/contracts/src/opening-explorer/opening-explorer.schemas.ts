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

export const LICHESS_GAMES_RATING_GROUPS = [
  0,
  1000,
  1200,
  1400,
  1600,
  1800,
  2000,
  2200,
  2500,
] as const;

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

export const LICHESS_GAMES_POPULATION_SPEEDS = [
  'bullet',
  'blitz',
  'rapid',
  'classical',
  'correspondence',
] as const;

export const lichessGamesPopulationSpeedSchema = z.enum(LICHESS_GAMES_POPULATION_SPEEDS);
export type LichessGamesPopulationSpeed = z.infer<typeof lichessGamesPopulationSpeedSchema>;

export const LICHESS_GAMES_SPEED_PRESETS = [
  'ALL',
  'BLITZ_AND_SLOWER',
  'BLITZ',
  'BULLET',
] as const;

export const lichessGamesSpeedPresetSchema = z.enum(LICHESS_GAMES_SPEED_PRESETS);
export type LichessGamesSpeedPreset = z.infer<typeof lichessGamesSpeedPresetSchema>;

export const LICHESS_GAMES_RATING_TARGETS = [
  'ALL',
  'MY_PEERS',
  'MY_PEERS_PLUS_ONE',
  'GROUP',
] as const;

export const lichessGamesRatingTargetSchema = z.enum(LICHESS_GAMES_RATING_TARGETS);
export type LichessGamesRatingTarget = z.infer<typeof lichessGamesRatingTargetSchema>;

const ratingGroupQuerySchema = z.preprocess((value) => {
  if (typeof value !== 'string') return value;
  return Number(value.trim());
}, lichessGamesRatingGroupSchema.optional());

export const lichessGamesExplorerQuerySchema = z.object({
  fen: z.string().min(1).default('startpos'),
  speedPreset: lichessGamesSpeedPresetSchema.default('BLITZ_AND_SLOWER'),
  ratingTarget: lichessGamesRatingTargetSchema.default('MY_PEERS_PLUS_ONE'),
  ratingGroup: ratingGroupQuerySchema,
}).superRefine((query, context) => {
  if (query.ratingTarget === 'GROUP' && query.ratingGroup === undefined) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['ratingGroup'],
      message: 'ratingGroup is required when ratingTarget is GROUP',
    });
  }
  if (query.ratingTarget !== 'GROUP' && query.ratingGroup !== undefined) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['ratingGroup'],
      message: 'ratingGroup is only allowed when ratingTarget is GROUP',
    });
  }
});
export type LichessGamesExplorerQuery = z.infer<typeof lichessGamesExplorerQuerySchema>;

export const lichessGamesPeerEvidencePeriodSchema = z.enum([
  'RECENT_THREE_MONTHS',
  'ALL_HISTORY',
  'GENERIC_FALLBACK',
]);
export type LichessGamesPeerEvidencePeriod = z.infer<typeof lichessGamesPeerEvidencePeriodSchema>;

export const lichessGamesPeerEvidenceProviderSchema = z.enum(['LICHESS', 'CHESS_COM']);
export type LichessGamesPeerEvidenceProvider = z.infer<typeof lichessGamesPeerEvidenceProviderSchema>;

export const lichessGamesPeerEvidenceSpeedSchema = z.enum(['bullet', 'blitz', 'rapid']);
export type LichessGamesPeerEvidenceSpeed = z.infer<typeof lichessGamesPeerEvidenceSpeedSchema>;

export const lichessGamesPeerBandDistributionSchema = z.object({
  group: lichessGamesRatingGroupSchema,
  games: z.number().int().nonnegative(),
});
export type LichessGamesPeerBandDistribution = z.infer<typeof lichessGamesPeerBandDistributionSchema>;

export const lichessGamesPeerContributionSchema = z.object({
  accountId: z.number().int().positive(),
  provider: lichessGamesPeerEvidenceProviderSchema,
  username: z.string().min(1),
  speed: lichessGamesPeerEvidenceSpeedSchema,
  games: z.number().int().positive(),
});
export type LichessGamesPeerContribution = z.infer<typeof lichessGamesPeerContributionSchema>;

export const lichessGamesPeerResolutionSchema = z.object({
  evidencePeriod: lichessGamesPeerEvidencePeriodSchema,
  eligibleGames: z.number().int().nonnegative(),
  selectedGroups: z.array(lichessGamesRatingGroupSchema).min(1),
  distribution: z.array(lichessGamesPeerBandDistributionSchema),
  contributions: z.array(lichessGamesPeerContributionSchema),
  normalizationProfile: z.object({
    id: z.string().min(1),
    version: z.string().min(1),
  }),
  resolverPolicyVersion: z.string().min(1),
});
export type LichessGamesPeerResolution = z.infer<typeof lichessGamesPeerResolutionSchema>;

export const lichessGamesPopulationSchema = z.object({
  requested: z.object({
    speedPreset: lichessGamesSpeedPresetSchema,
    ratingTarget: lichessGamesRatingTargetSchema,
    ratingGroup: lichessGamesRatingGroupSchema.nullable(),
  }),
  effective: z.object({
    speeds: z.array(lichessGamesPopulationSpeedSchema).min(1),
    ratingGroups: z.array(lichessGamesRatingGroupSchema).min(1),
  }),
  peerResolution: lichessGamesPeerResolutionSchema.nullable(),
});
export type LichessGamesPopulation = z.infer<typeof lichessGamesPopulationSchema>;

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
  population: lichessGamesPopulationSchema.optional(),
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