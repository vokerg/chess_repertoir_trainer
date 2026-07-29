import { Chess } from 'chess.js';
import { describe, expect, it } from 'vitest';
import { normalizeFenForPosition } from '../src/position';
import {
  acceptBuilderDecision,
  abandonBuilderSession,
  BuilderSession,
  buildBuilderSessionPreview,
  completeBuilderSession,
  createBuilderSession,
  deferBuilderBranch,
  getActiveBuilderDecision,
  ignoreBuilderBranch,
  markBuilderBranchStale,
  reopenBuilderBranch,
  reorderBuilderQueue,
  replaceBuilderTarget,
  restartStaleBuilderBranch,
  resumeBuilderSession,
} from '../src/builder-session';

const OWNER = 'user-7';
const START = new Chess().fen();

function target(targetId = 'target-1') {
  return {
    contractVersion: '2026-07-v1',
    targetId,
    capturedAt: '2026-07-29T05:00:00.000Z',
    value: { targetId },
  };
}

function evidence(fen: string, generatedAt = '2026-07-29T05:01:00.000Z') {
  return {
    candidateContractVersion: '2026-07-v1',
    rankingPolicyVersion: '2026-07-deterministic-v1',
    generatedAt,
    normalizedFen: normalizeFenForPosition(fen),
    sourceVersions: { engine: 'stored-v1', population: 'lichess-cache-v1' },
  };
}

function move(path: readonly string[], moveUci: string) {
  const chess = new Chess();
  for (const uci of [...path, moveUci]) {
    const result = chess.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci.length === 5 ? uci.slice(4) : undefined,
    });
    if (!result) throw new Error(`Illegal test move ${uci}`);
  }
  return {
    moveUci,
    moveSan: chess.history()[chess.history().length - 1]!,
    resultingFen: chess.fen(),
    reasonCodes: ['TEST_REASON'],
  };
}

function create(repertoireSide: 'WHITE' | 'BLACK' = 'WHITE') {
  return createBuilderSession({
    sessionId: 'session-1',
    ownerId: OWNER,
    targetSnapshot: target(),
    repertoireSide,
    startingFen: START,
    createdAt: '2026-07-29T05:00:00.000Z',
  });
}

function accept<T>(
  session: BuilderSession<T>,
  branchId: string,
  path: readonly string[],
  moves: readonly string[],
  at: string,
) {
  const branch = session.branches.find((candidate) => candidate.id === branchId)!;
  return acceptBuilderDecision(session, {
    ownerId: OWNER,
    expectedRevision: session.revision,
    at,
    branchId,
    evidence: evidence(branch.fen, at),
    selectedMoves: moves.map((moveUci) => move(path, moveUci)),
  });
}

