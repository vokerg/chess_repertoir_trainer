import { z } from 'zod';

const isoDateTimeSchema = z.iso.datetime({ offset: true });
const nullableIsoDateTimeSchema = isoDateTimeSchema.nullable();
const sha256HexSchema = z.string().regex(/^[a-f0-9]{64}$/);
const booleanQueryParamSchema = z.preprocess((value) => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}, z.boolean());
const lastQueryParam = (value: unknown) => Array.isArray(value) ? value.at(-1) : value;

export const accountImportScopeVersionSchema = z.literal(1);
export type AccountImportScopeVersion = z.infer<typeof accountImportScopeVersionSchema>;

export const accountImportVariantSchema = z.literal('STANDARD');
export type AccountImportVariant = z.infer<typeof accountImportVariantSchema>;

export const accountImportSpeedSchema = z.enum(['BULLET', 'BLITZ', 'RAPID']);
export type AccountImportSpeed = z.infer<typeof accountImportSpeedSchema>;

export const accountImportRatedSchema = z.enum(['BOTH', 'RATED', 'UNRATED']);
export type AccountImportRated = z.infer<typeof accountImportRatedSchema>;

export const accountImportScopeSchema = z.object({
  variant: accountImportVariantSchema,
  speeds: z.array(accountImportSpeedSchema).min(1).max(3).refine(
    (values) => new Set(values).size === values.length,
    { message: 'Import speeds must be unique.' },
  ),
  rated: accountImportRatedSchema,
});
export type AccountImportScope = z.infer<typeof accountImportScopeSchema>;

export const durableAccountImportModeSchema = z.enum([
  'BOUNDED_INITIAL',
  'INCREMENTAL_FORWARD',
  'HISTORICAL_BACKFILL',
  'FULL_HISTORY',
]);
export type DurableAccountImportMode = z.infer<typeof durableAccountImportModeSchema>;

export const accountImportModeSchema = z.enum([
  'BOUNDED_INITIAL',
  'INCREMENTAL_FORWARD',
  'HISTORICAL_BACKFILL',
  'FULL_HISTORY',
  'LEGACY_SYNC',
]);
export type AccountImportMode = z.infer<typeof accountImportModeSchema>;

export const durableAccountImportSourceSchema = z.enum([
  'USER_ACTION',
  'ACCOUNT_REFRESH',
  'ONBOARDING',
  'SYSTEM',
]);
export type DurableAccountImportSource = z.infer<typeof durableAccountImportSourceSchema>;

export const accountImportSourceSchema = z.enum([
  'USER_ACTION',
  'ACCOUNT_REFRESH',
  'ONBOARDING',
  'SYSTEM',
  'LEGACY_SYNC',
]);
export type AccountImportSource = z.infer<typeof accountImportSourceSchema>;

export const accountImportStatusSchema = z.enum([
  'QUEUED',
  'RUNNING',
  'PAUSE_REQUESTED',
  'PAUSED',
  'CANCEL_REQUESTED',
  'CANCELLED',
  'COMPLETED',
  'FAILED',
]);
export type AccountImportStatus = z.infer<typeof accountImportStatusSchema>;

export const accountImportGameCountsSchema = z.object({
  seen: z.number().int().nonnegative(),
  matchedScope: z.number().int().nonnegative(),
  imported: z.number().int().nonnegative(),
  duplicate: z.number().int().nonnegative(),
  updated: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
  skippedOutOfScope: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
});
export type AccountImportGameCounts = z.infer<typeof accountImportGameCountsSchema>;

export const accountImportWindowCountsSchema = z.object({
  total: z.number().int().nonnegative().nullable(),
  completed: z.number().int().nonnegative(),
}).refine(
  ({ total, completed }) => total === null || completed <= total,
  { message: 'Completed import windows cannot exceed the known total.' },
);
export type AccountImportWindowCounts = z.infer<typeof accountImportWindowCountsSchema>;

const accountImportRunBaseSchema = z.object({
  id: z.number().int().positive(),
  accountId: z.number().int().positive(),
  provider: z.string().min(1),
  status: accountImportStatusSchema,
  priority: z.number().int().nonnegative(),
  retryOfImportRunId: z.number().int().positive().nullable(),
  windows: accountImportWindowCountsSchema,
  games: accountImportGameCountsSchema,
  lastProgressAt: nullableIsoDateTimeSchema,
  retryAt: nullableIsoDateTimeSchema,
  rateLimitUntil: nullableIsoDateTimeSchema,
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
  startedAt: isoDateTimeSchema,
  completedAt: nullableIsoDateTimeSchema,
  errorCode: z.string().min(1).nullable(),
  error: z.string().min(1).nullable(),
});

