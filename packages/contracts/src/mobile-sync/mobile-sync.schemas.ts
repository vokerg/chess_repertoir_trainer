import { z } from 'zod';
import {
  serializableTrainingCountersSchema,
  serializableTrainingEventSchema,
  serializableTrainingSessionSchema,
  serializableTrainingSublineSchema,
} from '../training';

export const mobileManifestCourseSchema = z.object({
  courseId: z.number().int().positive(),
  name: z.string().min(1),
  description: z.string().nullable(),
  contentRevision: z.number().int().positive(),
  contentChangedAt: z.string().datetime({ offset: true }),
  estimatedBundleBytes: z.number().int().nonnegative().nullable(),
});

export const mobileSyncManifestSchema = z.object({
  manifestSchemaVersion: z.literal(1),
  bundleSchemaVersion: z.literal(1),
  minimumSupportedAppVersion: z.string().min(1).nullable(),
  generatedAt: z.string().datetime({ offset: true }),
  courses: z.array(mobileManifestCourseSchema),
});

export const mobileCourseChapterSchema = z.object({
  id: z.number().int().positive(),
  courseId: z.number().int().positive(),
  name: z.string().min(1),
  description: z.string().nullable(),
  sortOrder: z.number().int(),
});

export const mobileCourseLineSchema = z.object({
  id: z.number().int().positive(),
  chapterId: z.number().int().positive(),
  name: z.string().min(1),
  sideToTrain: z.enum(['WHITE', 'BLACK']),
  startingFen: z.string().min(1),
  notes: z.string().nullable(),
  tags: z.array(z.string()),
});

export const mobileCourseMoveNodeSchema = z.object({
  id: z.number().int().positive(),
  lineId: z.number().int().positive(),
  parentId: z.number().int().positive().nullable(),
  plyNumber: z.number().int().nonnegative(),
  fenBefore: z.string().min(1),
  fenAfter: z.string().min(1),
  moveUci: z.string().min(1),
  moveSan: z.string().min(1),
  moveNumber: z.number().int().nonnegative(),
  colorToMoveBefore: z.enum(['WHITE', 'BLACK']),
  side: z.enum(['WHITE', 'BLACK']),
  isUserMove: z.boolean(),
  isCorrectUserMove: z.boolean(),
  sortOrder: z.number().int(),
  branchLabel: z.string().nullable(),
  branchWeight: z.number().nullable(),
  comment: z.string().nullable(),
  annotation: z.string().nullable(),
});

export const mobileCourseBundleSchema = z.object({
  bundleSchemaVersion: z.literal(1),
  courseId: z.number().int().positive(),
  contentRevision: z.number().int().positive(),
  generatedAt: z.string().datetime({ offset: true }),
  course: z.object({
    id: z.number().int().positive(),
    name: z.string().min(1),
    description: z.string().nullable(),
  }),
  chapters: z.array(mobileCourseChapterSchema),
  lines: z.array(mobileCourseLineSchema),
  moveNodes: z.array(mobileCourseMoveNodeSchema),
  sublines: z.array(serializableTrainingSublineSchema),
});

export const mobileTrainingAttemptSchema = z.object({
  attemptSchemaVersion: z.literal(1),
  clientAttemptId: z.string().uuid(),
  courseId: z.number().int().positive(),
  courseContentRevision: z.number().int().positive(),
  trainingMode: z.string().min(1),
  session: serializableTrainingSessionSchema,
  subline: serializableTrainingSublineSchema,
  events: z.array(serializableTrainingEventSchema),
  counters: serializableTrainingCountersSchema,
});

export const mobileTrainingAttemptBatchRequestSchema = z.object({
  deviceId: z.string().min(1),
  attempts: z.array(mobileTrainingAttemptSchema).min(1).max(100),
});

export const mobileTrainingAttemptResultSchema = z.object({
  clientAttemptId: z.string().uuid(),
  status: z.enum(['ACCEPTED', 'DUPLICATE', 'REJECTED']),
  trainingSessionId: z.number().int().positive().nullable(),
  rejectionCode: z.string().nullable(),
  message: z.string().nullable(),
  receivedAt: z.string().datetime({ offset: true }),
});

export const mobileTrainingAttemptBatchResponseSchema = z.object({
  results: z.array(mobileTrainingAttemptResultSchema),
});

export type MobileSyncManifestDto = z.infer<typeof mobileSyncManifestSchema>;
export type MobileCourseBundleDto = z.infer<typeof mobileCourseBundleSchema>;
export type MobileTrainingAttemptDto = z.infer<typeof mobileTrainingAttemptSchema>;
export type MobileTrainingAttemptBatchRequestDto = z.infer<
  typeof mobileTrainingAttemptBatchRequestSchema
>;
export type MobileTrainingAttemptBatchResponseDto = z.infer<
  typeof mobileTrainingAttemptBatchResponseSchema
>;
