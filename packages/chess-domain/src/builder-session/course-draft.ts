import type { AnalysisMergeMove, AnalysisMergeTree } from '../repertoire-merge-planner';
import {
  cloneTargetSnapshot,
  getActiveBuilderDecision,
  validateBuilderSessionSnapshot,
} from './internal';
import type {
  BuilderBranch,
  BuilderBranchStatus,
  BuilderSession,
} from './types';
import { BuilderSessionError } from './types';

export const BUILDER_COURSE_DRAFT_VERSION = '2026-07-v1' as const;

export type BuilderCourseDraftExclusionReason =
  | 'PENDING'
  | 'DEFERRED'
  | 'IGNORED'
  | 'STALE'
  | 'ANCESTOR_EXCLUDED';

export interface BuilderCourseDraftExcludedBranch {
  branchId: string;
  pathUci: string[];
  status: BuilderBranchStatus;
  reason: BuilderCourseDraftExclusionReason;
}

export interface BuilderCourseDraft<TTarget = unknown> {
  draftVersion: typeof BUILDER_COURSE_DRAFT_VERSION;
  sessionModelVersion: BuilderSession<TTarget>['modelVersion'];
  sessionId: string;
  ownerId: string;
  sessionRevision: number;
  sessionLifecycle: 'COMPLETED';
  targetRevision: number;
  targetContractVersion: string;
  targetId: string;
  targetCapturedAt: string;
  target: TTarget;
  repertoireSide: 'WHITE' | 'BLACK';
  startingFen: string;
  analysisTree: AnalysisMergeTree;
  materializedDecisionCount: number;
  materializedMoveCount: number;
  transpositionLeafCount: number;
  excludedBranches: BuilderCourseDraftExcludedBranch[];
}

/**
 * Projects an accepted builder session into the storage-neutral move tree used by
 * repertoire reintegration. Incoming moves whose child branch is unresolved are
 * intentionally omitted, while accepted/completed paths remain materializable.
 */
export function buildBuilderCourseDraft<TTarget>(
  session: BuilderSession<TTarget>,
): BuilderCourseDraft<TTarget> {
  validateBuilderSessionSnapshot(session);
  if (session.lifecycle !== 'COMPLETED') {
    throw new BuilderSessionError(
      'SESSION_NOT_ACTIVE',
      'Only a completed builder session can be reviewed for course materialization.',
    );
  }

  const branchesById = new Map(session.branches.map((branch) => [branch.id, branch]));
  const includedBranchIds = new Set<string>([session.rootBranchId]);
  let materializedDecisionCount = 0;
  let materializedMoveCount = 0;
  let transpositionLeafCount = 0;

  const buildChildren = (branch: BuilderBranch): AnalysisMergeMove[] => {
    if (branch.status !== 'ACCEPTED' && branch.status !== 'COMPLETED') return [];
    const decision = getActiveBuilderDecision(branch);
    if (!decision) {
      if (branch.status === 'ACCEPTED') {
        throw new BuilderSessionError(
          'INVALID_SNAPSHOT',
          `Accepted branch ${branch.id} has no active decision.`,
        );
      }
      return [];
    }

    const children: AnalysisMergeMove[] = [];
    for (const selectedMove of decision.selectedMoves) {
      const child = session.branches.find((candidate) => (
        candidate.parentBranchId === branch.id
        && candidate.originMoveUci === selectedMove.moveUci
      ));
      if (!child || branchesById.get(child.id) !== child) {
        throw new BuilderSessionError(
          'INVALID_SNAPSHOT',
          `Decision ${decision.id} has no matching child branch for ${selectedMove.moveUci}.`,
        );
      }
      if (!isResolvedForMaterialization(child.status)) continue;

      includedBranchIds.add(child.id);
      materializedMoveCount += 1;
      if (child.transpositionOfBranchId !== null) transpositionLeafCount += 1;
      children.push({
        moveUci: selectedMove.moveUci,
        children: child.transpositionOfBranchId === null ? buildChildren(child) : [],
      });
    }
    if (children.length > 0) materializedDecisionCount += 1;
    return children;
  };

  const root = branchesById.get(session.rootBranchId);
  if (!root) {
    throw new BuilderSessionError('INVALID_SNAPSHOT', 'Builder session root branch is missing.');
  }
  const analysisTree: AnalysisMergeTree = {
    rootFen: session.startingFen,
    children: buildChildren(root),
  };
  if (materializedMoveCount === 0) {
    throw new BuilderSessionError(
      'INVALID_DECISION',
      'The completed builder session contains no resolved accepted moves to materialize.',
    );
  }

  const excludedBranches = session.branches
    .filter((branch) => branch.id !== session.rootBranchId && !includedBranchIds.has(branch.id))
    .map((branch): BuilderCourseDraftExcludedBranch => ({
      branchId: branch.id,
      pathUci: [...branch.pathUci],
      status: branch.status,
      reason: exclusionReason(branch.status),
    }));
  const targetSnapshot = cloneTargetSnapshot(session.targetSnapshot);

  return {
    draftVersion: BUILDER_COURSE_DRAFT_VERSION,
    sessionModelVersion: session.modelVersion,
    sessionId: session.sessionId,
    ownerId: session.ownerId,
    sessionRevision: session.revision,
    sessionLifecycle: 'COMPLETED',
    targetRevision: session.targetRevision,
    targetContractVersion: targetSnapshot.contractVersion,
    targetId: targetSnapshot.targetId,
    targetCapturedAt: targetSnapshot.capturedAt,
    target: targetSnapshot.value,
    repertoireSide: session.repertoireSide,
    startingFen: session.startingFen,
    analysisTree,
    materializedDecisionCount,
    materializedMoveCount,
    transpositionLeafCount,
    excludedBranches,
  };
}

function isResolvedForMaterialization(status: BuilderBranchStatus): boolean {
  return status === 'ACCEPTED' || status === 'COMPLETED';
}

function exclusionReason(status: BuilderBranchStatus): BuilderCourseDraftExclusionReason {
  if (status === 'PENDING' || status === 'DEFERRED' || status === 'IGNORED' || status === 'STALE') {
    return status;
  }
  return 'ANCESTOR_EXCLUDED';
}
