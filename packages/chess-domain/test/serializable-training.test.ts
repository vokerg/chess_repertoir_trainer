import { describe, expect, it } from 'vitest';
import { createInitialTreeState } from '../src/move-tree';
import { extractAvailableSublines } from '../src/sublines';
import { getExpectedUserMoveUci, playUserMove, startSublineTraining } from '../src/training-engine';
import {
  SERIALIZABLE_TRAINING_VERSION,
  applySerializableTrainingMove,
  createSerializableTrainingSession,
  deriveSerializableTrainingReview,
  finishSerializableTrainingEarly,
  getSerializableExpectedMove,
  restoreSerializableTrainingSession,
  type SerializableTrainingMoveSnapshot,
  type SerializableTrainingSubline,
} from '../src/training';
import type { MoveTreeNode } from '../src/types';

const START_FEN = 'startpos';
const AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
const AFTER_E5 = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
const AFTER_NF3 = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2';
const AFTER_NC6 = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';
const AFTER_BB5 = 'r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3';

const snapshots: SerializableTrainingMoveSnapshot[] = [
  move(1, 'e2e4', 'e4', START_FEN, AFTER_E4, true),
  move(2, 'e7e5', 'e5', AFTER_E4, AFTER_E5, false),
  move(3, 'g1f3', 'Nf3', AFTER_E5, AFTER_NF3, true, { comment: 'Develop with tempo.' }),
  move(4, 'b8c6', 'Nc6', AFTER_NF3, AFTER_NC6, false),
  move(5, 'f1b5', 'Bb5', AFTER_NC6, AFTER_BB5, true, { branchLabel: 'Ruy Lopez' }),
];

const subline: SerializableTrainingSubline = {
  version: SERIALIZABLE_TRAINING_VERSION,
  lineId: 17,
  startingFen: START_FEN,
  sideToTrain: 'WHITE',
  sublineHash: 'fixture-white-mainline',
  sublineKeyVersion: 1,
  leafNodeId: 5,
  moves: snapshots,
};

function move(
  nodeId: number,
  moveUci: string,
  moveSan: string,
  fenBefore: string,
  fenAfter: string,
  isUserMove: boolean,
  metadata: Partial<SerializableTrainingMoveSnapshot> = {},
): SerializableTrainingMoveSnapshot {
  return { nodeId, moveUci, moveSan, fenBefore, fenAfter, isUserMove, ...metadata };
}

function treeNode(snapshot: SerializableTrainingMoveSnapshot, parentId: number | null): MoveTreeNode {
  return {
    node: {
      id: snapshot.nodeId,
      lineId: subline.lineId,
      parentId,
      plyNumber: snapshot.nodeId,
      fenBefore: snapshot.fenBefore,
      fenAfter: snapshot.fenAfter,
      moveUci: snapshot.moveUci,
      moveSan: snapshot.moveSan,
      moveNumber: Math.ceil(snapshot.nodeId / 2),
      colorToMoveBefore: snapshot.isUserMove ? 'WHITE' : 'BLACK',
      side: snapshot.isUserMove ? 'WHITE' : 'BLACK',
      isUserMove: snapshot.isUserMove,
      isCorrectUserMove: snapshot.isUserMove,
      comment: snapshot.comment,
      annotation: snapshot.annotation,
      branchLabel: snapshot.branchLabel,
      sortOrder: 0,
      createdAt: new Date('2026-07-12T10:00:00.000Z'),
      updatedAt: new Date('2026-07-12T10:00:00.000Z'),
    },
    children: [],
  };
}

function buildTree() {
  const tree = createInitialTreeState(START_FEN, 'WHITE');
  let parent = tree.root;
  let parentId: number | null = null;
  for (const snapshot of snapshots) {
    const next = treeNode(snapshot, parentId);
    parent.children.push(next);
    parent = next;
    parentId = snapshot.nodeId;
  }
  return tree;
}

function start() {
  return createSerializableTrainingSession({
    sessionId: 'session-1',
    courseContentRevision: 9,
    startedAt: '2026-07-12T10:00:00.000Z',
    subline,
  });
}

