import { z } from 'zod';

const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD').refine(
  (value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  },
  'Invalid date',
);

export const performanceByRatingQuerySchema = z.object({
  from: dateOnlySchema.optional(),
  to: dateOnlySchema.optional(),
}).superRefine((value, context) => {
  if (value.from && value.to && value.from > value.to) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['from'],
      message: 'From date must not be after to date',
    });
  }
});

const wdlSchema = z.object({
  wins: z.number().int().nonnegative(),
  draws: z.number().int().nonnegative(),
  losses: z.number().int().nonnegative(),
});

export const performanceByRatingResponseSchema = z.object({
  range: z.object({
    from: dateOnlySchema,
    to: dateOnlySchema,
  }),
  items: z.array(z.object({
    provider: z.enum(['LICHESS', 'CHESS_COM']),
    speed: z.enum(['blitz', 'rapid']),
    type: z.enum(['LICHESS_BLITZ', 'LICHESS_RAPID', 'CHESS_COM_BLITZ', 'CHESS_COM_RAPID']),
    ratingFrom: z.number().int().nonnegative(),
    ratingTo: z.number().int().nonnegative(),
    games: z.number().int().nonnegative(),
    analysedGames: z.number().int().nonnegative(),
    accuracyGames: z.number().int().nonnegative(),
    wdl: wdlSchema,
    whiteWdl: wdlSchema,
    blackWdl: wdlSchema,
    scorePercent: z.number().min(0).max(100).nullable(),
    openingSuccess: z.number().int().nonnegative(),
    openingTrouble: z.number().int().nonnegative(),
    wasWinningAndLost: z.number().int().nonnegative(),
    wasLosingAndWon: z.number().int().nonnegative(),
    flaggedInWinningPosition: z.number().int().nonnegative(),
    opponentFlaggedInWinningPosition: z.number().int().nonnegative(),
    slowBleedLosses: z.number().int().nonnegative(),
    slowBleedWins: z.number().int().nonnegative(),
    averageAccuracy: z.number().min(0).max(100).nullable(),
  })),
});

export type PerformanceByRatingQuery = z.infer<typeof performanceByRatingQuerySchema>;
export type PerformanceByRatingResponse = z.infer<typeof performanceByRatingResponseSchema>;
