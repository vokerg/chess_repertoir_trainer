import { z } from 'zod';

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
export type CourseSide = z.infer<typeof courseSideSchema>;
export type CourseCoverKey = z.infer<typeof courseCoverKeySchema>;
export type CreateCourseInput = z.input<typeof createCourseSchema>;
export type CreateCourse = z.output<typeof createCourseSchema>;
export type UpdateCourse = z.output<typeof updateCourseSchema>;
