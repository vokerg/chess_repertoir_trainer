import { z } from 'zod';

export const createChapterSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  sortOrder: z.number().optional(),
});

export const updateChapterSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  sortOrder: z.number().optional(),
});