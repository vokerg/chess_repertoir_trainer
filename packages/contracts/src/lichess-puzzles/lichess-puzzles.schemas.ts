import { z } from 'zod';

const uciMoveSchema = z.string().regex(/^[a-h][1-8][a-h][1-8][qrbn]?$/);

export const lichessPuzzleDifficultySchema = z.enum([
  'easiest',
  'easier',
  'normal',
  'harder',
  'hardest',
]);

export const lichessPuzzleRoundSourceSchema = z.enum([
  'FRESH',
  'LICHESS_REPLAY',
  'LOCAL_REPEAT',
]);

export const lichessPuzzleRoundStatusSchema = z.enum([
  'IN_PROGRESS',
  'COMPLETED',
  'ABANDONED',
]);

export const lichessPuzzleRoundOutcomeSchema = z.enum([
  'WIN',
  'LOSS',
  'ABANDONED',
]);

export const lichessPuzzleUpstreamStatusSchema = z.enum([
  'NOT_REQUIRED',
  'PENDING',
  'SYNCING',
  'SYNCED',
  'FAILED',
]);

export const lichessPuzzleSideSchema = z.enum(['WHITE', 'BLACK']);

export const lichessPuzzleRoundIdParamsSchema = z.object({
  roundId: z.coerce.number().int().positive(),
});

export const createLichessPuzzleRoundBodySchema = z.object({
  source: z.literal('FRESH').default('FRESH'),
  angle: z.string().trim().min(1).max(80).regex(/^[A-Za-z0-9_-]+$/).default('mix'),
  difficulty: lichessPuzzleDifficultySchema.default('normal'),
  rated: z.boolean().default(true),
});

export const submitLichessPuzzleMoveBodySchema = z.object({
  moveUci: uciMoveSchema,
});

export const lichessPuzzlePublicPuzzleSchema = z.object({
  id: z.string(),
  rating: z.number().int(),
  themes: z.array(z.string()),
  startFen: z.string(),
  lastMoveUci: uciMoveSchema,
  sideToMove: lichessPuzzleSideSchema,
  solutionPlies: z.number().int().positive(),
});

export const lichessPuzzleRoundSchema = z.object({
  id: z.number().int().positive(),
  source: lichessPuzzleRoundSourceSchema,
  angle: z.string(),
  difficulty: lichessPuzzleDifficultySchema.nullable(),
  ratedRequested: z.boolean(),
  status: lichessPuzzleRoundStatusSchema,
  outcome: lichessPuzzleRoundOutcomeSchema.nullable(),
  currentFen: z.string(),
  lastMoveUci: uciMoveSchema,
  currentStep: z.number().int().nonnegative(),
  firstWrongAt: z.string().datetime().nullable(),
  learningCompletedAt: z.string().datetime().nullable(),
  upstreamStatus: lichessPuzzleUpstreamStatusSchema,
  ratingDiff: z.number().int().nullable(),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
  puzzle: lichessPuzzlePublicPuzzleSchema,
});

export const createLichessPuzzleRoundResponseSchema = lichessPuzzleRoundSchema;

export const submitLichessPuzzleMoveResponseSchema = z.object({
  correct: z.boolean(),
  forcedMoveUci: uciMoveSchema.nullable(),
  round: lichessPuzzleRoundSchema,
});

export const lichessPuzzleRoundActionResponseSchema = lichessPuzzleRoundSchema;

export const lichessPuzzleErrorResponseSchema = z.object({
  error: z.string(),
  code: z.string().optional(),
});

export type LichessPuzzleDifficulty = z.infer<typeof lichessPuzzleDifficultySchema>;
export type LichessPuzzleRoundSource = z.infer<typeof lichessPuzzleRoundSourceSchema>;
export type LichessPuzzleRoundStatus = z.infer<typeof lichessPuzzleRoundStatusSchema>;
export type LichessPuzzleRoundOutcome = z.infer<typeof lichessPuzzleRoundOutcomeSchema>;
export type LichessPuzzleUpstreamStatus = z.infer<typeof lichessPuzzleUpstreamStatusSchema>;
export type CreateLichessPuzzleRoundBody = z.infer<typeof createLichessPuzzleRoundBodySchema>;
export type SubmitLichessPuzzleMoveBody = z.infer<typeof submitLichessPuzzleMoveBodySchema>;
export type LichessPuzzleRound = z.infer<typeof lichessPuzzleRoundSchema>;
export type SubmitLichessPuzzleMoveResponse = z.infer<typeof submitLichessPuzzleMoveResponseSchema>;
