import { describe, it, expect } from 'vitest';
import { createInitialTreeState, getLegalMoves, getCorrectUserMove, getOpponentBranches, chooseRandomOpponentBranch } from '../src/move-tree';
import { MoveTreeNode } from '../src/types';

describe('move-tree helpers', () => {
  it('should return legal moves from starting position', () => {
    const moves = getLegalMoves('startpos');
    const moveUcis = moves.map((m) => m.uci);
    expect(moveUcis).toContain('e2e4');
    expect(moveUcis).toContain('g1f3');
  });

  it('should identify correct user move and opponent branches', () => {
    const tree = createInitialTreeState('startpos', 'WHITE');
    // Create dummy nodes for testing
    const userNode: MoveTreeNode = {
      node: {
        id: 1,
        lineId: 1,
        parentId: tree.root.node.id,
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
      },
      children: [],
    };
    const opponentNode: MoveTreeNode = {
      node: {
        id: 2,
        lineId: 1,
        parentId: tree.root.node.id,
        plyNumber: 1,
        fenBefore: 'startpos',
        fenAfter: 'anotherfen',
        moveUci: 'c7c5',
        moveSan: 'c5',
        moveNumber: 1,
        colorToMoveBefore: 'WHITE',
        side: 'BLACK',
        isUserMove: false,
        isCorrectUserMove: false,
        sortOrder: 1,
        timesSeen: 0,
        correctCount: 0,
        incorrectCount: 0,
        currentStreak: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      children: [],
    };
    tree.root.children.push(userNode, opponentNode);
    const correct = getCorrectUserMove(tree.root);
    expect(correct).toBe(userNode);
    const branches = getOpponentBranches(tree.root);
    expect(branches).toContain(opponentNode);
    const random = chooseRandomOpponentBranch(branches);
    expect(branches).toContain(random!);
  });
});