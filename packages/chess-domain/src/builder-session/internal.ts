import { normalizeFenForPosition } from '../position';
import {
  BUILDER_SESSION_MAX_BRANCHES,
  BUILDER_SESSION_MAX_QUEUE,
  BUILDER_SESSION_MAX_SELECTED_MOVES,
  BUILDER_SESSION_MODEL_VERSION,
  BuilderBranch,
  BuilderBranchStatus,
  BuilderDecision,
  BuilderDecisionMove,
  BuilderDecisionMoveInput,
  BuilderDecisionRole,
  BuilderDecisionStatus,
  BuilderEvidenceReference,
  BuilderMutationContext,
  BuilderSession,
  BuilderSessionError,
  BuilderStaleReason,
  BuilderTargetSnapshot,
} from './types';

export function beginMutation<TTarget>(
  session: BuilderSession<TTarget>,
  input: BuilderMutationContext,
): BuilderSession<TTarget> {
  if (session.ownerId !== input.ownerId) {
    throw new BuilderSessionError('OWNER_MISMATCH', 'Builder session owner does not match.');
  }
  if (session.revision !== input.expectedRevision) {
    throw new BuilderSessionError('REVISION_CONFLICT', 'Builder session revision does not match.');
  }
  if (session.lifecycle !== 'ACTIVE') {
    throw new BuilderSessionError('SESSION_NOT_ACTIVE', 'Builder session is not active.');
  }
  return cloneSession(session);
}

export function finishMutation<TTarget>(
  session: BuilderSession<TTarget>,
  at: string,
): BuilderSession<TTarget> {
  session.revision += 1;
  session.updatedAt = at;
  return session;
}

export function cloneSession<TTarget>(session: BuilderSession<TTarget>): BuilderSession<TTarget> {
  return {
    ...session,
    targetSnapshot: cloneTargetSnapshot(session.targetSnapshot),
    branches: session.branches.map((branch) => ({
      ...branch,
      pathUci: [...branch.pathUci],
      decisionHistory: branch.decisionHistory.map((decision) => ({
        ...decision,
        evidence: cloneEvidenceReference(decision.evidence),
        selectedMoves: decision.selectedMoves.map(cloneDecisionMove),
      })),
      completion: branch.completion ? { ...branch.completion } : null,
      stale: branch.stale ? { ...branch.stale } : null,
    })),
    queue: [...session.queue],
  };
}

export function cloneTargetSnapshot<TTarget>(
  snapshot: BuilderTargetSnapshot<TTarget>,
): BuilderTargetSnapshot<TTarget> {
  return { ...snapshot };
}

export function cloneEvidenceReference(reference: BuilderEvidenceReference): BuilderEvidenceReference {
  return { ...reference, sourceVersions: { ...reference.sourceVersions } };
}

export function cloneDecisionMove(move: BuilderDecisionMove): BuilderDecisionMove {
  return {
    ...move,
    reasonCodes: [...move.reasonCodes],
    warningCodes: [...move.warningCodes],
  };
}

export function requireBranch<TTarget>(
  session: BuilderSession<TTarget>,
  branchId: string,
): BuilderBranch {
  const branch = session.branches.find((candidate) => candidate.id === branchId);
  if (!branch) {
    throw new BuilderSessionError('BRANCH_NOT_FOUND', `Builder branch ${branchId} was not found.`);
  }
  return branch;
}

export function requireStatus(
  branch: BuilderBranch,
  allowed: readonly BuilderBranchStatus[],
  message: string,
): void {
  if (!allowed.includes(branch.status)) {
    throw new BuilderSessionError('INVALID_BRANCH_STATUS', message);
  }
}

export function requireNonEmpty(value: string, field: string): void {
  if (!value.trim()) {
    throw new BuilderSessionError('INVALID_DECISION', `${field} must not be empty.`);
  }
}