describe('builder session', () => {
  it('creates a serializable owned root snapshot and resumes it safely', () => {
    const session = create();

    expect(session.modelVersion).toBe('2026-07-v1');
    expect(session.revision).toBe(0);
    expect(session.queue).toEqual(['root']);
    expect(session.branches[0]).toMatchObject({
      id: 'root',
      status: 'PENDING',
      role: 'USER_MOVE',
      normalizedFen: normalizeFenForPosition(START),
    });
    expect(resumeBuilderSession(session, { ownerId: OWNER })).not.toBe(session);
    expect(() => resumeBuilderSession(session, { ownerId: 'other' })).toThrowError(
      expect.objectContaining({ code: 'OWNER_MISMATCH' }),
    );
  });

  it('accepts one user move and lazily queues the immediate opponent branch', () => {
    const session = accept(create(), 'root', [], ['e2e4'], '2026-07-29T05:02:00.000Z');
    const root = session.branches.find((branch) => branch.id === 'root')!;
    const child = session.branches.find((branch) => branch.id === 'root/e2e4')!;

    expect(session.revision).toBe(1);
    expect(root.status).toBe('ACCEPTED');
    expect(getActiveBuilderDecision(root)).toMatchObject({
      role: 'USER_MOVE',
      evidence: {
        candidateContractVersion: '2026-07-v1',
        rankingPolicyVersion: '2026-07-deterministic-v1',
      },
    });
    expect(child).toMatchObject({ status: 'PENDING', role: 'OPPONENT_RESPONSE' });
    expect(session.queue).toEqual(['root/e2e4']);
  });

  it('keeps queue ordering, deferral, reopening, and ignoring explicit', () => {
    let session = accept(create(), 'root', [], ['e2e4'], '2026-07-29T05:02:00.000Z');
    session = accept(
      session,
      'root/e2e4',
      ['e2e4'],
      ['e7e5', 'c7c5', 'd7d5'],
      '2026-07-29T05:03:00.000Z',
    );
    const e5 = 'root/e2e4/e7e5';
    const c5 = 'root/e2e4/c7c5';
    const d5 = 'root/e2e4/d7d5';

    session = reorderBuilderQueue(session, {
      ownerId: OWNER,
      expectedRevision: session.revision,
      at: '2026-07-29T05:04:00.000Z',
      branchId: d5,
      targetIndex: 0,
    });
    expect(session.queue).toEqual([d5, e5, c5]);

    session = deferBuilderBranch(session, {
      ownerId: OWNER,
      expectedRevision: session.revision,
      at: '2026-07-29T05:05:00.000Z',
      branchId: e5,
    });
    expect(session.branches.find((branch) => branch.id === e5)?.status).toBe('DEFERRED');
    expect(session.queue).toEqual([d5, c5]);

    session = reopenBuilderBranch(session, {
      ownerId: OWNER,
      expectedRevision: session.revision,
      at: '2026-07-29T05:06:00.000Z',
      branchId: e5,
    });
    expect(session.queue).toEqual([d5, c5, e5]);

    session = ignoreBuilderBranch(session, {
      ownerId: OWNER,
      expectedRevision: session.revision,
      at: '2026-07-29T05:07:00.000Z',
      branchId: c5,
    });
    expect(session.branches.find((branch) => branch.id === c5)?.status).toBe('IGNORED');
    expect(session.queue).toEqual([d5, e5]);
  });

  it('marks removed descendants stale when an ancestor decision changes', () => {
    let session = accept(create(), 'root', [], ['e2e4'], '2026-07-29T05:02:00.000Z');
    session = accept(session, 'root/e2e4', ['e2e4'], ['e7e5'], '2026-07-29T05:03:00.000Z');
    session = accept(
      session,
      'root/e2e4/e7e5',
      ['e2e4', 'e7e5'],
      ['g1f3'],
      '2026-07-29T05:04:00.000Z',
    );
    session = accept(session, 'root', [], ['d2d4'], '2026-07-29T05:05:00.000Z');

    expect(session.queue).toEqual(['root/d2d4']);
    expect(session.branches.find((branch) => branch.id === 'root/e2e4')?.status).toBe('STALE');
    expect(session.branches.find((branch) => branch.id === 'root/e2e4/e7e5')?.stale?.reason)
      .toBe('ANCESTOR_CHANGED');
    expect(session.branches.find((branch) => branch.id === 'root/e2e4/e7e5/g1f3')?.status)
      .toBe('STALE');
    expect(session.branches.find((branch) => branch.id === 'root')?.decisionHistory)
      .toHaveLength(2);
  });

  it('shares an already accepted transposed position without queueing duplicate work', () => {
    let session = accept(create(), 'root', [], ['g1f3'], '2026-07-29T05:02:00.000Z');
    session = accept(
      session,
      'root/g1f3',
      ['g1f3'],
      ['g7g6', 'g8f6'],
      '2026-07-29T05:03:00.000Z',
    );
    session = accept(
      session,
      'root/g1f3/g7g6',
      ['g1f3', 'g7g6'],
      ['g2g3'],
      '2026-07-29T05:04:00.000Z',
    );
    session = accept(
      session,
      'root/g1f3/g7g6/g2g3',
      ['g1f3', 'g7g6', 'g2g3'],
      ['g8f6'],
      '2026-07-29T05:05:00.000Z',
    );
    const canonical = 'root/g1f3/g7g6/g2g3/g8f6';
    session = accept(
      session,
      canonical,
      ['g1f3', 'g7g6', 'g2g3', 'g8f6'],
      ['f1g2'],
      '2026-07-29T05:06:00.000Z',
    );
    session = accept(
      session,
      'root/g1f3/g8f6',
      ['g1f3', 'g8f6'],
      ['g2g3'],
      '2026-07-29T05:07:00.000Z',
    );
    session = accept(
      session,
      'root/g1f3/g8f6/g2g3',
      ['g1f3', 'g8f6', 'g2g3'],
      ['g7g6'],
      '2026-07-29T05:08:00.000Z',
    );
    const transposed = session.branches.find(
      (branch) => branch.id === 'root/g1f3/g8f6/g2g3/g7g6',
    )!;

    expect(transposed.status).toBe('COMPLETED');
    expect(transposed.transpositionOfBranchId).toBe(canonical);
    expect(transposed.completion?.reason).toBe('TRANSPOSED');
    expect(session.queue).not.toContain(transposed.id);
  });

  it('invalidates only the affected branch subtree when evidence changes', () => {
    let session = accept(create(), 'root', [], ['e2e4'], '2026-07-29T05:02:00.000Z');
    session = accept(
      session,
      'root/e2e4',
      ['e2e4'],
      ['e7e5', 'c7c5'],
      '2026-07-29T05:03:00.000Z',
    );
    const e5 = 'root/e2e4/e7e5';
    const c5 = 'root/e2e4/c7c5';
    session = markBuilderBranchStale(session, {
      ownerId: OWNER,
      expectedRevision: session.revision,
      at: '2026-07-29T05:04:00.000Z',
      branchId: e5,
      reason: 'EVIDENCE_CHANGED',
      sourceVersion: 'engine-v2',
    });

    expect(session.branches.find((branch) => branch.id === e5)?.status).toBe('STALE');
    expect(session.branches.find((branch) => branch.id === c5)?.status).toBe('PENDING');
    expect(session.queue).toEqual([c5, e5]);

    session = restartStaleBuilderBranch(session, {
      ownerId: OWNER,
      expectedRevision: session.revision,
      at: '2026-07-29T05:05:00.000Z',
      branchId: e5,
    });
    expect(session.branches.find((branch) => branch.id === e5)?.status).toBe('PENDING');
    expect(session.branches.find((branch) => branch.id === e5)?.stale).toBeNull();
  });

  it('retains a replacement target snapshot and lazily restarts from the stale root', () => {
    let session = accept(create(), 'root', [], ['e2e4'], '2026-07-29T05:02:00.000Z');
    session = replaceBuilderTarget(session, {
      ownerId: OWNER,
      expectedRevision: session.revision,
      at: '2026-07-29T05:03:00.000Z',
      targetSnapshot: target('target-2'),
    });

    expect(session.targetRevision).toBe(2);
    expect(session.targetSnapshot.targetId).toBe('target-2');
    expect(session.branches.every((branch) => branch.status === 'STALE')).toBe(true);
    expect(session.queue).toEqual(['root']);
    expect(getActiveBuilderDecision(session.branches[0])).toBeNull();
  });

  it('enforces optimistic revisions and role-specific decision cardinality', () => {
    const session = create();
    expect(() => acceptBuilderDecision(session, {
      ownerId: OWNER,
      expectedRevision: 99,
      at: '2026-07-29T05:02:00.000Z',
      branchId: 'root',
      evidence: evidence(START),
      selectedMoves: [move([], 'e2e4')],
    })).toThrowError(expect.objectContaining({
      code: 'REVISION_CONFLICT',
    }));

    expect(() => acceptBuilderDecision(session, {
      ownerId: OWNER,
      expectedRevision: 0,
      at: '2026-07-29T05:02:00.000Z',
      branchId: 'root',
      evidence: evidence(START),
      selectedMoves: [move([], 'e2e4'), move([], 'd2d4')],
    })).toThrowError(expect.objectContaining({
      code: 'INVALID_DECISION',
    }));
  });

  it('builds a bounded preview and completes or abandons lifecycle explicitly', () => {
    let session = accept(create(), 'root', [], ['e2e4'], '2026-07-29T05:02:00.000Z');
    session = accept(
      session,
      'root/e2e4',
      ['e2e4'],
      ['e7e5', 'c7c5'],
      '2026-07-29T05:03:00.000Z',
    );
    const preview = buildBuilderSessionPreview(session, 2);
    expect(preview.truncated).toBe(true);
    expect(preview.omittedBranchCount).toBe(session.branches.length - 2);
    expect(preview.queue.map((item) => item.branchId)).toEqual([
      'root/e2e4/e7e5',
      'root/e2e4/c7c5',
    ]);

    let terminal = create();
    terminal = ignoreBuilderBranch(terminal, {
      ownerId: OWNER,
      expectedRevision: terminal.revision,
      at: '2026-07-29T05:04:00.000Z',
      branchId: 'root',
    });
    terminal = completeBuilderSession(terminal, {
      ownerId: OWNER,
      expectedRevision: terminal.revision,
      at: '2026-07-29T05:05:00.000Z',
    });
    expect(terminal.lifecycle).toBe('COMPLETED');

    const abandoned = abandonBuilderSession(create(), {
      ownerId: OWNER,
      expectedRevision: 0,
      at: '2026-07-29T05:06:00.000Z',
    });
    expect(abandoned.lifecycle).toBe('ABANDONED');
  });
});
