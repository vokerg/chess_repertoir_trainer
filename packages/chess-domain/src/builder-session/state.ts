import { normalizeFenForPosition } from '../position';
import {
  appendToQueue,
  beginMutation,
  branchIdForPath,
  cloneEvidenceReference,
  cloneSession,
  cloneTargetSnapshot,
  ensureLimits,
  finishMutation,
  invalidateDescendants,
  markBranchAndDependantsStale,
  markSingleBranchStale,
  normalizeDecisionMoves,
  oppositeRole,
  removeFromQueue,
  requireBranch,
  requireNonEmpty,
  requireStatus,
  roleForPosition,
  supersedeActiveDecisions,
  validateBuilderSessionSnapshot,
  validateDecisionCardinality,
} from './internal';
import {
  AcceptBuilderDecisionInput,
  BuilderBranch,
  BuilderBranchMutationInput,
  BuilderDecision,
  BuilderDecisionMove,
  BuilderMutationContext,
  BuilderSession,
  BuilderSessionError,
  BUILDER_SESSION_MODEL_VERSION,
  CompleteBuilderBranchInput,
  CreateBuilderSessionInput,
  MarkBuilderBranchStaleInput,
  ReorderBuilderQueueInput,
  ReplaceBuilderTargetInput,
} from './types';

export function createBuilderSession<TTarget>(
  input: CreateBuilderSessionInput<TTarget>,
): BuilderSession<TTarget> {
  requireNonEmpty(input.sessionId, 'sessionId');
  requireNonEmpty(input.ownerId, 'ownerId');
  requireNonEmpty(input.targetSnapshot.contractVersion, 'target contract version');
  requireNonEmpty(input.targetSnapshot.targetId, 'targetId');
  const normalizedStartingFen = normalizeFenForPosition(input.startingFen);
  const root: BuilderBranch = {
    id: 'root',
    parentBranchId: null,
    originMoveUci: null,
    pathUci: [],
    fen: input.startingFen,
    normalizedFen: normalizedStartingFen,
    role: roleForPosition(normalizedStartingFen, input.repertoireSide),
    status: 'PENDING',
    decisionHistory: [],
    transpositionOfBranchId: null,
    completion: null,
    stale: null,
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
  };
  return {
    modelVersion: BUILDER_SESSION_MODEL_VERSION,
    sessionId: input.sessionId,
    ownerId: input.ownerId,
    revision: 0,
    lifecycle: 'ACTIVE',
    targetRevision: 1,
    targetSnapshot: cloneTargetSnapshot(input.targetSnapshot),
    repertoireSide: input.repertoireSide,
    startingFen: input.startingFen,
    normalizedStartingFen,
    rootBranchId: root.id,
    branches: [root],
    queue: [root.id],
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
    completedAt: null,
    abandonedAt: null,
  };
}

export function acceptBuilderDecision<TTarget>(
  session: BuilderSession<TTarget>,
  input: AcceptBuilderDecisionInput,
): BuilderSession<TTarget> {
  const next = beginMutation(session, input);
  const branch = requireBranch(next, input.branchId);
  if (branch.status === 'IGNORED') {
    throw new BuilderSessionError('INVALID_BRANCH_STATUS', 'Ignored branches cannot accept decisions.');
  }
  const selectedMoves = normalizeDecisionMoves(input.selectedMoves);
  validateDecisionCardinality(branch.role, selectedMoves);
  invalidateDescendants(next, branch.id, input.at, 'ANCESTOR_CHANGED', null);
  supersedeActiveDecisions(branch, input.at, 'SUPERSEDED');

  const decisionRevision = branch.decisionHistory.length + 1;
  const decision: BuilderDecision = {
    id: `${branch.id}#${decisionRevision}`,
    revision: decisionRevision,
    status: 'ACTIVE',
    role: branch.role,
    evidence: cloneEvidenceReference(input.evidence),
    selectedMoves,
    acceptedAt: input.at,
    supersededAt: null,
  };
  branch.decisionHistory.push(decision);
  branch.status = 'ACCEPTED';
  branch.transpositionOfBranchId = null;
  branch.completion = null;
  branch.stale = null;
  branch.updatedAt = input.at;
  removeFromQueue(next, branch.id);

  for (const selectedMove of selectedMoves) {
    upsertChildBranch(next, branch, selectedMove, input.at);
  }
  ensureLimits(next);
  return finishMutation(next, input.at);
}