export function normalizeDecisionMoves(
  inputs: readonly BuilderDecisionMoveInput[],
): BuilderDecisionMove[] {
  if (inputs.length < 1 || inputs.length > BUILDER_SESSION_MAX_SELECTED_MOVES) {
    throw new BuilderSessionError(
      'INVALID_DECISION',
      `A decision must select between 1 and ${BUILDER_SESSION_MAX_SELECTED_MOVES} moves.`,
    );
  }
  const seen = new Set<string>();
  return inputs.map((input) => {
    if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/i.test(input.moveUci)) {
      throw new BuilderSessionError('INVALID_DECISION', `Invalid UCI move ${input.moveUci}.`);
    }
    const moveUci = input.moveUci.toLowerCase();
    if (seen.has(moveUci)) {
      throw new BuilderSessionError('INVALID_DECISION', `Move ${moveUci} is selected more than once.`);
    }
    seen.add(moveUci);
    requireNonEmpty(input.moveSan, 'move SAN');
    const coverage = input.coverageContributionPercent ?? null;
    if (coverage !== null && (!Number.isFinite(coverage) || coverage < 0 || coverage > 100)) {
      throw new BuilderSessionError(
        'INVALID_DECISION',
        'Coverage contribution must be between 0 and 100.',
      );
    }
    return {
      moveUci,
      moveSan: input.moveSan,
      resultingFen: input.resultingFen,
      resultingNormalizedFen: normalizeFenForPosition(input.resultingFen),
      candidateRank: input.candidateRank ?? null,
      coverageContributionPercent: coverage,
      reasonCodes: [...(input.reasonCodes ?? [])],
      warningCodes: [...(input.warningCodes ?? [])],
    };
  });
}

export function validateDecisionCardinality(
  role: BuilderDecisionRole,
  selectedMoves: readonly BuilderDecisionMove[],
): void {
  if (role === 'USER_MOVE' && selectedMoves.length !== 1) {
    throw new BuilderSessionError(
      'INVALID_DECISION',
      'A user-move decision must select exactly one move.',
    );
  }
}

export function supersedeActiveDecisions(
  branch: BuilderBranch,
  at: string,
  status: Extract<BuilderDecisionStatus, 'SUPERSEDED' | 'STALE'>,
): void {
  for (const decision of branch.decisionHistory) {
    if (decision.status === 'ACTIVE') {
      decision.status = status;
      decision.supersededAt = at;
    }
  }
}

export function invalidateDescendants<TTarget>(
  session: BuilderSession<TTarget>,
  branchId: string,
  at: string,
  reason: BuilderStaleReason,
  sourceVersion: string | null,
): void {
  for (const descendantId of collectDescendantIds(session, branchId)) {
    markSingleBranchStale(requireBranch(session, descendantId), at, reason, sourceVersion);
    removeFromQueue(session, descendantId);
  }
}

export function markBranchAndDependantsStale<TTarget>(
  session: BuilderSession<TTarget>,
  branchId: string,
  at: string,
  reason: BuilderStaleReason,
  sourceVersion: string | null,
): void {
  const affected = new Set<string>([branchId, ...collectDescendantIds(session, branchId)]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const branch of session.branches) {
      if (
        branch.transpositionOfBranchId
        && affected.has(branch.transpositionOfBranchId)
        && !affected.has(branch.id)
      ) {
        affected.add(branch.id);
        for (const descendantId of collectDescendantIds(session, branch.id)) {
          affected.add(descendantId);
        }
        changed = true;
      }
    }
  }
  for (const affectedId of affected) {
    markSingleBranchStale(requireBranch(session, affectedId), at, reason, sourceVersion);
    removeFromQueue(session, affectedId);
  }
}

export function markSingleBranchStale(
  branch: BuilderBranch,
  at: string,
  reason: BuilderStaleReason,
  sourceVersion: string | null,
): void {
  supersedeActiveDecisions(branch, at, 'STALE');
  branch.status = 'STALE';
  branch.completion = null;
  branch.stale = { reason, markedAt: at, sourceVersion };
  branch.updatedAt = at;
}

export function collectDescendantIds<TTarget>(
  session: BuilderSession<TTarget>,
  branchId: string,
): string[] {
  const result: string[] = [];
  const pending = [branchId];
  while (pending.length > 0) {
    const parentId = pending.shift()!;
    for (const branch of session.branches) {
      if (branch.parentBranchId === parentId) {
        result.push(branch.id);
        pending.push(branch.id);
      }
    }
  }
  return result;
}

export function appendToQueue<TTarget>(session: BuilderSession<TTarget>, branchId: string): void {
  if (!session.queue.includes(branchId)) session.queue.push(branchId);
}

export function removeFromQueue<TTarget>(session: BuilderSession<TTarget>, branchId: string): void {
  session.queue = session.queue.filter((candidate) => candidate !== branchId);
}

