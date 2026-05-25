import { z } from 'zod';

export const courseSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable().optional(),
});

export const createCourseRequestSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
});

export const createChapterRequestSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  sortOrder: z.number().int().optional(),
});

export const createLineRequestSchema = z.object({
  name: z.string().min(1),
  sideToTrain: z.enum(['WHITE', 'BLACK']),
  startingFen: z.string().min(1),
  tags: z.array(z.string()).optional(),
  notes: z.string().nullable().optional(),
});

export const createMoveNodeRequestSchema = z.object({
  parentId: z.number().int().nullable().optional(),
  moveUci: z.string().min(4).max(5),
  comment: z.string().nullable().optional(),
  annotation: z.string().nullable().optional(),
  branchLabel: z.string().nullable().optional(),
  branchWeight: z.number().nullable().optional(),
  sortOrder: z.number().int().optional(),
});

export type CourseDto = z.infer<typeof courseSchema>;
export type CreateCourseRequest = z.infer<typeof createCourseRequestSchema>;
export type CreateChapterRequest = z.infer<typeof createChapterRequestSchema>;
export type CreateLineRequest = z.infer<typeof createLineRequestSchema>;
export type CreateMoveNodeRequest = z.infer<typeof createMoveNodeRequestSchema>;