const durableAccountImportRunSchema = accountImportRunBaseSchema.extend({
  mode: durableAccountImportModeSchema,
  source: durableAccountImportSourceSchema,
  scopeVersion: accountImportScopeVersionSchema,
  scopeHash: sha256HexSchema,
  scope: accountImportScopeSchema,
  requestedFrom: isoDateTimeSchema,
  requestedTo: isoDateTimeSchema,
}).refine(
  ({ requestedFrom, requestedTo }) => Date.parse(requestedFrom) < Date.parse(requestedTo),
  { message: 'Import requested range must be a non-empty half-open interval.' },
);

const legacyAccountImportRunSchema = accountImportRunBaseSchema.extend({
  mode: z.literal('LEGACY_SYNC'),
  source: z.literal('LEGACY_SYNC'),
  scopeVersion: z.null(),
  scopeHash: z.null(),
  scope: z.null(),
  requestedFrom: z.null(),
  requestedTo: z.null(),
});

export const accountImportRunSchema = z.union([
  durableAccountImportRunSchema,
  legacyAccountImportRunSchema,
]);
export type AccountImportRun = z.infer<typeof accountImportRunSchema>;

export const createAccountImportRunBodySchema = z.object({
  accountId: z.number().int().positive(),
  mode: durableAccountImportModeSchema,
  scope: accountImportScopeSchema,
  requestedFrom: isoDateTimeSchema,
  requestedTo: isoDateTimeSchema,
}).refine(
  ({ requestedFrom, requestedTo }) => Date.parse(requestedFrom) < Date.parse(requestedTo),
  { message: 'Import requested range must be a non-empty half-open interval.' },
);
export type CreateAccountImportRunBody = z.infer<typeof createAccountImportRunBodySchema>;

export const createAccountImportRunResponseSchema = z.object({
  importRun: accountImportRunSchema,
});
export type CreateAccountImportRunResponse = z.infer<typeof createAccountImportRunResponseSchema>;

export const accountImportRunListQuerySchema = z.object({
  active: booleanQueryParamSchema.default(false),
  limit: z.preprocess(lastQueryParam, z.coerce.number().int().min(1).max(100).default(20)),
});
export type AccountImportRunListQuery = z.infer<typeof accountImportRunListQuerySchema>;

export const accountImportRunListResponseSchema = z.object({
  items: z.array(accountImportRunSchema),
});
export type AccountImportRunListResponse = z.infer<typeof accountImportRunListResponseSchema>;

export const accountImportRunParamsSchema = z.object({
  importRunId: z.coerce.number().int().positive(),
});
export type AccountImportRunParams = z.infer<typeof accountImportRunParamsSchema>;

export const accountImportRunResponseSchema = z.object({
  importRun: accountImportRunSchema,
});
export type AccountImportRunResponse = z.infer<typeof accountImportRunResponseSchema>;

export const accountImportCoverageSchema = z.object({
  accountId: z.number().int().positive(),
  scopeVersion: accountImportScopeVersionSchema,
  scopeHash: sha256HexSchema,
  scope: accountImportScopeSchema,
  coveredFrom: nullableIsoDateTimeSchema,
  coveredThrough: nullableIsoDateTimeSchema,
  lastCompletedImportRunId: z.number().int().positive().nullable(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
}).superRefine((coverage, context) => {
  if ((coverage.coveredFrom === null) !== (coverage.coveredThrough === null)) {
    context.addIssue({
      code: 'custom',
      message: 'Coverage boundaries must both be null or both be present.',
    });
    return;
  }
  if (
    coverage.coveredFrom !== null
    && coverage.coveredThrough !== null
    && Date.parse(coverage.coveredFrom) >= Date.parse(coverage.coveredThrough)
  ) {
    context.addIssue({
      code: 'custom',
      message: 'Coverage must be a non-empty half-open interval.',
    });
  }
});
export type AccountImportCoverage = z.infer<typeof accountImportCoverageSchema>;

export const accountImportCoverageResponseSchema = z.object({
  coverage: accountImportCoverageSchema.nullable(),
});
export type AccountImportCoverageResponse = z.infer<typeof accountImportCoverageResponseSchema>;

export const accountImportErrorCodeSchema = z.enum([
  'ACCOUNT_IMPORT_ACTIVE',
  'ACCOUNT_IMPORT_ADMISSION_BLOCKED',
  'ACCOUNT_IMPORT_NOT_FOUND',
  'ACCOUNT_IMPORT_INVALID_RANGE',
  'ACCOUNT_IMPORT_COVERAGE_GAP',
  'ACCOUNT_IMPORT_INVALID_STATE',
]);
export type AccountImportErrorCode = z.infer<typeof accountImportErrorCodeSchema>;

export const accountImportErrorResponseSchema = z.object({
  error: z.string().min(1),
  code: accountImportErrorCodeSchema,
});
export type AccountImportErrorResponse = z.infer<typeof accountImportErrorResponseSchema>;