export function deferBuilderBranch<TTarget>(
  session: BuilderSession<TTarget>,
  input: BuilderBranchMutationInput,
): BuilderSession<TTarget> {
  const next = beginMutation(session, input);
  const branch = requireBranch(next, input.branchId);
  requireStatus(branch, ['PENDING'], 'Only pending branches can be deferred.');
  branch.status = 'DEFERRED';
  branch.updatedAt = input.at;
  removeFromQueue(next, branch.id);
  return finishMutation(next, input.at);
}

export function reopenBuilderBranch<TTarget>(
  session: BuilderSession<TTarget>,
  input: BuilderBranchMutationInput,
): BuilderSession<TTarget> {
  const next = beginMutation(session, input);
  const branch = requireBranch(next, input.branchId);
  requireStatus(branch, ['DEFERRED'], 'Only deferred branches can be reopened.');
  branch.status = 'PENDING';
  branch.updatedAt = input.at;
  appendToQueue(next, branch.id);
  ensureLimits(next);
  return finishMutation(next, input.at);
}

export function restartStaleBuilderBranch<TTarget>(
  session: BuilderSession<TTarget>,
  input: BuilderBranchMutationInput,
): BuilderSession<TTarget> {
  const next = beginMutation(session, input);
  const branch = requireBranch(next, input.branchId);
  requireStatus(branch, ['STALE'], 'Only stale branches can be restarted.');
  invalidateDescendants(next, branch.id, input.at, 'ANCESTOR_CHANGED', null);
  branch.status = 'PENDING';
  branch.transpositionOfBranchId = null;
  branch.completion = null;
  branch.stale = null;
  branch.updatedAt = input.at;
  appendToQueue(next, branch.id);
  ensureLimits(next);
  return finishMutation(next, input.at);
}

export function ignoreBuilderBranch<TTarget>(
  session: BuilderSession<TTarget>,
  input: BuilderBranchMutationInput,
): BuilderSession<TTarget> {
  const next = beginMutation(session, input);
  const branch = requireBranch(next, input.branchId);
  requireStatus(
    branch,
    ['PENDING', 'DEFERRED', 'STALE'],
    'Only unresolved branches can be ignored.',
  );
  invalidateDescendants(next, branch.id, input.at, 'ANCESTOR_CHANGED', null);
  supersedeActiveDecisions(branch, input.at, 'STALE');
  branch.status = 'IGNORED';
  branch.transpositionOfBranchId = null;
  branch.completion = null;
  branch.stale = null;
  branch.updatedAt = input.at;
  removeFromQueue(next, branch.id);
  return finishMutation(next, input.at);
}

export function completeBuilderBranch<TTarget>(
  session: BuilderSession<TTarget>,
  input: CompleteBuilderBranchInput,
): BuilderSession<TTarget> {
  const next = beginMutation(session, input);
  const branch = requireBranch(next, input.branchId);
  requireStatus(
    branch,
    ['PENDING', 'DEFERRED', 'STALE', 'ACCEPTED'],
    'Only active draft branches can be completed.',
  );
  branch.status = 'COMPLETED';
  branch.completion = { reason: input.reason, completedAt: input.at };
  branch.stale = null;
  branch.updatedAt = input.at;
  removeFromQueue(next, branch.id);
  return finishMutation(next, input.at);
}

export function markBuilderBranchStale<TTarget>(
  session: BuilderSession<TTarget>,
  input: MarkBuilderBranchStaleInput,
): BuilderSession<TTarget> {
  const next = beginMutation(session, input);
  requireBranch(next, input.branchId);
  markBranchAndDependantsStale(
    next,
    input.branchId,
    input.at,
    input.reason,
    input.sourceVersion ?? null,
  );
  appendToQueue(next, input.branchId);
  ensureLimits(next);
  return finishMutation(next, input.at);
}

export function replaceBuilderTarget<TTarget>(
  session: BuilderSession<TTarget>,
  input: ReplaceBuilderTargetInput<TTarget>,
): BuilderSession<TTarget> {
  const next = beginMutation(session, input);
  requireNonEmpty(input.targetSnapshot.contractVersion, 'target contract version');
  requireNonEmpty(input.targetSnapshot.targetId, 'targetId');
  next.targetSnapshot = cloneTargetSnapshot(input.targetSnapshot);
  next.targetRevision += 1;
  for (const branch of next.branches) {
    markSingleBranchStale(branch, input.at, 'TARGET_CHANGED', input.targetSnapshot.targetId);
  }
  next.queue = [next.rootBranchId];
  ensureLimits(next);
  return finishMutation(next, input.at);
}

