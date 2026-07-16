import { z } from 'zod';

const booleanQueryParamSchema = z.preprocess((value) => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}, z.boolean());

const lastQueryParam = (value: unknown) => Array.isArray(value) ? value.at(-1) : value;
const nullableDateTimeSchema = z.iso.datetime({ offset: true }).nullable();

export const jobRunKindSchema = z.enum([
  'INDEX_GAMES',
  'ANALYSE_GAMES',
  'PROCESS_GAMES',
  'REFRESH_TAGS',
]);
export type JobRunKind = z.infer<typeof jobRunKindSchema>;

export const jobRunSourceSchema = z.enum([
  'USER_ACTION',
  'ACCOUNT_REFRESH',
  'ONBOARDING',
  'MAINTENANCE',
]);
export type JobRunSource = z.infer<typeof jobRunSourceSchema>;

export const jobRunStatusSchema = z.enum([
  'QUEUED',
  'RUNNING',
  'COMPLETED',
  'PARTIALLY_FAILED',
  'FAILED',
  'CANCELLED',
]);
export type JobRunStatus = z.infer<typeof jobRunStatusSchema>;

export const jobTaskStatusSchema = z.enum([
  'QUEUED',
  'RUNNING',
  'COMPLETED',
  'SKIPPED',
  'FAILED',
  'CANCELLED',
]);
export type JobTaskStatus = z.infer<typeof jobTaskStatusSchema>;

export const jobTaskCountsSchema = z.object({
  queued: z.number().int().nonnegative(),
  running: z.number().int().nonnegative(),
  completed: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  cancelled: z.number().int().nonnegative(),
});
export type JobTaskCounts = z.infer<typeof jobTaskCountsSchema>;

export const jobRunSummarySchema = z.object({
  id: z.number().int().positive(),
  kind: jobRunKindSchema,
  source: jobRunSourceSchema,
  priority: z.number().int(),
  status: jobRunStatusSchema,
  totalTasks: z.number().int().nonnegative(),
  force: z.boolean(),
  taskCounts: jobTaskCountsSchema,
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  startedAt: nullableDateTimeSchema,
  completedAt: nullableDateTimeSchema,
});
export type JobRunSummary = z.infer<typeof jobRunSummarySchema>;

export const jobTaskSchema = z.object({
  id: z.number().int().positive(),
  importedGameId: z.number().int().positive().nullable(),
  ordinal: z.number().int().nonnegative(),
  status: jobTaskStatusSchema,
  error: z.string().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
});
export type JobTask = z.infer<typeof jobTaskSchema>;

export const createImportedGameJobRunBodySchema = z.object({
  kind: jobRunKindSchema,
  gameIds: z.array(z.number().int().positive()).min(1).max(1_000),
  force: z.boolean().default(false),
});
export type CreateImportedGameJobRunBody = z.infer<typeof createImportedGameJobRunBodySchema>;

export const createImportedGameJobRunResponseSchema = z.object({
  jobRun: jobRunSummarySchema,
  rejectedGameIds: z.array(z.number().int().positive()),
});
export type CreateImportedGameJobRunResponse = z.infer<typeof createImportedGameJobRunResponseSchema>;

export const jobRunListQuerySchema = z.object({
  active: booleanQueryParamSchema.default(false),
  limit: z.preprocess(lastQueryParam, z.coerce.number().int().min(1).max(100).default(20)),
});
export type JobRunListQuery = z.infer<typeof jobRunListQuerySchema>;

export const jobRunListResponseSchema = z.object({
  items: z.array(jobRunSummarySchema),
});
export type JobRunListResponse = z.infer<typeof jobRunListResponseSchema>;

export const jobRunParamsSchema = z.object({
  jobRunId: z.coerce.number().int().positive(),
});
export type JobRunParams = z.infer<typeof jobRunParamsSchema>;

export const jobRunDetailResponseSchema = z.object({
  jobRun: jobRunSummarySchema,
});
export type JobRunDetailResponse = z.infer<typeof jobRunDetailResponseSchema>;

export const jobTaskListQuerySchema = z.object({
  offset: z.preprocess(lastQueryParam, z.coerce.number().int().min(0).default(0)),
  limit: z.preprocess(lastQueryParam, z.coerce.number().int().min(1).max(500).default(100)),
});
export type JobTaskListQuery = z.infer<typeof jobTaskListQuerySchema>;

export const jobTaskListResponseSchema = z.object({
  total: z.number().int().nonnegative(),
  items: z.array(jobTaskSchema),
});
export type JobTaskListResponse = z.infer<typeof jobTaskListResponseSchema>;

export const jobRunErrorCodeSchema = z.enum([
  'NO_IMPORTED_GAMES_FOUND',
  'JOB_RUN_NOT_FOUND',
]);
export type JobRunErrorCode = z.infer<typeof jobRunErrorCodeSchema>;

export const jobRunErrorResponseSchema = z.object({
  error: z.string().min(1),
  code: jobRunErrorCodeSchema,
});
export type JobRunErrorResponse = z.infer<typeof jobRunErrorResponseSchema>;