export function ensureLimits<TTarget>(session: BuilderSession<TTarget>): void {
  if (session.branches.length > BUILDER_SESSION_MAX_BRANCHES) {
    throw new BuilderSessionError(
      'SESSION_LIMIT_EXCEEDED',
      'Builder session branch limit was exceeded.',
    );
  }
  if (session.queue.length > BUILDER_SESSION_MAX_QUEUE) {
    throw new BuilderSessionError(
      'SESSION_LIMIT_EXCEEDED',
      'Builder session queue limit was exceeded.',
    );
  }
}

export function branchIdForPath(pathUci: readonly string[]): string {
  return pathUci.length === 0 ? 'root' : `root/${pathUci.join('/')}`;
}

export function oppositeRole(role: BuilderDecisionRole): BuilderDecisionRole {
  return role === 'USER_MOVE' ? 'OPPONENT_RESPONSE' : 'USER_MOVE';
}

export function roleForPosition(
  normalizedFen: string,
  repertoireSide: 'WHITE' | 'BLACK',
): BuilderDecisionRole {
  const sideToMove = normalizedFen.split(/\s+/)[1] === 'b' ? 'BLACK' : 'WHITE';
  return sideToMove === repertoireSide ? 'USER_MOVE' : 'OPPONENT_RESPONSE';
}

export function getActiveBuilderDecision(branch: BuilderBranch): BuilderDecision | null {
  return [...branch.decisionHistory]
    .reverse()
    .find((decision) => decision.status === 'ACTIVE') ?? null;
}

export function emptyStatusCounts(): Record<BuilderBranchStatus, number> {
  return {
    PENDING: 0,
    ACCEPTED: 0,
    DEFERRED: 0,
    IGNORED: 0,
    COMPLETED: 0,
    STALE: 0,
  };
}

export function validateBuilderSessionSnapshot<TTarget>(session: BuilderSession<TTarget>): void {
  if (session.modelVersion !== BUILDER_SESSION_MODEL_VERSION) {
    throw new BuilderSessionError('INVALID_SNAPSHOT', 'Unsupported builder session model version.');
  }
  requireNonEmpty(session.sessionId, 'sessionId');
  requireNonEmpty(session.ownerId, 'ownerId');
  if (!Number.isInteger(session.revision) || session.revision < 0) {
    throw new BuilderSessionError('INVALID_SNAPSHOT', 'Builder session revision is invalid.');
  }
  ensureLimits(session);
  const ids = new Set<string>();
  for (const branch of session.branches) {
    if (ids.has(branch.id)) {
      throw new BuilderSessionError('INVALID_SNAPSHOT', `Duplicate builder branch ${branch.id}.`);
    }
    ids.add(branch.id);
    if (branch.id !== branchIdForPath(branch.pathUci)) {
      throw new BuilderSessionError(
        'INVALID_SNAPSHOT',
        `Builder branch ${branch.id} has an invalid path identity.`,
      );
    }
    if (normalizeFenForPosition(branch.fen) !== branch.normalizedFen) {
      throw new BuilderSessionError(
        'INVALID_SNAPSHOT',
        `Builder branch ${branch.id} has an invalid position key.`,
      );
    }
  }
  const root = session.branches.find((branch) => branch.id === session.rootBranchId);
  if (!root || root.parentBranchId !== null || root.pathUci.length !== 0) {
    throw new BuilderSessionError('INVALID_SNAPSHOT', 'Builder session root branch is invalid.');
  }
  for (const branch of session.branches) {
    if (branch.parentBranchId !== null && !ids.has(branch.parentBranchId)) {
      throw new BuilderSessionError(
        'INVALID_SNAPSHOT',
        `Builder branch ${branch.id} has a missing parent.`,
      );
    }
    if (branch.transpositionOfBranchId !== null && !ids.has(branch.transpositionOfBranchId)) {
      throw new BuilderSessionError(
        'INVALID_SNAPSHOT',
        `Builder branch ${branch.id} has a missing transposition target.`,
      );
    }
  }
  const queued = new Set<string>();
  for (const branchId of session.queue) {
    if (queued.has(branchId)) {
      throw new BuilderSessionError('INVALID_SNAPSHOT', `Builder queue repeats branch ${branchId}.`);
    }
    queued.add(branchId);
    const branch = session.branches.find((candidate) => candidate.id === branchId);
    if (!branch || (branch.status !== 'PENDING' && branch.status !== 'STALE')) {
      throw new BuilderSessionError(
        'INVALID_SNAPSHOT',
        `Builder queue contains invalid branch ${branchId}.`,
      );
    }
  }
}
