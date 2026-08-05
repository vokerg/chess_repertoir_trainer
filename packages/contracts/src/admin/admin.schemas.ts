import { z } from 'zod';

const lastQueryParam = (value: unknown) => Array.isArray(value) ? value.at(-1) : value;
const dateTimeSchema = z.iso.datetime({ offset: true });
const nullableDateTimeSchema = dateTimeSchema.nullable();

export const adminCapabilitySchema = z.enum([
  'ADMIN_DIAGNOSTICS_READ',
]);
export type AdminCapability = z.infer<typeof adminCapabilitySchema>;

export const adminRequestBudgetEnforcementSchema = z.enum([
  'UNENFORCED',
  'ENFORCED',
]);
export type AdminRequestBudgetEnforcement = z.infer<typeof adminRequestBudgetEnforcementSchema>;

export const adminWarningCodeSchema = z.enum([
  'DIRECT_USER_QUEUE_AGE_HIGH',
  'ONBOARDING_ANALYSIS_QUEUE_AGE_HIGH',
  'IMPORT_QUEUE_AGE_HIGH',
  'IMPORT_QUEUE_BACKLOG_HIGH',
  'PREPARATION_RECONCILE_LAG',
]);
export type AdminWarningCode = z.infer<typeof adminWarningCodeSchema>;

export const adminWarningMetricSchema = z.enum([
  'queueAgeSeconds',
  'queuedRuns',
  'reconcileLagSeconds',
]);
export type AdminWarningMetric = z.infer<typeof adminWarningMetricSchema>;

export const adminWarningSchema = z.object({
  code: adminWarningCodeSchema,
  policyVersion: z.string().min(1),
  evidence: z.object({
    metric: adminWarningMetricSchema,
    observed: z.number().nonnegative(),
    threshold: z.number().nonnegative(),
    unit: z.enum(['SECONDS', 'COUNT']),
  }),
});
export type AdminWarning = z.infer<typeof adminWarningSchema>;

export const adminMeResponseSchema = z.object({
  capabilities: z.array(adminCapabilitySchema),
  actorKeyVersion: z.number().int().positive(),
  sessionEvidence: z.object({
    hasVerifiedSession: z.boolean(),
    hasFactorVerificationAge: z.boolean(),
    hasReverificationId: z.boolean(),
  }),
  requestBudget: z.object({
    enforcement: adminRequestBudgetEnforcementSchema,
    scope: z.literal('STRICT_BOUNDS_AND_SECURITY_TELEMETRY'),
  }),
});
export type AdminMeResponse = z.infer<typeof adminMeResponseSchema>;

export const adminUserListQuerySchema = z.object({
  cursor: z.preprocess(lastQueryParam, z.string().min(1).max(256).optional()),
  limit: z.preprocess(lastQueryParam, z.coerce.number().int().min(1).max(100).default(25)),
});
export type AdminUserListQuery = z.infer<typeof adminUserListQuerySchema>;

export const adminUserSummarySchema = z.object({
  id: z.number().int().positive(),
  createdAt: dateTimeSchema,
  updatedAt: dateTimeSchema,
  accountCount: z.number().int().nonnegative(),
  activeAccountCount: z.number().int().nonnegative(),
  importedGameCount: z.number().int().nonnegative(),
  courseCount: z.number().int().nonnegative(),
  activeWorkCount: z.number().int().nonnegative(),
  warnings: z.array(adminWarningSchema),
});
export type AdminUserSummary = z.infer<typeof adminUserSummarySchema>;

export const adminUserListResponseSchema = z.object({
  items: z.array(adminUserSummarySchema),
  nextCursor: z.string().nullable(),
});
export type AdminUserListResponse = z.infer<typeof adminUserListResponseSchema>;

export const adminUserParamsSchema = z.object({
  userId: z.coerce.number().int().positive(),
});
export type AdminUserParams = z.infer<typeof adminUserParamsSchema>;

const unavailableSectionSchema = z.object({
  available: z.literal(false),
  reason: z.enum(['MODEL_NOT_AVAILABLE', 'QUERY_FAILED']),
});

const accountSectionSchema = z.discriminatedUnion('available', [
  z.object({
    available: z.literal(true),
    total: z.number().int().nonnegative(),
    active: z.number().int().nonnegative(),
    groups: z.array(z.object({
      provider: z.string().min(1),
      active: z.boolean(),
      count: z.number().int().nonnegative(),
    })),
  }),
  unavailableSectionSchema,
]);

const gamesSectionSchema = z.discriminatedUnion('available', [
  z.object({
    available: z.literal(true),
    total: z.number().int().nonnegative(),
    indexed: z.number().int().nonnegative(),
    analysed: z.number().int().nonnegative(),
    bySpeed: z.array(z.object({
      speed: z.string().nullable(),
      count: z.number().int().nonnegative(),
    })),
    byIndexState: z.array(z.object({
      state: z.enum(['INDEXED', 'NOT_INDEXED', 'INDEX_FAILED']),
      count: z.number().int().nonnegative(),
    })),
    byAnalysisState: z.array(z.object({
      state: z.string().nullable(),
      count: z.number().int().nonnegative(),
    })),
  }),
  unavailableSectionSchema,
]);

const courseSectionSchema = z.discriminatedUnion('available', [
  z.object({
    available: z.literal(true),
    courses: z.number().int().nonnegative(),
    chapters: z.number().int().nonnegative(),
    lines: z.number().int().nonnegative(),
  }),
  unavailableSectionSchema,
]);

