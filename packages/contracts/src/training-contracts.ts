import { z } from 'zod';

export const startTrainingResponseSchema = z.object({
  sessionId: z.number(),
  fen: z.string(),
  expectedMove: z.string().optional(),
  completed: z.boolean(),
});

export const playTrainingMoveRequestSchema = z.object({
  moveUci: z.string().min(4).max(5),
});

export const playTrainingMoveResponseSchema = z.object({
  correct: z.boolean(),
  expectedMove: z.string().optional(),
  fen: z.string(),
  nextExpectedMove: z.string().optional(),
  completed: z.boolean(),
  result: z.string().nullable().optional(),
  accuracy: z.number().nullable(),
  mistakesCount: z.number(),
  correctMoves: z.number(),
  totalExpectedMoves: z.number(),
});

export type StartTrainingResponse = z.infer<typeof startTrainingResponseSchema>;
export type PlayTrainingMoveRequest = z.infer<typeof playTrainingMoveRequestSchema>;
export type PlayTrainingMoveResponse = z.infer<typeof playTrainingMoveResponseSchema>;
