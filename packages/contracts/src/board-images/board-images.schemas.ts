import { z } from 'zod';

export const boardImagePovSchema = z.enum(['white', 'black']);
export const boardImageTurnSchema = z.enum(['none', 'auto', 'white', 'black']);

export const boardImageQuerySchema = z.object({
  fen: z.string().min(1),
  pov: boardImagePovSchema.default('white'),
  turn: boardImageTurnSchema.default('none'),
});

export const boardImageUrlResponseSchema = z.object({
  url: z.url(),
  fen: z.string(),
  normalizedFen: z.string(),
  pov: boardImagePovSchema,
  turn: z.enum(['none', 'white', 'black']),
});

export const boardImageErrorResponseSchema = z.object({ error: z.unknown() });

export type BoardImagePov = z.output<typeof boardImagePovSchema>;
export type BoardImageTurn = z.output<typeof boardImageTurnSchema>;
export type BoardImageQuery = z.output<typeof boardImageQuerySchema>;
export type BoardImageUrlResponse = z.output<typeof boardImageUrlResponseSchema>;
