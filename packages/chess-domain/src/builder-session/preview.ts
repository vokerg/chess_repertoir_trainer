import {
  cloneDecisionMove,
  cloneEvidenceReference,
  emptyStatusCounts,
  getActiveBuilderDecision,
  requireBranch,
} from './internal';
import {
  BUILDER_SESSION_MAX_PREVIEW_NODES,
  BuilderPreviewNode,
  BuilderSession,
  BuilderSessionError,
  BuilderSessionPreview,
} from './types';

export function buildBuilderSessionPreview<TTarget>(
  session: BuilderSession<TTarget>,
  maxNodes = BUILDER_SESSION_MAX_PREVIEW_NODES,
): BuilderSessionPreview {
  if (
    !Number.isInteger(maxNodes)
    || maxNodes < 1
    || maxNodes > BUILDER_SESSION_MAX_PREVIEW_NODES
  ) {
    throw new BuilderSessionError('INVALID_SNAPSHOT', 'Preview node limit is invalid.');
  }
  const branchesByParent = new Map<string | null, typeof session.branches>();
  for (const branch of session.branches) {
    const children = branchesByParent.get(branch.parentBranchId) ?? [];
    children.push(branch);
    branchesByParent.set(branch.parentBranchId, children);
  }
  let included = 0;
  const visit = (branchId: string): BuilderPreviewNode => {
    const branch = requireBranch(session, branchId);
    included += 1;
    const children: BuilderPreviewNode[] = [];
    for (const child of branchesByParent.get(branch.id) ?? []) {
      if (included >= maxNodes) break;
      children.push(visit(child.id));
    }
    const activeDecision = getActiveBuilderDecision(branch);
    return {
      branchId: branch.id,
      parentBranchId: branch.parentBranchId,
      pathUci: [...branch.pathUci],
      fen: branch.fen,
      normalizedFen: branch.normalizedFen,
      role: branch.role,
      status: branch.status,
      activeDecision: activeDecision
        ? {
            id: activeDecision.id,
            revision: activeDecision.revision,
            role: activeDecision.role,
            selectedMoves: activeDecision.selectedMoves.map(cloneDecisionMove),
            evidence: cloneEvidenceReference(activeDecision.evidence),
          }
        : null,
      transpositionOfBranchId: branch.transpositionOfBranchId,
      completion: branch.completion ? { ...branch.completion } : null,
      stale: branch.stale ? { ...branch.stale } : null,
      children,
    };
  };
  const statusCounts = emptyStatusCounts();
  for (const branch of session.branches) statusCounts[branch.status] += 1;
  return {
    sessionId: session.sessionId,
    revision: session.revision,
    lifecycle: session.lifecycle,
    targetRevision: session.targetRevision,
    tree: visit(session.rootBranchId),
    queue: session.queue.map((branchId) => {
      const branch = requireBranch(session, branchId);
      if (branch.status !== 'PENDING' && branch.status !== 'STALE') {
        throw new BuilderSessionError(
          'INVALID_SNAPSHOT',
          `Queued branch ${branchId} is not pending or stale.`,
        );
      }
      return {
        branchId,
        status: branch.status,
        role: branch.role,
        pathUci: [...branch.pathUci],
        normalizedFen: branch.normalizedFen,
      };
    }),
    statusCounts,
    truncated: included < session.branches.length,
    omittedBranchCount: Math.max(0, session.branches.length - included),
  };
}
