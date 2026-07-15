import { z } from 'zod';

export const performanceByRatingQuerySchema = z.object({
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
  minRating: z.coerce.number().int().min(0).max(5000).optional(),
}).superRefine((value, context) => {
  if (value.from && value.to && value.from > value.to) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['from'],
      message: 'From date must not be after to date',
    });
  }
});

export const performanceWdlSchema = z.object({
  wins: z.number().int().nonnegative(),
  draws: z.number().int().nonnegative(),
  losses: z.number().int().nonnegative(),
});

export const performanceReportTypeSchema = z.enum([
  'LICHESS_BLITZ',
  'LICHESS_RAPID',
  'CHESS_COM_BLITZ',
  'CHESS_COM_RAPID',
]);

export const performanceByRatingRowSchema = z.object({
  provider: z.enum(['LICHESS', 'CHESS_COM']),
  speed: z.enum(['blitz', 'rapid']),
  type: performanceReportTypeSchema,
  ratingFrom: z.number().int().nonnegative(),
  ratingTo: z.number().int().nonnegative(),
  games: z.number().int().nonnegative(),
  analysedGames: z.number().int().nonnegative(),
  accuracyGames: z.number().int().nonnegative(),
  wdl: performanceWdlSchema,
  whiteWdl: performanceWdlSchema,
  blackWdl: performanceWdlSchema,
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
});

export const performanceByRatingResponseSchema = z.object({
  range: z.object({
    from: z.iso.date(),
    to: z.iso.date(),
  }),
  items: z.array(performanceByRatingRowSchema),
});

export type PerformanceByRatingQuery = z.infer<typeof performanceByRatingQuerySchema>;
export type PerformanceWdl = z.infer<typeof performanceWdlSchema>;
export type PerformanceReportType = z.infer<typeof performanceReportTypeSchema>;
export type PerformanceByRatingRow = z.infer<typeof performanceByRatingRowSchema>;
export type PerformanceByRatingResponse = z.infer<typeof performanceByRatingResponseSchema>;
