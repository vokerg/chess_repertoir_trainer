import { z } from 'zod';

export const ONBOARDING_CONTRACT_VERSION = '2026-08-v1' as const;

export const onboardingDispositionSchema = z.enum(['PENDING', 'COMPLETED', 'SKIPPED']);
export type OnboardingDisposition = z.infer<typeof onboardingDispositionSchema>;

export const onboardingPresentationStateSchema = z.enum([
  'NOT_STARTED',
  'PREPARING',
  'PAUSED',
  'NEEDS_ATTENTION',
  'CANCELLED',
  'FAILED',
  'CORE_READY',
  'COMPLETE',
  'SKIPPED',
]);
export type OnboardingPresentationState = z.infer<typeof onboardingPresentationStateSchema>;

export const onboardingAttentionCodeSchema = z.enum([
  'NO_RECENT_GAMES',
  'ALL_INDEXING_FAILED',
  'IMPORT_PAUSED',
  'IMPORT_RETRY_AVAILABLE',
  'IMPORT_RATE_LIMITED',
  'RECONCILE_DUE_WARNING',
  'RECONCILE_DUE_CRITICAL',
  'PREPARATION_TASK_START_DELAY',
  'INDEX_NO_SETTLEMENT_WARNING',
  'ANALYSIS_NO_SETTLEMENT_WARNING',
  'INDEXING_PARTIAL',
  'ANALYSIS_PARTIAL',
  'PREPARATION_PAUSED',
  'PREPARATION_CANCELLED',
  'PREPARATION_FAILED',
  'PREPARATION_NEEDS_ATTENTION',
]);
export type OnboardingAttentionCode = z.infer<typeof onboardingAttentionCodeSchema>;

export const onboardingActionCodeSchema = z.enum([
  'START_ONBOARDING',
  'RESUME_ONBOARDING',
  'RETRY_PREPARATION',
  'EXPAND_RANGE',
  'ADD_ACCOUNT',
  'FINISH_ONBOARDING',
  'SKIP_ONBOARDING',
  'VIEW_HOME',
  'VIEW_GAMES',
  'VIEW_OPENING_ANALYSIS',
  'VIEW_ANALYSIS',
]);
export type OnboardingActionCode = z.infer<typeof onboardingActionCodeSchema>;

export const onboardingFeatureSchema = z.enum(['games', 'openings', 'analysis', 'tactics']);
export type OnboardingFeature = z.infer<typeof onboardingFeatureSchema>;

export const onboardingFeatureStateSchema = z.enum(['locked', 'partial', 'ready', 'checked-empty']);
export type OnboardingFeatureState = z.infer<typeof onboardingFeatureStateSchema>;

const isoDateTime = z.iso.datetime({ offset: true });
const nullableIsoDateTime = isoDateTime.nullable();
const countSchema = z.number().int().nonnegative();
const nullablePercentageSchema = z.number().min(0).max(100).nullable();

export const onboardingActionSchema = z.object({
  code: onboardingActionCodeSchema,
  destination: z.string().min(1),
}).strict();
export type OnboardingAction = z.infer<typeof onboardingActionSchema>;

export const onboardingFeatureReadinessSchema = z.object({
  feature: onboardingFeatureSchema,
  state: onboardingFeatureStateSchema,
  evidenceCount: countSchema,
}).strict();
export type OnboardingFeatureReadiness = z.infer<typeof onboardingFeatureReadinessSchema>;

export const onboardingMilestonesSchema = z.object({
  firstImportedAt: nullableIsoDateTime,
  firstIndexedAt: nullableIsoDateTime,
  firstAnalysedAt: nullableIsoDateTime,
  coreReadyAt: nullableIsoDateTime,
  analysisCompletedAt: nullableIsoDateTime,
}).strict();
export type OnboardingMilestones = z.infer<typeof onboardingMilestonesSchema>;

export const onboardingLatestMilestoneSchema = z.object({
  kind: z.enum([
    'FIRST_IMPORTED',
    'FIRST_INDEXED',
    'FIRST_ANALYSED',
    'CORE_READY',
    'ANALYSIS_COMPLETED',
  ]),
  occurredAt: isoDateTime,
}).strict().nullable();
export type OnboardingLatestMilestone = z.infer<typeof onboardingLatestMilestoneSchema>;

export const onboardingProviderWindowProgressSchema = z.object({
  completed: countSchema,
  total: countSchema.nullable(),
  percentage: nullablePercentageSchema,
}).strict();
export type OnboardingProviderWindowProgress = z.infer<typeof onboardingProviderWindowProgressSchema>;

