export const BUILDER_SESSION_MODEL_VERSION = '2026-07-v1' as const;
export const BUILDER_SESSION_MAX_BRANCHES = 256;
export const BUILDER_SESSION_MAX_QUEUE = 128;
export const BUILDER_SESSION_MAX_SELECTED_MOVES = 8;
export const BUILDER_SESSION_MAX_PREVIEW_NODES = 256;

export type BuilderSessionLifecycle = 'ACTIVE' | 'COMPLETED' | 'ABANDONED';
export type BuilderDecisionRole = 'USER_MOVE' | 'OPPONENT_RESPONSE';
export type BuilderBranchStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'DEFERRED'
  | 'IGNORED'
  | 'COMPLETED'
  | 'STALE';
export type BuilderDecisionStatus = 'ACTIVE' | 'SUPERSEDED' | 'STALE';
export type BuilderStaleReason =
  | 'ANCESTOR_CHANGED'
  | 'TARGET_CHANGED'
  | 'EVIDENCE_CHANGED'
  | 'SOURCE_COURSE_CHANGED';
export type BuilderCompletionReason =
  | 'USER_STOP'
  | 'COVERAGE_REACHED'
  | 'DEPTH_LIMIT'
  | 'THEORY_LIMIT'
  | 'FORCED_LINE'
  | 'TRANSPOSED';

export type BuilderSessionErrorCode =
  | 'OWNER_MISMATCH'
  | 'REVISION_CONFLICT'
  | 'SESSION_NOT_ACTIVE'
  | 'BRANCH_NOT_FOUND'
  | 'INVALID_BRANCH_STATUS'
  | 'INVALID_DECISION'
  | 'SESSION_LIMIT_EXCEEDED'
  | 'INVALID_SNAPSHOT';

export class BuilderSessionError extends Error {
  constructor(
    public readonly code: BuilderSessionErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'BuilderSessionError';
  }
}

export interface BuilderTargetSnapshot<TTarget = unknown> {
  contractVersion: string;
  targetId: string;
  capturedAt: string;
  value: TTarget;
}

export interface BuilderEvidenceReference {
  candidateContractVersion: string;
  rankingPolicyVersion: string;
  generatedAt: string;
  normalizedFen: string;
  sourceVersions: Record<string, string>;
}

export interface BuilderDecisionMoveInput {
  moveUci: string;
  moveSan: string;
  resultingFen: string;
  candidateRank?: number | null;
  coverageContributionPercent?: number | null;
  reasonCodes?: readonly string[];
  warningCodes?: readonly string[];
}

export interface BuilderDecisionMove {
  moveUci: string;
  moveSan: string;
  resultingFen: string;
  resultingNormalizedFen: string;
  candidateRank: number | null;
  coverageContributionPercent: number | null;
  reasonCodes: string[];
  warningCodes: string[];
}

export interface BuilderDecision {
  id: string;
  revision: number;
  status: BuilderDecisionStatus;
  role: BuilderDecisionRole;
  evidence: BuilderEvidenceReference;
  selectedMoves: BuilderDecisionMove[];
  acceptedAt: string;
  supersededAt: string | null;
}

export interface BuilderBranchStaleState {
  reason: BuilderStaleReason;
  markedAt: string;
  sourceVersion: string | null;
}

export interface BuilderBranchCompletion {
  reason: BuilderCompletionReason;
  completedAt: string;
}

export interface BuilderBranch {
  id: string;
  parentBranchId: string | null;
  originMoveUci: string | null;
  pathUci: string[];
  fen: string;
  normalizedFen: string;
  role: BuilderDecisionRole;
  status: BuilderBranchStatus;
  decisionHistory: BuilderDecision[];
  transpositionOfBranchId: string | null;
  completion: BuilderBranchCompletion | null;
  stale: BuilderBranchStaleState | null;
  createdAt: string;
  updatedAt: string;
}

export interface BuilderSession<TTarget = unknown> {
  modelVersion: typeof BUILDER_SESSION_MODEL_VERSION;
  sessionId: string;
  ownerId: string;
  revision: number;
  lifecycle: BuilderSessionLifecycle;
  targetRevision: number;
  targetSnapshot: BuilderTargetSnapshot<TTarget>;
  repertoireSide: 'WHITE' | 'BLACK';
  startingFen: string;
  normalizedStartingFen: string;
  rootBranchId: string;
  branches: BuilderBranch[];
  queue: string[];
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  abandonedAt: string | null;
}

export interface BuilderMutationContext {
  ownerId: string;
  expectedRevision: number;
  at: string;
}

export interface CreateBuilderSessionInput<TTarget> {
  sessionId: string;
  ownerId: string;
  targetSnapshot: BuilderTargetSnapshot<TTarget>;
  repertoireSide: 'WHITE' | 'BLACK';
  startingFen: string;
  createdAt: string;
}

export interface AcceptBuilderDecisionInput extends BuilderMutationContext {
  branchId: string;
  evidence: BuilderEvidenceReference;
  selectedMoves: readonly BuilderDecisionMoveInput[];
}

export interface BuilderBranchMutationInput extends BuilderMutationContext {
  branchId: string;
}

export interface CompleteBuilderBranchInput extends BuilderBranchMutationInput {
  reason: Exclude<BuilderCompletionReason, 'TRANSPOSED'>;
}

export interface MarkBuilderBranchStaleInput extends BuilderBranchMutationInput {
  reason: Exclude<BuilderStaleReason, 'ANCESTOR_CHANGED' | 'TARGET_CHANGED'>;
  sourceVersion?: string | null;
}

export interface ReplaceBuilderTargetInput<TTarget> extends BuilderMutationContext {
  targetSnapshot: BuilderTargetSnapshot<TTarget>;
}

export interface ReorderBuilderQueueInput extends BuilderBranchMutationInput {
  targetIndex: number;
}

export interface BuilderPreviewDecision {
  id: string;
  revision: number;
  role: BuilderDecisionRole;
  selectedMoves: BuilderDecisionMove[];
  evidence: BuilderEvidenceReference;
}

export interface BuilderPreviewNode {
  branchId: string;
  parentBranchId: string | null;
  pathUci: string[];
  fen: string;
  normalizedFen: string;
  role: BuilderDecisionRole;
  status: BuilderBranchStatus;
  activeDecision: BuilderPreviewDecision | null;
  transpositionOfBranchId: string | null;
  completion: BuilderBranchCompletion | null;
  stale: BuilderBranchStaleState | null;
  children: BuilderPreviewNode[];
}

export interface BuilderSessionPreview {
  sessionId: string;
  revision: number;
  lifecycle: BuilderSessionLifecycle;
  targetRevision: number;
  tree: BuilderPreviewNode;
  queue: Array<{
    branchId: string;
    status: 'PENDING' | 'STALE';
    role: BuilderDecisionRole;
    pathUci: string[];
    normalizedFen: string;
  }>;
  statusCounts: Record<BuilderBranchStatus, number>;
  truncated: boolean;
  omittedBranchCount: number;
}
