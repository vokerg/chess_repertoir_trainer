export const preparationPurposes = ['ONBOARDING', 'EXPANSION', 'RECOVERY'] as const;
export type PreparationPurpose = typeof preparationPurposes[number];

export const preparationRunStatuses = [
  'QUEUED',
  'RUNNING',
  'PAUSE_REQUESTED',
  'PAUSED',
  'CANCEL_REQUESTED',
  'NEEDS_ATTENTION',
  'COMPLETED',
  'CANCELLED',
  'FAILED',
] as const;
export type PreparationRunStatus = typeof preparationRunStatuses[number];

export const nonTerminalPreparationRunStatuses = [
  'QUEUED',
  'RUNNING',
  'PAUSE_REQUESTED',
  'PAUSED',
  'CANCEL_REQUESTED',
  'NEEDS_ATTENTION',
] as const satisfies readonly PreparationRunStatus[];

export const preparationStages = ['INDEX', 'ANALYSIS'] as const;
export type PreparationStage = typeof preparationStages[number];

export const preparationLanes = [
  'FIRST_INDEX',
  'FIRST_ANALYSIS',
  'INDEX_CONTINUATION',
  'ANALYSIS_TAIL',
  'RETRY',
] as const;
export type PreparationLane = typeof preparationLanes[number];

export const preparationBatchStatuses = [
  'QUEUED',
  'RUNNING',
  'COMPLETED',
  'PARTIALLY_FAILED',
  'FAILED',
  'CANCELLED',
] as const;
export type PreparationBatchStatus = typeof preparationBatchStatuses[number];

export interface PreparationScopeSnapshot {
  rated?: 'ANY' | 'RATED' | 'UNRATED';
  speedCategories?: string[];
  variants?: string[];
}

export interface CreatePreparationTargetInput {
  accountId: number;
  ordinal: number;
  scopeVersion: number;
  scopeHash: string;
  scope: PreparationScopeSnapshot;
  requestedFrom: Date;
  requestedTo: Date;
  currentImportRunId?: number | null;
}

export interface CreatePreparationRunInput {
  userId: number;
  purpose: PreparationPurpose;
  recipeVersion: number;
  recipe: unknown;
  retryOfRunId?: number | null;
  retryGeneration?: number;
  targets: CreatePreparationTargetInput[];
}

export interface StoredPreparationRun {
  id: number;
  userId: number;
  purpose: PreparationPurpose;
  status: PreparationRunStatus;
  recipeVersion: number;
  retryGeneration: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface StoredPreparationTarget {
  id: number;
  preparationRunId: number;
  accountId: number | null;
  ordinal: number;
  requestedFrom: Date;
  requestedTo: Date;
}

export interface CreatedPreparationRun {
  run: StoredPreparationRun;
  targets: StoredPreparationTarget[];
}

export interface AdmitPreparationBatchInput {
  userId: number;
  preparationRunId: number;
  targetId: number;
  stage: PreparationStage;
  lane: PreparationLane;
  force?: boolean;
  retryFailed?: boolean;
  /**
   * Internal preparation-control flag. When true, creation of this RETRY batch
   * and incrementing the parent retry generation are one database transaction.
   */
  startRetryGeneration?: boolean;
}

export type PreparationAdmissionBlockedReason =
  | 'RUN_NOT_ADMITTABLE'
  | 'ACTIVE_STAGE_BATCH'
  | 'GLOBAL_BATCH_CAPACITY'
  | 'GLOBAL_TASK_CAPACITY'
  | 'GLOBAL_ANALYSIS_CAPACITY'
  | 'NO_ELIGIBLE_GAMES';

export type PreparationBatchAdmission =
  | {
      outcome: 'CREATED';
      batchId: number;
      jobRunId: number;
      importedGameIds: number[];
      plannedLimit: number;
      retryGeneration?: number;
    }
  | {
      outcome: 'BLOCKED';
      reason: PreparationAdmissionBlockedReason;
    };
