import { describe, expect, it } from 'vitest';
import { findLineAnchors, previewCreateNewLine, previewMergeIntoLine } from './repertoire-merge-planner';
import { RepertoireLineInput } from './repertoire-graph';
import { Chess } from 'chess.js';

function line(id: number, moves: string[], sideToTrain: 'WHITE' | 'BLACK' = 'WHITE'): RepertoireLineInput {
  const chess = new Chess();
  let parentId: number | null = null;
  return { id, name: `Line ${id}`, sideToTrain, startingFen: 'startpos', moves: moves.map((moveUci, index) => {
    const fenBefore = chess.fen();
    const colorToMoveBefore = chess.turn() === 'w' ? 'WHITE' : 'BLACK';
    const move = chess.move({ from: moveUci.slice(0, 2), to: moveUci.slice(2, 4), promotion: moveUci[4] })!;
    const node = { id: id * 100 + index + 1, lineId: id, parentId, plyNumber: index + 1,
      fenBefore, fenAfter: chess.fen(), moveUci, moveSan: move.san, colorToMoveBefore,
      isUserMove: colorToMoveBefore === sideToTrain, isCorrectUserMove: colorToMoveBefore === sideToTrain };
    parentId = node.id; return node;
  }) };
}

describe('repertoire merge planner', () => {
  it('finds line-start and node-after anchors', () => {
    const target = line(1, ['e2e4']);
    expect(findLineAnchors(new Chess().fen(), [target])[0].kind).toBe('LINE_START');
    expect(findLineAnchors(target.moves[0].fenAfter, [target])[0]).toMatchObject({ kind: 'NODE', nodeId: 101 });
  });

  it('reuses a concrete child and creates a missing child', () => {
    const target = line(1, ['e2e4']);
    const anchor = findLineAnchors('startpos', [target])[0];
    const preview = previewMergeIntoLine({ analysisTree: { rootFen: 'startpos', children: [
      { moveUci: 'e2e4', children: [] }, { moveUci: 'd2d4', children: [] },
    ] }, line: target, anchor, courseLines: [target] });
    expect(preview.previewTree.map((move) => move.status)).toEqual(['REUSED', 'CREATES']);
  });

  it('detects course-level and new-line conflicts', () => {
    const target = line(1, [], 'BLACK');
    const existing = line(2, ['e2e4', 'c7c5'], 'BLACK');
    const rootAfterE4 = existing.moves[0].fenAfter;
    target.startingFen = rootAfterE4;
    const tree = { rootFen: rootAfterE4, children: [{ moveUci: 'e7e5', children: [] }] };
    const anchor = findLineAnchors(rootAfterE4, [target])[0];
    expect(previewMergeIntoLine({ analysisTree: tree, line: target, anchor,
      courseLines: [target, existing] }).counts.conflictingMoves).toBe(1);
    expect(previewCreateNewLine({ analysisTree: tree, lineName: 'New', sideToTrain: 'BLACK',
      courseLines: [existing] }).counts.conflictingMoves).toBe(1);
  });
});
