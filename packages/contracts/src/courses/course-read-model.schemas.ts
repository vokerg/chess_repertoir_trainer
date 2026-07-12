import { z } from 'zod';

export const trainingStatsSchema = z.object({
  scopeType: z.enum(['LINE', 'CHAPTER', 'COURSE']), scopeId: z.number().int(), activeSublineCount: z.number().int(),
  trainedSublineCount: z.number().int(), untrainedSublineCount: z.number().int(), weakSublineCount: z.number().int(),
  statsWindowSize: z.number().int(), totalAttempts: z.number().int(), passedCount: z.number().int(), failedCount: z.number().int(),
  passRate: z.number(), failureRate: z.number(), attemptPassRate: z.number().nullable(), status: z.enum(['NEW', 'WEAK', 'REVIEW', 'STABLE', 'STRONG']),
});
export const lineTrainingStatsSchema = trainingStatsSchema.omit({ scopeType: true, scopeId: true, statsWindowSize: true, failureRate: true, attemptPassRate: true });
export const libraryCatalogSchema = z.object({ courses: z.array(z.object({
  id: z.number().int(), name: z.string(), description: z.string().nullable(), stats: trainingStatsSchema,
  chapters: z.array(z.object({ id: z.number().int(), courseId: z.number().int(), name: z.string(), description: z.string().nullable(), sortOrder: z.number().int(),
    lines: z.array(z.object({ id: z.number().int(), chapterId: z.number().int(), name: z.string(), sideToTrain: z.enum(['WHITE', 'BLACK']), startingFen: z.string(), trainingStats: lineTrainingStatsSchema })) })),
})) });
export const availableSublineSchema = z.object({
  hash: z.string(), canonicalKeyVersion: z.number().int(), lineId: z.number().int(), lineName: z.string(), chapterId: z.number().int(), chapterName: z.string(), leafNodeId: z.number().int(), moveText: z.string(),
  moves: z.array(z.object({ nodeId: z.number().int(), moveUci: z.string(), moveSan: z.string(), plyNumber: z.number().int(), sortOrder: z.number().int() })),
});
export const courseOverviewSchema = z.object({
  course: z.object({ id: z.number().int(), name: z.string(), description: z.string().nullable() }),
  chapters: z.array(z.object({ id: z.number().int(), courseId: z.number().int(), name: z.string(), description: z.string().nullable(), sortOrder: z.number().int() })),
  stats: trainingStatsSchema,
  sublines: z.array(availableSublineSchema),
  weakestSublines: z.array(z.object({ hash: z.string(), lineId: z.number().int(), lineName: z.string(), chapterId: z.number().int(), chapterName: z.string(), moveText: z.string(), recentAttempts: z.number().int(), passedCount: z.number().int(), failedCount: z.number().int(), passRate: z.number() })),
});
export type LibraryCatalog = z.infer<typeof libraryCatalogSchema>;
export type CourseOverview = z.infer<typeof courseOverviewSchema>;