const trainingSectionSchema = z.discriminatedUnion('available', [
  z.object({
    available: z.literal(true),
    sessions: z.number().int().nonnegative(),
    sublineAttempts: z.number().int().nonnegative(),
    latestSessionAt: nullableDateTimeSchema,
    latestSublineAttemptAt: nullableDateTimeSchema,
  }),
  unavailableSectionSchema,
]);

const preparationSectionSchema = z.discriminatedUnion('available', [
  z.object({
    available: z.literal(true),
    totalRuns: z.number().int().nonnegative(),
    activeRuns: z.number().int().nonnegative(),
    latestUpdatedAt: nullableDateTimeSchema,
    warnings: z.array(adminWarningSchema),
  }),
  unavailableSectionSchema,
]);

const footprintSectionSchema = z.discriminatedUnion('available', [
  z.object({
    available: z.literal(true),
    rowCounts: z.object({
      externalAccounts: z.number().int().nonnegative(),
      importedGames: z.number().int().nonnegative(),
      courses: z.number().int().nonnegative(),
      chapters: z.number().int().nonnegative(),
      lines: z.number().int().nonnegative(),
      trainingSessions: z.number().int().nonnegative(),
      trainingSublineAttempts: z.number().int().nonnegative(),
      importRuns: z.number().int().nonnegative(),
      jobRuns: z.number().int().nonnegative(),
      preparationRuns: z.number().int().nonnegative(),
    }),
  }),
  unavailableSectionSchema,
]);

export const adminUserDetailResponseSchema = z.object({
  user: z.object({
    id: z.number().int().positive(),
    createdAt: dateTimeSchema,
    updatedAt: dateTimeSchema,
  }),
  sections: z.object({
    accounts: accountSectionSchema,
    games: gamesSectionSchema,
    courses: courseSectionSchema,
    training: trainingSectionSchema,
    preparation: preparationSectionSchema,
    footprint: footprintSectionSchema,
    lifecycle: unavailableSectionSchema,
  }),
});
export type AdminUserDetailResponse = z.infer<typeof adminUserDetailResponseSchema>;

export const adminWorkQuerySchema = z.object({
  limit: z.preprocess(lastQueryParam, z.coerce.number().int().min(1).max(50).default(20)),
});
export type AdminWorkQuery = z.infer<typeof adminWorkQuerySchema>;

const taskCountsSchema = z.object({
  queued: z.number().int().nonnegative(),
  running: z.number().int().nonnegative(),
  completed: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  cancelled: z.number().int().nonnegative(),
});

const jobsWorkSectionSchema = z.discriminatedUnion('available', [
  z.object({
    available: z.literal(true),
    items: z.array(z.object({
      id: z.number().int().positive(),
      kind: z.string().min(1),
      source: z.string().min(1),
      status: z.string().min(1),
      totalTasks: z.number().int().nonnegative(),
      activeWorkKeys: z.number().int().nonnegative(),
      taskCounts: taskCountsSchema,
      createdAt: dateTimeSchema,
      updatedAt: dateTimeSchema,
      startedAt: nullableDateTimeSchema,
      completedAt: nullableDateTimeSchema,
      queueAgeSeconds: z.number().nonnegative().nullable(),
      warnings: z.array(adminWarningSchema),
    })),
  }),
  unavailableSectionSchema,
]);

const importsWorkSectionSchema = z.discriminatedUnion('available', [
  z.object({
    available: z.literal(true),
    queuedCount: z.number().int().nonnegative(),
    items: z.array(z.object({
      id: z.number().int().positive(),
      accountId: z.number().int().positive(),
      provider: z.string().min(1),
      status: z.string().min(1),
      gamesSeen: z.number().int().nonnegative(),
      gamesImported: z.number().int().nonnegative(),
      gamesFailed: z.number().int().nonnegative(),
      startedAt: dateTimeSchema,
      completedAt: nullableDateTimeSchema,
      queueAgeSeconds: z.number().nonnegative().nullable(),
      warnings: z.array(adminWarningSchema),
    })),
    warnings: z.array(adminWarningSchema),
  }),
  unavailableSectionSchema,
]);

const preparationWorkSectionSchema = z.discriminatedUnion('available', [
  z.object({
    available: z.literal(true),
    items: z.array(z.object({
      id: z.number().int().positive(),
      purpose: z.string().min(1),
      status: z.string().min(1),
      attentionCode: z.string().nullable(),
      reconcileAfter: nullableDateTimeSchema,
      createdAt: dateTimeSchema,
      updatedAt: dateTimeSchema,
      completedAt: nullableDateTimeSchema,
      warnings: z.array(adminWarningSchema),
    })),
  }),
  unavailableSectionSchema,
]);

export const adminUserWorkResponseSchema = z.object({
  userId: z.number().int().positive(),
  sections: z.object({
    jobs: jobsWorkSectionSchema,
    imports: importsWorkSectionSchema,
    preparation: preparationWorkSectionSchema,
    lifecycle: unavailableSectionSchema,
  }),
});
export type AdminUserWorkResponse = z.infer<typeof adminUserWorkResponseSchema>;

export const adminErrorResponseSchema = z.object({
  message: z.string().min(1),
  code: z.enum([
    'ADMIN_FORBIDDEN',
    'ADMIN_USER_NOT_FOUND',
    'ADMIN_CURSOR_INVALID',
    'ADMIN_REQUEST_BUDGET_EXCEEDED',
  ]),
});
export type AdminErrorResponse = z.infer<typeof adminErrorResponseSchema>;
