import { z } from 'zod';

export const trainingMarathonScopeSchema = z.object({
  type: z.enum(['CHAPTER', 'COURSE']),
  id: z.coerce.number().int().positive(),
});

export const trainingMarathonModeSchema = z.enum([
  'ALL',
  'WEAK_SUBLINES',
  'UNTRAINED_SUBLINES',
  'MIXED_WEAK_UNTRAINED',
  'DAILY_REVIEW',
]);

export const trainingMarathonRequestSchema = z.object({
  scope: trainingMarathonScopeSchema.optional(),
  mode: trainingMarathonModeSchema.optional().default('ALL'),
  lineIds: z.array(z.coerce.number().int().positive()).optional().default([]),
  sublineHashes: z.array(z.string().length(64)).optional().default([]),
  recentSublineHashes: z.array(z.string().length(64)).optional().default([]),
  recentLineIds: z.array(z.coerce.number().int().positive()).optional().default([]),
});

export const trainingMarathonRunResponseSchema = z.object({
  runId: z.string().uuid(),
});

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

export const trainingMarathonItemResponseSchema = z.object({
  state: z.literal('ITEM'),
  itemKind: z.enum(['STANDARD', 'SCHEDULED_REVIEW', 'REINFORCEMENT_RETRY']),
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

export const trainingMarathonCompletedResponseSchema = z.object({
  state: z.literal('COMPLETED'),
  mode: z.literal('DAILY_REVIEW'),
  scope: trainingMarathonScopeSchema.nullable(),
  completedCount: z.number().int().nonnegative(),
});

export const trainingMarathonNextResponseSchema = z.discriminatedUnion('state', [
  trainingMarathonItemResponseSchema,
  trainingMarathonCompletedResponseSchema,
]);

export type TrainingMarathonScopeDto = z.infer<typeof trainingMarathonScopeSchema>;
export type TrainingMarathonModeDto = z.infer<typeof trainingMarathonModeSchema>;
export type TrainingMarathonRequestDto = z.infer<typeof trainingMarathonRequestSchema>;
export type TrainingMarathonRunResponseDto = z.infer<typeof trainingMarathonRunResponseSchema>;
export type TrainingMarathonMoveDto = z.infer<typeof trainingMarathonMoveSchema>;
export type TrainingMarathonSessionDto = z.infer<typeof trainingMarathonSessionSchema>;
export type TrainingMarathonItemResponseDto = z.infer<typeof trainingMarathonItemResponseSchema>;
export type TrainingMarathonCompletedResponseDto = z.infer<
  typeof trainingMarathonCompletedResponseSchema
>;
export type TrainingMarathonNextResponseDto = z.infer<typeof trainingMarathonNextResponseSchema>;
