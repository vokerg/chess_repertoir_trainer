import { z } from 'zod';

export const mobileSyncCourseParamsSchema = z.object({
  courseId: z.coerce.number().int().positive(),
});

export const mobileSyncErrorSchema = z.object({
  error: z.string(),
});
