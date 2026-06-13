import { describe, expect, it } from 'vitest';
import { createInitialTreeState } from '../src/move-tree';
import { extractAvailableSublines } from '../src/sublines';
import { MoveTreeNode } from '../src/types';

function makeNode(id: number, parentId: number | null, plyNumber: number, moveSan: string,
  sortOrder = 0): MoveTreeNode {
  return {
    node: {
      id,
      lineId: 1,
      parentId,
      plyNumber,
      fenBefore: `fen-${plyNumber - 1}`,
      fenAfter: `fen-${plyNumber}`,
      moveUci: `move-${id}`,
      moveSan,
      moveNumber: Math.ceil(plyNumber / 2),
      colorToMoveBefore: plyNumber % 2 === 1 ? 'WHITE' : 'BLACK',
      side: plyNumber % 2 === 1 ? 'WHITE' : 'BLACK',
      isUserMove: plyNumber % 2 === 1,
      isCorrectUserMove: plyNumber % 2 === 1,
      sortOrder,
      timesSeen: 0,
      correctCount: 0,
      incorrectCount: 0,
      currentStreak: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    children: [],
  };
}

describe('extractAvailableSublines', () => {
  it('returns no sublines for a root-only tree', () => {
    expect(extractAvailableSublines(createInitialTreeState('startpos', 'WHITE'))).toEqual([]);
  });

  it('returns one ordered subline for a linear tree without the synthetic root', () => {
    const tree = createInitialTreeState('startpos', 'WHITE');
    const e4 = makeNode(1, null, 1, 'e4');
    const e5 = makeNode(2, 1, 2, 'e5');
    const nf3 = makeNode(3, 2, 3, 'Nf3');
    tree.root.children.push(e4);
    e4.children.push(e5);
    e5.children.push(nf3);

    const result = extractAvailableSublines(tree);

    expect(result).toHaveLength(1);
    expect(result[0].leafNodeId).toBe(3);
    expect(result[0].moves.map((move) => move.nodeId)).toEqual([1, 2, 3]);
    expect(result[0].moves.some((move) => move.nodeId === 0)).toBe(false);
    expect(result[0].moves.map((move) => move.moveSan).join(' ')).toBe('e4 e5 Nf3');
  });

  it('returns every terminal variation in sortOrder, plyNumber, then id order', () => {
    const tree = createInitialTreeState('startpos', 'WHITE');
    const e4 = makeNode(1, null, 1, 'e4');
    const c5 = makeNode(5, 1, 2, 'c5', 1);
    const e5HigherId = makeNode(4, 1, 2, 'e5-high', 0);
    const e5LowerId = makeNode(2, 1, 2, 'e5-low', 0);
    const laterPly = makeNode(3, 1, 3, 'later-ply', 0);
    const nf3 = makeNode(6, 5, 3, 'Nf3');
    tree.root.children.push(e4);
    e4.children.push(c5, laterPly, e5HigherId, e5LowerId);
    c5.children.push(nf3);

    const result = extractAvailableSublines(tree);

    expect(result.map((subline) => subline.leafNodeId)).toEqual([2, 4, 3, 6]);
    expect(result.map((subline) => subline.moves.map((move) => move.moveSan).join(' '))).toEqual([
      'e4 e5-low',
      'e4 e5-high',
      'e4 later-ply',
      'e4 c5 Nf3',
    ]);
  });
});
