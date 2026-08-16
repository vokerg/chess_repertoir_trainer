import { z } from 'zod';

export const dataLifecycleActionSchema = z.enum([
  'UNANALYSE_GAMES',
  'UNINDEX_GAMES',
  'PURGE_ACCOUNT_DATA',
  'DELETE_EXTERNAL_ACCOUNT',
  'DELETE_APP_USER',
]);
export type DataLifecycleAction = z.infer<typeof dataLifecycleActionSchema>;

export const dataLifecycleOperationStatusSchema = z.enum([
  'PREVIEWED',
  'QUEUED',
  'FENCING',
  'CANCEL_REQUESTED',
  'WAITING_FOR_DRAIN',
  'EXECUTING',
  'VERIFYING',
  'COMPLETED',
  'NEEDS_ATTENTION',
  'FAILED',
  'CANCELLED',
  'EXPIRED',
]);
export type DataLifecycleOperationStatus = z.infer<typeof dataLifecycleOperationStatusSchema>;

export const dataLifecycleResourceTypeSchema = z.enum(['USER', 'ACCOUNT', 'GAME']);
export type DataLifecycleResourceType = z.infer<typeof dataLifecycleResourceTypeSchema>;

export const dataLifecycleStopRequestSchema = z.enum([
  'NONE',
  'CANCEL',
  'STOP_AFTER_BATCH',
]);
export type DataLifecycleStopRequest = z.infer<typeof dataLifecycleStopRequestSchema>;

export const dataLifecycleTerminalResultSchema = z.enum([
  'COMPLETED',
  'CANCELLED_BEFORE_MUTATION',
  'FAILED_BEFORE_MUTATION',
  'NEEDS_ATTENTION',
  'EXPIRED',
]);
export type DataLifecycleTerminalResult = z.infer<typeof dataLifecycleTerminalResultSchema>;

export const dataLifecycleErrorCodeSchema = z.enum([
  'DATA_LIFECYCLE_CONFLICT',
  'DATA_LIFECYCLE_PREVIEW_EXPIRED',
  'DATA_LIFECYCLE_PREVIEW_INVALID',
  'DATA_LIFECYCLE_OWNERSHIP_CHANGED',
  'DATA_LIFECYCLE_WRITE_BLOCKED',
  'DATA_LIFECYCLE_CLAIM_LOST',
  'DATA_LIFECYCLE_INVALID_STATE',
  'DATA_LIFECYCLE_IDENTITY_DELETED',
  'DATA_LIFECYCLE_VERIFICATION_FAILED',
]);
export type DataLifecycleErrorCode = z.infer<typeof dataLifecycleErrorCodeSchema>;

export const importedGameOpeningProvenanceSchema = z.enum([
  'PROVIDER',
  'LOCAL_BOOK',
  'UNKNOWN',
  'NONE',
]);
export type ImportedGameOpeningProvenance = z.infer<typeof importedGameOpeningProvenanceSchema>;

export const dataLifecyclePreviewCountsSchema = z.object({
  accounts: z.number().int().nonnegative(),
  games: z.number().int().nonnegative(),
  plies: z.number().int().nonnegative(),
  analysisRuns: z.number().int().nonnegative(),
  aiReviews: z.number().int().nonnegative(),
  tacticalDetections: z.number().int().nonnegative(),
  scenarioSessions: z.number().int().nonnegative(),
  importRuns: z.number().int().nonnegative(),
  jobRuns: z.number().int().nonnegative(),
  preparationRuns: z.number().int().nonnegative(),
});
export type DataLifecyclePreviewCounts = z.infer<typeof dataLifecyclePreviewCountsSchema>;

export const dataLifecycleScopeSchema = z.discriminatedUnion('resourceType', [
  z.object({
    resourceType: z.literal('USER'),
    userId: z.number().int().positive(),
  }),
  z.object({
    resourceType: z.literal('ACCOUNT'),
    userId: z.number().int().positive(),
    accountId: z.number().int().positive(),
  }),
  z.object({
    resourceType: z.literal('GAME'),
    userId: z.number().int().positive(),
    accountId: z.number().int().positive(),
    gameIds: z.array(z.number().int().positive()).min(1).max(100),
  }),
]);
export type DataLifecycleScope = z.infer<typeof dataLifecycleScopeSchema>;