export function reorderBuilderQueue<TTarget>(
  session: BuilderSession<TTarget>,
  input: ReorderBuilderQueueInput,
): BuilderSession<TTarget> {
  const next = beginMutation(session, input);
  const currentIndex = next.queue.indexOf(input.branchId);
  if (currentIndex < 0) {
    throw new BuilderSessionError('INVALID_BRANCH_STATUS', 'Only queued branches can be reordered.');
  }
  if (
    !Number.isInteger(input.targetIndex)
    || input.targetIndex < 0
    || input.targetIndex >= next.queue.length
  ) {
    throw new BuilderSessionError('INVALID_DECISION', 'Queue target index is out of range.');
  }
  next.queue.splice(currentIndex, 1);
  next.queue.splice(input.targetIndex, 0, input.branchId);
  return finishMutation(next, input.at);
}

export function completeBuilderSession<TTarget>(
  session: BuilderSession<TTarget>,
  input: BuilderMutationContext,
): BuilderSession<TTarget> {
  const next = beginMutation(session, input);
  if (next.queue.length > 0) {
    throw new BuilderSessionError(
      'INVALID_BRANCH_STATUS',
      'A builder session cannot complete while pending or stale branches remain queued.',
    );
  }
  next.lifecycle = 'COMPLETED';
  next.completedAt = input.at;
  return finishMutation(next, input.at);
}

export function abandonBuilderSession<TTarget>(
  session: BuilderSession<TTarget>,
  input: BuilderMutationContext,
): BuilderSession<TTarget> {
  const next = beginMutation(session, input);
  next.lifecycle = 'ABANDONED';
  next.abandonedAt = input.at;
  return finishMutation(next, input.at);
}

export function resumeBuilderSession<TTarget>(
  snapshot: BuilderSession<TTarget>,
  input: { ownerId: string; expectedRevision?: number },
): BuilderSession<TTarget> {
  validateBuilderSessionSnapshot(snapshot);
  if (snapshot.ownerId !== input.ownerId) {
    throw new BuilderSessionError('OWNER_MISMATCH', 'Builder session owner does not match.');
  }
  if (input.expectedRevision !== undefined && snapshot.revision !== input.expectedRevision) {
    throw new BuilderSessionError('REVISION_CONFLICT', 'Builder session revision does not match.');
  }
  return cloneSession(snapshot);
}

function upsertChildBranch<TTarget>(
  session: BuilderSession<TTarget>,
  parent: BuilderBranch,
  selectedMove: BuilderDecisionMove,
  at: string,
): void {
  const pathUci = [...parent.pathUci, selectedMove.moveUci];
  const childId = branchIdForPath(pathUci);
  const role = oppositeRole(parent.role);
  let child = session.branches.find((branch) => branch.id === childId);
  if (!child) {
    child = createChildBranch(parent, selectedMove, pathUci, childId, role, at);
    session.branches.push(child);
  } else {
    resetChildBranch(child, parent, selectedMove, pathUci, role, at);
  }

  const transposition = session.branches.find((candidate) => (
    candidate.id !== child.id
      && candidate.normalizedFen === child.normalizedFen
      && candidate.role === child.role
      && (candidate.status === 'ACCEPTED' || candidate.status === 'COMPLETED')
  ));
  if (transposition) {
    child.transpositionOfBranchId = transposition.id;
    child.status = 'COMPLETED';
    child.completion = { reason: 'TRANSPOSED', completedAt: at };
    removeFromQueue(session, child.id);
  } else {
    appendToQueue(session, child.id);
  }
}

function createChildBranch(
  parent: BuilderBranch,
  selectedMove: BuilderDecisionMove,
  pathUci: string[],
  childId: string,
  role: BuilderBranch['role'],
  at: string,
): BuilderBranch {
  return {
    id: childId,
    parentBranchId: parent.id,
    originMoveUci: selectedMove.moveUci,
    pathUci,
    fen: selectedMove.resultingFen,
    normalizedFen: selectedMove.resultingNormalizedFen,
    role,
    status: 'PENDING',
    decisionHistory: [],
    transpositionOfBranchId: null,
    completion: null,
    stale: null,
    createdAt: at,
    updatedAt: at,
  };
}

function resetChildBranch(
  child: BuilderBranch,
  parent: BuilderBranch,
  selectedMove: BuilderDecisionMove,
  pathUci: string[],
  role: BuilderBranch['role'],
  at: string,
): void {
  child.parentBranchId = parent.id;
  child.originMoveUci = selectedMove.moveUci;
  child.pathUci = pathUci;
  child.fen = selectedMove.resultingFen;
  child.normalizedFen = selectedMove.resultingNormalizedFen;
  child.role = role;
  child.status = 'PENDING';
  child.transpositionOfBranchId = null;
  child.completion = null;
  child.stale = null;
  child.updatedAt = at;
}
