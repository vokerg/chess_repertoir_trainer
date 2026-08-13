import { z } from 'zod';

const monthlyGamesDateTimeSchema = z.union([
  z.date().transform((value) => value.toISOString()),
  z.iso.datetime({ offset: true }),
]);

export const monthlyGamesRowSchema = z.object({
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
  monthStart: monthlyGamesDateTimeSchema,
  games: z.number().int().nonnegative(),
  wins: z.number().int().nonnegative(),
  draws: z.number().int().nonnegative(),
  losses: z.number().int().nonnegative(),
  scorePct: z.number().min(0).max(100).nullable(),
  avgOpponentRatingLichess: z.number().nonnegative().nullable(),
  avgOpponentRatingChessCom: z.number().nonnegative().nullable(),
  highestRatedLichess: z.number().int().nonnegative().nullable(),
  highestRatedChessCom: z.number().int().nonnegative().nullable(),
});
export type MonthlyGamesRow = z.infer<typeof monthlyGamesRowSchema>;

export const monthlyGamesResponseSchema = z.object({
  excludeBullet: z.boolean(),
  items: z.array(monthlyGamesRowSchema),
});
export type MonthlyGamesResponse = z.infer<typeof monthlyGamesResponseSchema>;
