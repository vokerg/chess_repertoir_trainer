export const POSITION_CLEANUP_TABLE_LOCK_ORDER = [
  'ImportedGamePly',
  'ImportedGamePosition',
  'PositionAnalysis',
  'MastersExplorerCache',
] as const;

export type PositionCleanupMode = 'DRY_RUN' | 'EXECUTE';
export type PositionCleanupStatus =
  | 'QUEUED'
  | 'RUNNING'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NEEDS_ATTENTION'
  | 'FAILED';
export type PositionCleanupPhase = 'RECONCILE' | 'OBSERVE' | 'EVALUATE' | 'DONE';
export type PositionCleanupTerminalResult =
  | 'OBSERVATIONAL'
  | 'EXECUTED'
  | 'CANCELLED'
  | 'NEEDS_ATTENTION'
  | 'FAILED';

export interface PositionCleanupRun {
  id: number;
  mode: PositionCleanupMode;
  status: PositionCleanupStatus;
  phase: PositionCleanupPhase;
  policyVersion: string;
  graceDays: number;
  graceCutoff: Date;
  inputPageSize: number;
  deleteBatchSize: number;
  lockTimeoutMs: number;
  requestedBy: string;
  reconcileUpperBound: number;
  positionUpperBound: number;
  evaluationUpperBound: number | null;
  reconcileAfterPositionId: number;
  observeAfterPositionId: number;
  evaluateAfterPositionId: number;
  candidatesInspected: number;
  candidatesReconciled: number;
  positionsInspected: number;
  orphansObserved: number;
  eligibleObserved: number;
  positionsDeleted: number;
  analysisRowsDeleted: number;
  cacheRowsDeleted: number;
  skippedReferenced: number;
  retryCount: number;
  staleRecoveryCount: number;
  workKey: string | null;
  claimedAt: Date | null;
  heartbeatAt: Date | null;
  cancelRequestedAt: Date | null;
  observationStartedAt: Date | null;
  observationCompletedAt: Date | null;
  lastBatchAt: Date | null;
  terminalResult: PositionCleanupTerminalResult | null;
  errorCode: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePositionCleanupRunInput {
  mode: PositionCleanupMode;
  policyVersion: string;
  graceDays: number;
  graceCutoff: Date;
  inputPageSize: number;
  deleteBatchSize: number;
  lockTimeoutMs: number;
  requestedBy: string;
}

export interface PositionCleanupBatchResult {
  inspected: number;
  matched: number;
  checkpoint: number;
  completedPhase: boolean;
}

export interface PositionCleanupDeleteBatchResult extends PositionCleanupBatchResult {
  deleted: number;
  analysisRowsDeleted: number;
  cacheRowsDeleted: number;
  skippedReferenced: number;
}

export function isPositionCleanupTerminal(status: PositionCleanupStatus): boolean {
  return ['COMPLETED', 'CANCELLED', 'NEEDS_ATTENTION', 'FAILED'].includes(status);
}
