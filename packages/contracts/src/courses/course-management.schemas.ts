import { z } from 'zod';
import { trainingStatusValueSchema } from '../training/training-stats.schemas';

export const courseSideSchema = z.enum(['WHITE', 'BLACK']);

export const courseCoverKeySchema = z.enum([
  'QUEENS_GAMBIT',
  'SICILIAN',
  'FIANCHETTO',
  'CLASSICAL_DEFENSE',
  'WHITE_INITIATIVE',
  'BLACK_COUNTERPLAY',
]);

export const courseSchema = z.object({
  id: z.number().int().positive(),
  userId: z.number().int().positive(),
  name: z.string(),
  description: z.string().nullable(),
  side: courseSideSchema,
  coverKey: courseCoverKeySchema.nullable(),
  contentRevision: z.number().int().positive(),
  contentChangedAt: z.iso.datetime(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const courseListSchema = z.array(courseSchema);

export const chapterSchema = z.object({
  id: z.number().int().positive(),
  courseId: z.number().int().positive(),
  name: z.string(),
  description: z.string().nullable(),
  sortOrder: z.number().int(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const chapterListSchema = z.array(chapterSchema);

export const lineSchema = z.object({
  id: z.number().int().positive(),
  chapterId: z.number().int().positive(),
  name: z.string(),
  sideToTrain: courseSideSchema,
  startingFen: z.string().min(1),
  tags: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const lineTrainingStatsSchema = z.object({
  totalAttempts: z.number().int().nonnegative(),
  passedCount: z.number().int().nonnegative(),
  failedCount: z.number().int().nonnegative(),
  passRate: z.number().min(0).max(1),
  activeSublineCount: z.number().int().nonnegative(),
  trainedSublineCount: z.number().int().nonnegative(),
  untrainedSublineCount: z.number().int().nonnegative(),
  weakSublineCount: z.number().int().nonnegative(),
  status: trainingStatusValueSchema,
});

export const lineListItemSchema = lineSchema.extend({
  trainingStats: lineTrainingStatsSchema,
});

export const lineListSchema = z.array(lineListItemSchema);

export const lineMoveNodeSchema = z.object({
  id: z.number().int().nonnegative(),
  lineId: z.number().int().positive(),
  parentId: z.number().int().positive().nullable(),
  plyNumber: z.number().int().nonnegative(),
  fenBefore: z.string().min(1),
  fenBeforeNormalized: z.string().nullable().optional(),
  fenAfter: z.string().min(1),
  moveUci: z.string(),
  moveSan: z.string(),
  moveNumber: z.number().int().nonnegative(),
  colorToMoveBefore: courseSideSchema,
  side: courseSideSchema,
  isUserMove: z.boolean(),
  isCorrectUserMove: z.boolean(),
  comment: z.string().nullable().optional(),
  annotation: z.string().nullable().optional(),
  branchLabel: z.string().nullable().optional(),
  branchWeight: z.number().nullable().optional(),
  sortOrder: z.number().int(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type LineMoveNode = z.infer<typeof lineMoveNodeSchema>;

export interface LineMoveTreeNode {
  node: LineMoveNode;
  children: LineMoveTreeNode[];
}

export const lineMoveTreeNodeSchema: z.ZodType<LineMoveTreeNode> = z.lazy(() => z.object({
  node: lineMoveNodeSchema,
  children: z.array(lineMoveTreeNodeSchema),
}));

export const lineMoveTreeSchema = z.object({
  root: lineMoveTreeNodeSchema,
});

export const createCourseSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  side: courseSideSchema.default('WHITE'),
  coverKey: courseCoverKeySchema.optional().nullable(),
});

export const updateCourseSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  side: courseSideSchema.optional(),
  coverKey: courseCoverKeySchema.optional().nullable(),
});

export type Course = z.infer<typeof courseSchema>;
export type Chapter = z.infer<typeof chapterSchema>;
export type Line = z.infer<typeof lineSchema>;
export type LineTrainingStats = z.infer<typeof lineTrainingStatsSchema>;
export type LineListItem = z.infer<typeof lineListItemSchema>;
export type LineMoveTree = z.infer<typeof lineMoveTreeSchema>;
export type CourseSide = z.infer<typeof courseSideSchema>;
export type CourseCoverKey = z.infer<typeof courseCoverKeySchema>;
export type CreateCourseInput = z.input<typeof createCourseSchema>;
export type CreateCourse = z.output<typeof createCourseSchema>;
export type UpdateCourse = z.output<typeof updateCourseSchema>;
