import { MoveTree, MoveTreeNode } from './types';
import { AvailableSubline } from './sublines';
import { evaluateTrainingMove } from './move-tree';

/**
 * A stateful representation of a training session on a move tree. The
 * training proceeds through one selected terminal subline. Opponent moves are
 * auto-played from that path only; trained-side moves must match the next
 * node in the selected path.
 */
export interface TrainingState {
  tree: MoveTree;
  current: MoveTreeNode;
  path: MoveTreeNode[];
  selectedPath: MoveTreeNode[];
  selectedPathIndex: number;
  expectedUserMove?: MoveTreeNode;
  completed: boolean;
}

function findSublinePath(tree: MoveTree, subline: AvailableSubline): MoveTreeNode[] {
  const selectedPath: MoveTreeNode[] = [];
  let current = tree.root;

  for (const move of subline.moves) {
    const next = current.children.find((child) => child.node.id === move.nodeId);
    if (!next) {
      throw new Error(`Subline move node ${move.nodeId} is not reachable from the current tree.`);
    }
    selectedPath.push(next);
    current = next;
  }

  if (selectedPath.length === 0 || selectedPath[selectedPath.length - 1].node.id !== subline.leafNodeId) {
    throw new Error('Selected subline does not end at its leaf node.');
  }

  return selectedPath;
}

function nextSelectedNode(state: TrainingState): MoveTreeNode | undefined {
  return state.selectedPath[state.selectedPathIndex + 1];
}

/**
 * Start a training session for one selected subline. The caller owns subline
 * selection; this engine only walks that fixed path.
 */
export function startSublineTraining(tree: MoveTree, subline: AvailableSubline): TrainingState {
  const selectedPath = findSublinePath(tree, subline);
  const state: TrainingState = {
    tree,
    current: tree.root,
    path: [tree.root],
    selectedPath,
    selectedPathIndex: -1,
    expectedUserMove: undefined,
    completed: false,
  };
  autoPlayOpponentMoves(state);
  return state;
}

/**
 * Automatically play opponent moves from the current node until a user
 * move is required or the line ends. Updates the state's current node and
 * path accordingly. This function mutates the state passed in.
 */
export function autoPlayOpponentMoves(state: TrainingState): void {
  while (!state.completed) {
    const next = nextSelectedNode(state);
    if (!next) {
      state.expectedUserMove = undefined;
      state.completed = true;
      break;
    }

    if (next.node.isUserMove) {
      state.expectedUserMove = next;
      break;
    }

    state.current = next;
    state.path.push(next);
    state.selectedPathIndex += 1;
  }
}

/**
 * Retrieve the expected correct user move from the current state. If there
 * is no expected move (either because it is the opponent's turn or because
 * the line has ended), returns undefined.
 */
export function getExpectedUserMoveUci(state: TrainingState): string | undefined {
  return state.expectedUserMove?.node.moveUci;
}

/**
 * Attempt to play a user move. The provided moveUci is compared against the
 * expected move. If correct, the state advances and any opponent replies
 * are auto-played. Returns an object describing the result.
 */
export function playUserMove(state: TrainingState, moveUci: string): { correct: boolean; expectedMove?: string; completed: boolean } {
  const expectedMove = getExpectedUserMoveUci(state);
  const correct = evaluateTrainingMove(expectedMove, moveUci);
  if (correct && expectedMove) {
    const next = state.expectedUserMove;
    if (next) {
      state.current = next;
      state.path.push(next);
      state.selectedPathIndex += 1;
      state.expectedUserMove = undefined;
      autoPlayOpponentMoves(state);
    }
  }
  return { correct, expectedMove: expectedMove, completed: state.completed };
}
