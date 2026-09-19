import { describe, expect, it } from 'vitest';
import { createInitialTreeState } from '../src/move-tree';
import { extractAvailableSublines } from '../src/sublines';
import { getExpectedUserMoveUci, playUserMove, startSublineTraining } from '../src/training-engine';
import { MoveTreeNode } from '../src/types';

function node(
  id: number,
  parentId: number | null,
  plyNumber: number,
  moveUci: string,
  moveSan: string,
  isUserMove: boolean,
): MoveTreeNode {
  return {
    node: {
      id,
      lineId: 1,
      parentId,
      plyNumber,
      fenBefore: `fen-${id}-before`,
      fenAfter: `fen-${id}-after`,
      moveUci,
      moveSan,
      moveNumber: Math.ceil(plyNumber / 2),
      colorToMoveBefore: isUserMove ? 'WHITE' : 'BLACK',
      side: isUserMove ? 'WHITE' : 'BLACK',
      isUserMove,
      isCorrectUserMove: isUserMove,
      sortOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    children: [],
  };
}

function buildBranchingTree() {
  const tree = createInitialTreeState('startpos', 'WHITE');
  const e4 = node(1, null, 1, 'e2e4', 'e4', true);
  const e5 = node(2, 1, 2, 'e7e5', 'e5', false);
  const c5 = node(3, 1, 2, 'c7c5', 'c5', false);
  const nf3 = node(4, 2, 3, 'g1f3', 'Nf3', true);
  const nc3 = node(5, 3, 3, 'b1c3', 'Nc3', true);

  tree.root.children.push(e4);
  e4.children.push(e5, c5);
  e5.children.push(nf3);
  c5.children.push(nc3);
  return tree;
}

describe('fixed subline training engine', () => {
  it('follows different opponent replies for selected sublines deterministically', () => {
    const tree = buildBranchingTree();
    const [sublineA, sublineB] = extractAvailableSublines(tree);

    const stateA = startSublineTraining(tree, sublineA);
    expect(playUserMove(stateA, 'e2e4')).toMatchObject({ correct: true, completed: false });
    expect(stateA.current.node.moveUci).toBe('e7e5');
    expect(getExpectedUserMoveUci(stateA)).toBe('g1f3');

    const stateB = startSublineTraining(tree, sublineB);
    expect(playUserMove(stateB, 'e2e4')).toMatchObject({ correct: true, completed: false });
    expect(stateB.current.node.moveUci).toBe('c7c5');
    expect(getExpectedUserMoveUci(stateB)).toBe('b1c3');
  });

  it('does not advance on a wrong user move', () => {
    const tree = buildBranchingTree();
    const [subline] = extractAvailableSublines(tree);
    const state = startSublineTraining(tree, subline);

    expect(playUserMove(state, 'd2d4')).toMatchObject({ correct: false, completed: false });
    expect(state.current.node.id).toBe(0);
    expect(getExpectedUserMoveUci(state)).toBe('e2e4');
  });

  it('auto-plays an initial opponent move when the selected path starts with one', () => {
    const tree = createInitialTreeState('startpos', 'BLACK');
    const e4 = node(1, null, 1, 'e2e4', 'e4', false);
    const c5 = node(2, 1, 2, 'c7c5', 'c5', true);
    tree.root.children.push(e4);
    e4.children.push(c5);

    const [subline] = extractAvailableSublines(tree);
    const state = startSublineTraining(tree, subline);

    expect(state.current.node.id).toBe(1);
    expect(getExpectedUserMoveUci(state)).toBe('c7c5');
  });

  it('completes after the terminal selected path node is played', () => {
    const tree = buildBranchingTree();
    const [subline] = extractAvailableSublines(tree);
    const state = startSublineTraining(tree, subline);

    playUserMove(state, 'e2e4');
    const result = playUserMove(state, 'g1f3');

    expect(result).toMatchObject({ correct: true, completed: true });
    expect(state.completed).toBe(true);
    expect(getExpectedUserMoveUci(state)).toBeUndefined();
  });
});