describe('serializable training reducer', () => {
  it('matches the existing engine while counting wrong retries separately', () => {
    const tree = buildTree();
    const [legacySubline] = extractAvailableSublines(tree);
    const legacy = startSublineTraining(tree, legacySubline!);
    let serializable = start();

    expect(serializable.currentFen).toBe(START_FEN);
    expect(getSerializableExpectedMove(serializable, subline)?.moveUci).toBe(getExpectedUserMoveUci(legacy));

    const wrong = applySerializableTrainingMove(
      serializable,
      subline,
      'd2d4',
      '2026-07-12T10:00:10.000Z',
    );
    expect(playUserMove(legacy, 'd2d4').correct).toBe(false);
    expect(wrong.correct).toBe(false);
    expect(wrong.session.currentFen).toBe(START_FEN);
    expect(wrong.session.counters).toEqual({
      mistakesCount: 1,
      totalExpectedMoves: 1,
      correctMoves: 0,
      accuracy: 0,
    });

    const correct = applySerializableTrainingMove(
      wrong.session,
      subline,
      'e2e4',
      '2026-07-12T10:00:20.000Z',
    );
    expect(playUserMove(legacy, 'e2e4').correct).toBe(true);
    expect(correct.appliedMoves.map((item) => item.moveUci)).toEqual(['e2e4', 'e7e5']);
    expect(correct.session.currentFen).toBe(AFTER_E5);
    expect(getSerializableExpectedMove(correct.session, subline)?.moveUci).toBe(getExpectedUserMoveUci(legacy));
    expect(correct.session.counters).toEqual({
      mistakesCount: 1,
      totalExpectedMoves: 2,
      correctMoves: 1,
      accuracy: 0.5,
    });
  });

  it('completes naturally, derives review, and survives JSON replay', () => {
    let session = start();
    session = applySerializableTrainingMove(session, subline, 'd2d4', '2026-07-12T10:00:10.000Z').session;
    session = applySerializableTrainingMove(session, subline, 'e2e4', '2026-07-12T10:00:20.000Z').session;
    session = applySerializableTrainingMove(session, subline, 'g1f3', '2026-07-12T10:00:30.000Z').session;
    session = applySerializableTrainingMove(session, subline, 'f1b5', '2026-07-12T10:00:40.000Z').session;

    expect(session).toMatchObject({
      completed: true,
      completedEarly: false,
      status: 'FAILED',
      currentFen: AFTER_BB5,
      completedAt: '2026-07-12T10:00:40.000Z',
    });
    expect(session.counters).toEqual({
      mistakesCount: 1,
      totalExpectedMoves: 4,
      correctMoves: 3,
      accuracy: 0.75,
    });

    const review = deriveSerializableTrainingReview(session, subline);
    expect(review.mistakes).toEqual([
      expect.objectContaining({
        sequence: 1,
        expectedMoveSan: 'e4',
        playedMoveUci: 'd2d4',
      }),
    ]);

    const persisted = JSON.parse(JSON.stringify(session));
    expect(restoreSerializableTrainingSession(persisted, subline)).toEqual(session);
  });

  it('records early completion as a missed expected move', () => {
    const afterE4 = applySerializableTrainingMove(
      start(),
      subline,
      'e2e4',
      '2026-07-12T10:00:10.000Z',
    ).session;
    const finished = finishSerializableTrainingEarly(
      afterE4,
      subline,
      '2026-07-12T10:00:20.000Z',
    );

    expect(finished.session).toMatchObject({
      completed: true,
      completedEarly: true,
      status: 'FAILED',
      currentFen: AFTER_E5,
    });
    expect(finished.session.events.at(-1)).toMatchObject({
      kind: 'MISSED_ON_EARLY_FINISH',
      expectedMoveUci: 'g1f3',
      playedMoveUci: null,
      wasCorrect: false,
    });
    expect(deriveSerializableTrainingReview(finished.session, subline).mistakes[0]).toMatchObject({
      expectedMoveSan: 'Nf3',
      comment: 'Develop with tempo.',
    });
  });

  it('auto-plays an initial opponent move for black training', () => {
    const blackSubline: SerializableTrainingSubline = {
      ...subline,
      sideToTrain: 'BLACK',
      sublineHash: 'fixture-black-mainline',
      leafNodeId: 2,
      moves: [
        { ...snapshots[0]!, isUserMove: false },
        { ...snapshots[1]!, isUserMove: true },
      ],
    };
    const session = createSerializableTrainingSession({
      sessionId: 'black-session',
      courseContentRevision: 9,
      startedAt: '2026-07-12T11:00:00.000Z',
      subline: blackSubline,
    });

    expect(session.currentFen).toBe(AFTER_E4);
    expect(session.lastMoveUci).toBe('e2e4');
    expect(getSerializableExpectedMove(session, blackSubline)?.moveUci).toBe('e7e5');
  });

  it('rejects a tampered persisted snapshot', () => {
    const session = applySerializableTrainingMove(
      start(),
      subline,
      'e2e4',
      '2026-07-12T10:00:10.000Z',
    ).session;
    const tampered = { ...session, currentFen: START_FEN };

    expect(() => restoreSerializableTrainingSession(tampered, subline)).toThrow(
      'does not match deterministic replay',
    );
  });
});
