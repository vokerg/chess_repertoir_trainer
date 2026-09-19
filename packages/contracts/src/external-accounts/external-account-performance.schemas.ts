import { z } from 'zod';

export const accountPerformanceRatingSpeedSchema = z.enum(['bullet', 'blitz', 'rapid']);

export const accountPerformanceGameHighlightSchema = z.object({
  gameId: z.number().int(),
  endedAt: z.iso.datetime({ offset: true }),
  speed: accountPerformanceRatingSpeedSchema,
  userRating: z.number().int().nullable(),
  opponentRating: z.number().int().nullable(),
  opponentUsername: z.string().nullable(),
  providerUrl: z.string().nullable(),
});

export const accountPerformanceRecentGameSchema = accountPerformanceGameHighlightSchema.extend({
  resultForUser: z.enum(['WIN', 'DRAW', 'LOSS']),
  timeControl: z.string(),
});

export const accountPerformanceTimeControlWdlSchema = z.object({
  timeControl: z.string(),
  gamesCount: z.number().int(),
  wins: z.number().int(),
  draws: z.number().int(),
  losses: z.number().int(),
  scorePercent: z.number().nullable(),
});

export const accountPerformanceStatsResponseSchema = z.object({
  account: z.object({
    id: z.number().int(),
    provider: z.enum(['LICHESS', 'CHESS_COM']),
    username: z.string(),
    displayName: z.string().nullable().optional(),
  }),
  range: z.object({ from: z.string().optional(), to: z.string().optional() }),
  speeds: z.array(accountPerformanceRatingSpeedSchema),
  gamesCount: z.number().int(),
  wdl: z.object({ wins: z.number().int(), draws: z.number().int(), losses: z.number().int() }),
  averageOpponentRating: z.object({
    overall: z.number().int().nullable(),
    wins: z.number().int().nullable(),
    draws: z.number().int().nullable(),
    losses: z.number().int().nullable(),
  }),
  timeControlWdl: z.array(accountPerformanceTimeControlWdlSchema),
  recentGames: z.array(accountPerformanceRecentGameSchema),
  bestVictories: z.array(accountPerformanceGameHighlightSchema),
  mostEmbarrassingDefeats: z.array(accountPerformanceGameHighlightSchema),
  bestVictory: accountPerformanceGameHighlightSchema.nullable(),
  mostEmbarrassingDefeat: accountPerformanceGameHighlightSchema.nullable(),
});

export type AccountPerformanceRatingSpeed = z.infer<typeof accountPerformanceRatingSpeedSchema>;
export type AccountPerformanceGameHighlight = z.infer<
  typeof accountPerformanceGameHighlightSchema
>;
export type AccountPerformanceRecentGame = z.infer<typeof accountPerformanceRecentGameSchema>;
export type AccountPerformanceTimeControlWdl = z.infer<
  typeof accountPerformanceTimeControlWdlSchema
>;
export type AccountPerformanceStatsResponse = z.infer<
  typeof accountPerformanceStatsResponseSchema
>;
