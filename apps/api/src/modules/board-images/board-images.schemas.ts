import { z } from 'zod';

export const boardImagePovSchema = z.enum(['white', 'black']);
export const boardImageTurnSchema = z.enum(['none', 'auto', 'white', 'black']);

export const boardImageQuerySchema = z.object({
  fen: z.string().min(1),
  pov: boardImagePovSchema.default('white'),
  turn: boardImageTurnSchema.default('none'),
});

export type BoardImageInput = z.infer<typeof boardImageQuerySchema>;
