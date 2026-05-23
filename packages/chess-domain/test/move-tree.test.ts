import { describe, it, expect } from 'vitest';
import {
  createInitialTreeState,
  getLegalMoves,
  getCorrectUserMove,
  getOpponentBranches,
  chooseRandomOpponentBranch,
} from '../src/move-tree';
import { MoveTreeNode } from '../src/types';

function makeNode(overrides: Partial<MoveTreeNode['node']>): MoveTreeNode {
  return {
    node: {
      id: 1,
      lineId: 1,
      parentId: 0,
      plyNumber: 1,
      fenBefore: 'startpos',
      fenAfter: 'somefen',
      moveUci: 'e2e4',
      moveSan: 'e4',
      moveNumber: 1,
      colorToMoveBefore: 'WHITE',
      side: 'WHITE',
      isUserMove: true,
      isCorrectUserMove: true,
      sortOrder: 0,
      timesSeen: 0,
      correctCount: 0,
      incorrectCount: 0,
      currentStreak: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    },
    children: [],
  };
}

describe('move-tree helpers', () => {
  it('creates a synthetic root with no real move', () => {
    const tree = createInitialTreeState('startpos', 'WHITE');

    expect(tree.root.node.id).toBe(0);
    expect(tree.root.node.parentId).toBeNull();
    expect(tree.root.node.moveUci).toBe('');
    expect(tree.root.node.fenBefore).toBe('startpos');
    expect(tree.root.node.fenAfter).toBe('startpos');
    expect(tree.root.children).toEqual([]);
  });

  it('should return legal moves from starting position', () => {
    const moves = getLegalMoves('startpos');
    const moveUcis = moves.map((m) => m.uci);
    expect(moveUcis).toContain('e2e4');
    expect(moveUcis).toContain('g1f3');
  });

  it('should identify correct user move and opponent branches', () => {
    const tree = createInitialTreeState('startpos', 'WHITE');
    const userNode = makeNode({ id: 1, moveUci: 'e2e4', isUserMove: true, isCorrectUserMove: true });
    const opponentNode = makeNode({
      id: 2,
      moveUci: 'c7c5',
      moveSan: 'c5',
      side: 'BLACK',
      isUserMove: false,
      isCorrectUserMove: false,
      sortOrder: 1,
    });

    tree.root.children.push(userNode, opponentNode);

    const correct = getCorrectUserMove(tree.root);
    expect(correct).toBe(userNode);
    const branches = getOpponentBranches(tree.root);
    expect(branches).toContain(opponentNode);
    const random = chooseRandomOpponentBranch(branches);
    expect(branches).toContain(random!);
  });
});
