import { z } from 'zod';
import { trainingMarathonSessionSchema } from './training-marathon.schemas';

export const trainingSessionResultSchema = z.enum([
  'IN_PROGRESS',
  'PASSED',
  'FAILED',
  'ABANDONED',
]);

export const lineTrainingStartResponseSchema = trainingMarathonSessionSchema;

export const playedTrainingMoveSchema = z.object({
  moveUci: z.string(),
  moveSan: z.string(),
  isUserMove: z.boolean(),
});

export const trainingMoveResponseSchema = z.object({
  correct: z.boolean(),
  expectedMove: z.string(),
  playedMoves: z.array(playedTrainingMoveSchema),
  fen: z.string(),
  nextExpectedMove: z.string().optional(),
  completed: z.boolean(),
  result: trainingSessionResultSchema.optional(),
  accuracy: z.number().nullable(),
  mistakesCount: z.number().int().nonnegative(),
  correctMoves: z.number().int().nonnegative(),
  totalExpectedMoves: z.number().int().nonnegative(),
});

export const trainingSessionResponseSchema = z.object({
  id: z.number().int().positive(),
  userId: z.number().int().positive(),
  lineId: z.number().int().positive(),
  clientAttemptId: z.string().nullable(),
  source: z.string(),
  sourceDeviceId: z.string().nullable(),
  courseContentRevision: z.number().int().nullable(),
  receivedAt: z.string().datetime({ offset: true }),
  startedAt: z.string().datetime({ offset: true }),
  completedAt: z.string().datetime({ offset: true }).nullable(),
  result: trainingSessionResultSchema,
  mistakesCount: z.number().int().nonnegative(),
  totalExpectedMoves: z.number().int().nonnegative(),
  correctMoves: z.number().int().nonnegative(),
  accuracy: z.number().nullable(),
});

export const completeTrainingResponseSchema = trainingSessionResponseSchema.nullable();

export const trainingHistoryItemSchema = trainingSessionResponseSchema.extend({
  line: z.object({
    id: z.number().int().positive(),
    name: z.string(),
    chapter: z.object({
      id: z.number().int().positive(),
      name: z.string(),
      courseId: z.number().int().positive(),
    }),
  }),
  sublineAttempt: z.object({
    sublineHash: z.string().length(64),
    sublineKeyVersion: z.number().int().positive(),
    moveText: z.string().nullable(),
    trainingMode: z.string(),
  }).nullable(),
});

export const trainingHistoryResponseSchema = z.array(trainingHistoryItemSchema);

export const trainingReviewItemSchema = z.object({
  id: z.number().int().positive(),
  moveNodeId: z.number().int().positive().nullable(),
  fenBefore: z.string(),
  expectedMoveUci: z.string().nullable(),
  playedMoveUci: z.string().nullable(),
  moveSan: z.string().nullable(),
  comment: z.string().nullable(),
  annotation: z.string().nullable(),
  branchLabel: z.string().nullable(),
  createdAt: z.string().datetime({ offset: true }),
});

export const trainingReviewResponseSchema = trainingSessionResponseSchema.extend({
  mistakes: z.array(trainingReviewItemSchema),
});

export type LineTrainingSessionDto = z.infer<typeof lineTrainingStartResponseSchema>;
export type PlayedTrainingMoveDto = z.infer<typeof playedTrainingMoveSchema>;
export type TrainingMoveResponseDto = z.infer<typeof trainingMoveResponseSchema>;
export type TrainingSessionResponseDto = z.infer<typeof trainingSessionResponseSchema>;
export type CompleteTrainingResponseDto = z.infer<typeof completeTrainingResponseSchema>;
export type TrainingHistoryItemDto = z.infer<typeof trainingHistoryItemSchema>;
export type TrainingHistoryResponseDto = z.infer<typeof trainingHistoryResponseSchema>;
export type TrainingReviewItemDto = z.infer<typeof trainingReviewItemSchema>;
export type TrainingReviewResponseDto = z.infer<typeof trainingReviewResponseSchema>;
