import { z } from 'zod';

export const trainingMarathonScopeSchema = z.object({
  type: z.enum(['CHAPTER', 'COURSE']),
  id: z.number().int().positive(),
});

export const trainingMarathonModeSchema = z.enum([
  'ALL',
  'WEAK_SUBLINES',
  'UNTRAINED_SUBLINES',
  'MIXED_WEAK_UNTRAINED',
]);

export const trainingMarathonMoveSchema = z.object({
  nodeId: z.number().int().positive(),
  moveUci: z.string(),
  moveSan: z.string(),
  plyNumber: z.number().int(),
  sortOrder: z.number().int(),
});

export const trainingMarathonSessionSchema = z.object({
  sessionId: z.number().int().positive(),
  fen: z.string(),
  expectedMove: z.string().optional(),
  completed: z.boolean(),
  sublineHash: z.string().length(64),
  sublineMoveText: z.string(),
});

export const trainingMarathonNextResponseSchema = z.object({
  scope: trainingMarathonScopeSchema.nullable(),
  mode: trainingMarathonModeSchema,
  line: z.object({
    id: z.number().int().positive(),
    name: z.string(),
    sideToTrain: z.enum(['WHITE', 'BLACK']),
    startingFen: z.string(),
    chapterId: z.number().int().positive(),
    chapterName: z.string(),
    courseId: z.number().int().positive(),
  }),
  subline: z.object({
    hash: z.string().length(64),
    canonicalKeyVersion: z.number().int().positive(),
    moveText: z.string(),
    leafNodeId: z.number().int().positive(),
    moves: z.array(trainingMarathonMoveSchema),
  }),
  session: trainingMarathonSessionSchema,
});

export type TrainingMarathonScopeDto = z.infer<typeof trainingMarathonScopeSchema>;
export type TrainingMarathonModeDto = z.infer<typeof trainingMarathonModeSchema>;
export type TrainingMarathonMoveDto = z.infer<typeof trainingMarathonMoveSchema>;
export type TrainingMarathonSessionDto = z.infer<typeof trainingMarathonSessionSchema>;
export type TrainingMarathonNextResponseDto = z.infer<typeof trainingMarathonNextResponseSchema>;
