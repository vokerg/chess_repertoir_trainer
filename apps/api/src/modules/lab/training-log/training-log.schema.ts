import { z } from 'zod';

export const trainingLogResultSchema = z.enum(['IN_PROGRESS', 'PASSED', 'FAILED', 'ABANDONED']);

export const trainingLogQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(100),
  courseId: z.coerce.number().int().positive().optional(),
  chapterId: z.coerce.number().int().positive().optional(),
  lineId: z.coerce.number().int().positive().optional(),
  result: trainingLogResultSchema.optional(),
});

export type TrainingLogQuery = z.infer<typeof trainingLogQuerySchema>;
