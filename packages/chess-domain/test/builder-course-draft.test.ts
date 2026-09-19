import { Chess } from 'chess.js';
import { describe, expect, it } from 'vitest';
import {
  acceptBuilderDecision,
  buildBuilderCourseDraft,
  completeBuilderBranch,
  completeBuilderSession,
  createBuilderSession,
  deferBuilderBranch,
  type BuilderSession,
} from '../src/builder-session';
import { normalizeFenForPosition } from '../src/position';

const OWNER = '42';
const START = new Chess().fen();

function create() {
  return createBuilderSession({
    sessionId: 'session-course-draft',
    ownerId: OWNER,
    targetSnapshot: {
      contractVersion: '2026-07-v1',
      targetId: 'target-1',
      capturedAt: '2026-07-29T12:00:00.000Z',
      value: { targetId: 'target-1', side: 'WHITE' },
    },
    repertoireSide: 'WHITE',
    startingFen: START,
    createdAt: '2026-07-29T12:00:00.000Z',
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
    evidence: {
      candidateContractVersion: '2026-07-v1',
      rankingPolicyVersion: '2026-07-deterministic-v1',
      generatedAt: at,
      normalizedFen: normalizeFenForPosition(branch.fen),
      sourceVersions: { population: 'test-v1' },
    },
    selectedMoves: moves.map((moveUci) => move(path, moveUci)),
  });
}

function move(path: readonly string[], moveUci: string) {
  const chess = new Chess();
  for (const uci of [...path, moveUci]) {
    const played = chess.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci.length === 5 ? uci.slice(4) : undefined,
    });
    if (!played) throw new Error(`Illegal test move ${uci}`);
  }
  return {
    moveUci,
    moveSan: chess.history().at(-1)!,
    resultingFen: chess.fen(),
  };
}

describe('builder course draft', () => {
  it('projects resolved accepted paths and excludes deferred work', () => {
    let session = accept(create(), 'root', [], ['e2e4'], '2026-07-29T12:01:00.000Z');
    session = accept(
      session,
      'root/e2e4',
      ['e2e4'],
      ['e7e5', 'c7c5'],
      '2026-07-29T12:02:00.000Z',
    );
    session = accept(
      session,
      'root/e2e4/e7e5',
      ['e2e4', 'e7e5'],
      ['g1f3'],
      '2026-07-29T12:03:00.000Z',
    );
    session = deferBuilderBranch(session, {
      ownerId: OWNER,
      expectedRevision: session.revision,
      at: '2026-07-29T12:04:00.000Z',
      branchId: 'root/e2e4/c7c5',
    });
    session = completeBuilderBranch(session, {
      ownerId: OWNER,
      expectedRevision: session.revision,
      at: '2026-07-29T12:05:00.000Z',
      branchId: 'root/e2e4/e7e5/g1f3',
      reason: 'USER_STOP',
    });
    session = completeBuilderSession(session, {
      ownerId: OWNER,
      expectedRevision: session.revision,
      at: '2026-07-29T12:06:00.000Z',
    });

    const draft = buildBuilderCourseDraft(session);

    expect(draft.analysisTree).toEqual({
      rootFen: START,
      children: [{
        moveUci: 'e2e4',
        children: [{
          moveUci: 'e7e5',
          children: [{ moveUci: 'g1f3', children: [] }],
        }],
      }],
    });
    expect(draft.materializedDecisionCount).toBe(3);
    expect(draft.materializedMoveCount).toBe(3);
    expect(draft.excludedBranches).toContainEqual({
      branchId: 'root/e2e4/c7c5',
      pathUci: ['e2e4', 'c7c5'],
      status: 'DEFERRED',
      reason: 'DEFERRED',
    });
  });

  it('requires a completed session and at least one resolved accepted move', () => {
    expect(() => buildBuilderCourseDraft(create())).toThrowError(
      expect.objectContaining({ code: 'SESSION_NOT_ACTIVE' }),
    );

    const empty = completeBuilderSession(
      completeBuilderBranch(create(), {
        ownerId: OWNER,
        expectedRevision: 0,
        at: '2026-07-29T12:01:00.000Z',
        branchId: 'root',
        reason: 'USER_STOP',
      }),
      {
        ownerId: OWNER,
        expectedRevision: 1,
        at: '2026-07-29T12:02:00.000Z',
      },
    );
    expect(() => buildBuilderCourseDraft(empty)).toThrowError(
      expect.objectContaining({ code: 'INVALID_DECISION' }),
    );
  });
});
