import { z } from 'zod';

export const createLineSchema = z.object({
  name: z.string().min(1),
  sideToTrain: z.enum(['WHITE', 'BLACK']),
  startingFen: z.string().min(1),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional().nullable(),
});

export const updateLineSchema = z.object({
  chapterId: z.number().int().positive().optional(),
  name: z.string().min(1).optional(),
  sideToTrain: z.enum(['WHITE', 'BLACK']).optional(),
  startingFen: z.string().min(1).optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional().nullable(),
});

export const copyLineSchema = z.object({
  targetChapterId: z.number().int().positive(),
  name: z.string().min(1).optional(),
});
