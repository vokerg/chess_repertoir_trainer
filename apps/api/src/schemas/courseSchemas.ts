import { z } from 'zod';

export const createCourseSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
});

export const updateCourseSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
});