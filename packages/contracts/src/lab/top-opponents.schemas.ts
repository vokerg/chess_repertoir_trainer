import { z } from 'zod';

export const topOpponentSchema = z.object({
  opponentUsername: z.string().min(1),
  games: z.number().int().nonnegative(),
});

export const topOpponentsResponseSchema = z.object({
  items: z.array(topOpponentSchema),
});

export type TopOpponent = z.infer<typeof topOpponentSchema>;
export type TopOpponentsResponse = z.infer<typeof topOpponentsResponseSchema>;
