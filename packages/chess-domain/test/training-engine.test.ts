import { describe, it, expect } from 'vitest';
import { createInitialTreeState } from '../src/move-tree';
import { TrainingState, startTraining, playUserMove } from '../src/training-engine';
import { MoveTreeNode } from '../src/types';

function buildSimpleTree() {
  const tree = createInitialTreeState('startpos', 'WHITE');
  // user correct move 1
  const user1: MoveTreeNode = {
    node: {
      id: 1,
      lineId: 1,
      parentId: tree.root.node.id,
      plyNumber: 1,
      fenBefore: 'startpos',
      fenAfter: 'fen1',
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
  // opponent reply 1
  const opp1: MoveTreeNode = {
    node: {
      id: 2,
      lineId: 1,
      parentId: user1.node.id,
      plyNumber: 2,
      fenBefore: 'fen1',
      fenAfter: 'fen2',
      moveUci: 'e7e5',
      moveSan: 'e5',
      moveNumber: 1,
      colorToMoveBefore: 'BLACK',
      side: 'BLACK',
      isUserMove: false,
      isCorrectUserMove: false,
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
  // user correct move 2
  const user2: MoveTreeNode = {
    node: {
      id: 3,
      lineId: 1,
      parentId: opp1.node.id,
      plyNumber: 3,
      fenBefore: 'fen2',
      fenAfter: 'fen3',
      moveUci: 'g1f3',
      moveSan: 'Nf3',
      moveNumber: 2,
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
  // Link nodes together
  tree.root.children.push(user1);
  user1.children.push(opp1);
  opp1.children.push(user2);
  return tree;
}

describe('training engine', () => {
  it('should advance correctly on user moves and random opponent replies', () => {
    const tree = buildSimpleTree();
    let state = startTraining(tree);
    // After start, no opponent moves played because first move is user
    expect(state.current.node.id).toBe(0);
    // expected move is user1
    let result = playUserMove(state, 'e2e4');
    expect(result.correct).toBe(true);
    // After playing user1, an opponent move is auto-played
    // state.current should now be user2 parent (opp1)
    expect(state.current.node.id).toBe(2);
    // Now expected move is g1f3
    result = playUserMove(state, 'g1f3');
    expect(result.correct).toBe(true);
    expect(result.completed).toBe(true);
  });

  it('should choose among multiple opponent continuations', () => {
    const tree = createInitialTreeState('startpos', 'WHITE');
    const user1: MoveTreeNode = {
      node: {
        id: 1,
        lineId: 1,
        parentId: tree.root.node.id,
        plyNumber: 1,
        fenBefore: 'startpos',
        fenAfter: 'fen1',
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
    const opp1: MoveTreeNode = {
      node: {
        id: 2,
        lineId: 1,
        parentId: user1.node.id,
        plyNumber: 2,
        fenBefore: 'fen1',
        fenAfter: 'fen2',
        moveUci: 'e7e5',
        moveSan: 'e5',
        moveNumber: 1,
        colorToMoveBefore: 'BLACK',
        side: 'BLACK',
        isUserMove: false,
        isCorrectUserMove: false,
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
    const opp2: MoveTreeNode = {
      node: {
        id: 3,
        lineId: 1,
        parentId: user1.node.id,
        plyNumber: 2,
        fenBefore: 'fen1',
        fenAfter: 'fen3',
        moveUci: 'c7c5',
        moveSan: 'c5',
        moveNumber: 1,
        colorToMoveBefore: 'BLACK',
        side: 'BLACK',
        isUserMove: false,
        isCorrectUserMove: false,
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

    tree.root.children.push(user1);
    user1.children.push(opp1, opp2);

    const originalRandom = Math.random;
    try {
      Math.random = () => 0;
      let state = startTraining(tree);
      let result = playUserMove(state, 'e2e4');
      expect(result.correct).toBe(true);
      expect(state.current.node.id).toBe(2);

      Math.random = () => 0.999999;
      state = startTraining(tree);
      result = playUserMove(state, 'e2e4');
      expect(result.correct).toBe(true);
      expect(state.current.node.id).toBe(3);
    } finally {
      Math.random = originalRandom;
    }
  });
});