export const onboardingGameProgressSchema = z.object({
  committed: countSchema,
  indexed: countSchema,
  indexPending: countSchema,
  indexFailed: countSchema,
  analysed: countSchema,
  analysisPending: countSchema,
  analysisRunning: countSchema,
  analysisFailed: countSchema,
}).strict();
export type OnboardingGameProgress = z.infer<typeof onboardingGameProgressSchema>;

export const onboardingFixedCoverageSchema = z.object({
  settled: countSchema,
  total: countSchema,
  remaining: countSchema,
  percentage: z.number().min(0).max(100),
}).strict();
export type OnboardingFixedCoverage = z.infer<typeof onboardingFixedCoverageSchema>;

export const onboardingTechnicalBatchSummarySchema = z.object({
  batchCount: countSchema,
  queuedBatches: countSchema,
  runningBatches: countSchema,
  terminalBatches: countSchema,
  selectedTasks: countSchema,
  queuedTasks: countSchema,
  runningTasks: countSchema,
  completedTasks: countSchema,
  skippedTasks: countSchema,
  failedTasks: countSchema,
  cancelledTasks: countSchema,
  remainingTasks: countSchema,
}).strict();
export type OnboardingTechnicalBatchSummary = z.infer<typeof onboardingTechnicalBatchSummarySchema>;

export const onboardingBatchProgressSchema = z.object({
  id: z.number().int().positive(),
  targetId: z.number().int().positive(),
  stage: z.enum(['INDEX', 'ANALYSIS']),
  lane: z.string().min(1),
  status: z.string().min(1),
  selected: countSchema,
  queued: countSchema,
  running: countSchema,
  completed: countSchema,
  skipped: countSchema,
  failed: countSchema,
  cancelled: countSchema,
  settled: countSchema,
  remaining: countSchema,
  percentage: z.number().min(0).max(100),
}).strict();
export type OnboardingBatchProgress = z.infer<typeof onboardingBatchProgressSchema>;

export const onboardingTargetProgressSchema = z.object({
  id: z.number().int().positive(),
  accountId: z.number().int().positive().nullable(),
  provider: z.string().min(1),
  username: z.string().min(1),
  ordinal: countSchema,
  importStatus: z.string().nullable(),
  providerWindows: onboardingProviderWindowProgressSchema,
  games: onboardingGameProgressSchema,
  milestones: onboardingMilestonesSchema.pick({
    firstImportedAt: true,
    firstIndexedAt: true,
    firstAnalysedAt: true,
    coreReadyAt: true,
  }),
}).strict();
export type OnboardingTargetProgress = z.infer<typeof onboardingTargetProgressSchema>;

export const onboardingRevealSchema = z.object({
  kind: z.enum(['IMPORTED_GAME', 'OPENING', 'ANALYSIS']),
  importedGameId: z.number().int().positive(),
  accountId: z.number().int().positive(),
  title: z.string().min(1),
  detail: z.string().nullable(),
  destination: z.string().min(1),
}).strict();
export type OnboardingReveal = z.infer<typeof onboardingRevealSchema>;

export const onboardingReadinessResponseSchema = z.object({
  contractVersion: z.literal(ONBOARDING_CONTRACT_VERSION),
  disposition: z.object({
    value: onboardingDispositionSchema,
    reason: z.string().nullable(),
    changedAt: nullableIsoDateTime,
  }).strict(),
  presentationState: onboardingPresentationStateSchema,
  preparation: z.object({
    runId: z.number().int().positive(),
    status: z.string().min(1),
    purpose: z.literal('ONBOARDING'),
    targetsTotal: countSchema,
    targetsTruncated: z.boolean(),
    providerWindows: onboardingProviderWindowProgressSchema,
    games: onboardingGameProgressSchema,
    fixedCoverage: z.object({
      index: onboardingFixedCoverageSchema.nullable(),
      analysis: onboardingFixedCoverageSchema.nullable(),
    }).strict(),
    technicalBatches: onboardingTechnicalBatchSummarySchema,
    latestBatches: z.array(onboardingBatchProgressSchema).max(8),
    targets: z.array(onboardingTargetProgressSchema).max(16),
    milestones: onboardingMilestonesSchema,
    latestMilestone: onboardingLatestMilestoneSchema,
  }).strict().nullable(),
  attention: z.object({
    code: onboardingAttentionCodeSchema,
    detail: z.string().nullable(),
  }).strict().nullable(),
  readiness: z.array(onboardingFeatureReadinessSchema).length(4),
  actions: z.array(onboardingActionSchema).max(4),
  reveals: z.array(onboardingRevealSchema).max(3),
  observedAt: isoDateTime,
}).strict();
export type OnboardingReadinessResponse = z.infer<typeof onboardingReadinessResponseSchema>;
