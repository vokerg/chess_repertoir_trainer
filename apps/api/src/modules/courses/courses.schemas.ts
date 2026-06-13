import { z } from 'zod';

export const createCourseSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
});

export const updateCourseSchema = createCourseSchema.partial();

export const createChapterSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  sortOrder: z.number().int().optional(),
});

export const updateChapterSchema = createChapterSchema.partial();

export const createLineSchema = z.object({
  name: z.string().min(1),
  sideToTrain: z.enum(['WHITE', 'BLACK']),
  startingFen: z.string().min(1),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional().nullable(),
});

export const updateLineSchema = createLineSchema.partial().extend({
  chapterId: z.number().int().positive().optional(),
});

export const copyLineSchema = z.object({
  targetChapterId: z.number().int().positive(),
  name: z.string().min(1).optional(),
});

export const createNodeSchema = z.object({
  parentId: z.number().int().optional().nullable(),
  moveUci: z.string().min(4).max(5),
  comment: z.string().optional().nullable(),
  annotation: z.string().optional().nullable(),
  branchLabel: z.string().optional().nullable(),
  branchWeight: z.number().optional().nullable(),
  sortOrder: z.number().int().optional(),
});

export const updateNodeSchema = z.object({
  comment: z.string().optional().nullable(),
  annotation: z.string().optional().nullable(),
  branchLabel: z.string().optional().nullable(),
  branchWeight: z.number().optional().nullable(),
  sortOrder: z.number().int().optional(),
  isCorrectUserMove: z.boolean().optional(),
});
