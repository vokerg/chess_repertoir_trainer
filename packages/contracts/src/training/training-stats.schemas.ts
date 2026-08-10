import { z } from 'zod';

export const trainingStatusValueSchema = z.enum(['NEW', 'WEAK', 'REVIEW', 'STABLE', 'STRONG']);

export const weakSublineStatsSchema = z.object({
  hash: z.string(),
  lineId: z.number().int().positive(),
  lineName: z.string(),
  chapterId: z.number().int().positive(),
  chapterName: z.string(),
  moveText: z.string(),
  recentAttempts: z.number().int().nonnegative(),
  passedCount: z.number().int().nonnegative(),
  failedCount: z.number().int().nonnegative(),
  passRate: z.number().min(0).max(1),
});

export const activeTrainingStatsSchema = z.object({
  scopeType: z.enum(['LINE', 'CHAPTER', 'COURSE']),
  scopeId: z.number().int().positive(),
  activeSublineCount: z.number().int().nonnegative(),
  trainedSublineCount: z.number().int().nonnegative(),
  untrainedSublineCount: z.number().int().nonnegative(),
  weakSublineCount: z.number().int().nonnegative(),
  statsWindowSize: z.number().int().positive(),
  totalAttempts: z.number().int().nonnegative(),
  passedCount: z.number().int().nonnegative(),
  failedCount: z.number().int().nonnegative(),
  passRate: z.number().min(0).max(1),
  failureRate: z.number().min(0).max(1),
  attemptPassRate: z.number().min(0).max(1).nullable(),
  status: trainingStatusValueSchema,
  weakestSublines: z.array(weakSublineStatsSchema),
});

export const sublineTrainingStatusSchema = z.object({
  hash: z.string(),
  canonicalKeyVersion: z.number().int().positive(),
  lineId: z.number().int().positive(),
  lineName: z.string(),
  chapterId: z.number().int().positive(),
  chapterName: z.string(),
  moveText: z.string(),
  leafNodeId: z.number().int().positive(),
  recentAttempts: z.number().int().nonnegative(),
  passedCount: z.number().int().nonnegative(),
  failedCount: z.number().int().nonnegative(),
  passRate: z.number().min(0).max(1).nullable(),
  status: trainingStatusValueSchema,
});

export const trainingStatsSummarySchema = z.object({
  totalCourses: z.number().int().nonnegative(),
  totalLines: z.number().int().nonnegative(),
  totalTrainingSessions: z.number().int().nonnegative(),
  weakestSublines: z.array(weakSublineStatsSchema),
  weakestLines: z.array(z.object({
    id: z.number().int().positive(),
    name: z.string(),
    failureRate: z.number().min(0).max(1),
  })),
});

export type TrainingStatusValue = z.infer<typeof trainingStatusValueSchema>;
export type WeakSublineStatsDto = z.infer<typeof weakSublineStatsSchema>;
export type ActiveTrainingStatsDto = z.infer<typeof activeTrainingStatsSchema>;
export type SublineTrainingStatusDto = z.infer<typeof sublineTrainingStatusSchema>;
export type TrainingStatsSummaryDto = z.infer<typeof trainingStatsSummarySchema>;
