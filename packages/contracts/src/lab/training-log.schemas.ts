import { z } from 'zod';
import { trainingSessionResultSchema } from '../training/training-session.schemas';

export const trainingLogResultSchema = trainingSessionResultSchema;
export type TrainingLogResult = z.infer<typeof trainingLogResultSchema>;

export const trainingLogItemSchema = z.object({
  id: z.number().int(),
  startedAt: z.iso.datetime({ offset: true }),
  completedAt: z.iso.datetime({ offset: true }).nullable(),
  result: trainingLogResultSchema,
  courseId: z.number().int(),
  courseName: z.string(),
  chapterId: z.number().int(),
  chapterName: z.string(),
  lineId: z.number().int(),
  lineName: z.string(),
  sequence: z.string().nullable(),
  isActiveSubline: z.boolean(),
  accuracy: z.number().nullable(),
  mistakesCount: z.number().int().nonnegative(),
});
export type TrainingLogItem = z.infer<typeof trainingLogItemSchema>;

export const trainingLogResponseSchema = z.object({
  items: z.array(trainingLogItemSchema),
});
export type TrainingLogResponse = z.infer<typeof trainingLogResponseSchema>;
