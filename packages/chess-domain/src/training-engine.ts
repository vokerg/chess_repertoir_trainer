import { MoveTree, MoveTreeNode } from './types';
import {
  getCorrectUserMoves,
  getOpponentBranches,
  chooseRandomOpponentBranch,
  chooseRandomUserMove,
  evaluateTrainingMove,
} from './move-tree';

/**
 * A stateful representation of a training session on a move tree. The
 * training proceeds by walking through the tree: opponent moves are auto
 * selected at random among branches; user moves must match the single
 * correct move at each position. This state object holds the current
 * location in the tree and a reference to the root for context.
 */
export interface TrainingState {
  tree: MoveTree;
  current: MoveTreeNode;
  path: MoveTreeNode[];
  expectedUserMove?: MoveTreeNode;
  completed: boolean;
}

function refreshExpectedUserMove(state: TrainingState): void {
  const userMoves = getCorrectUserMoves(state.current);
  state.expectedUserMove = chooseRandomUserMove(userMoves);
}

/**
 * Start a training session at the root of the provided tree. This returns a
 * TrainingState object and automatically plays all opponent moves from the
 * root until it is the user's turn or the end of the line is reached.
 */
export function startTraining(tree: MoveTree): TrainingState {
  const state: TrainingState = {
    tree,
    current: tree.root,
    path: [tree.root],
    expectedUserMove: undefined,
    completed: false,
  };
  // Advance through any opponent moves at the beginning
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
    const opponentBranches = getOpponentBranches(state.current);
    if (opponentBranches.length > 0) {
      // Pick a random opponent branch and advance
      const next = chooseRandomOpponentBranch(opponentBranches);
      if (next) {
        state.current = next;
        state.path.push(next);
      }
    } else {
      // No opponent moves; check whether a trained-side continuation exists.
      refreshExpectedUserMove(state);
      if (!state.expectedUserMove) {
        // End of the line
        state.completed = true;
      }
      break;
    }
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
    // Advance to the correct child
    const next = state.expectedUserMove;
    if (next) {
      state.current = next;
      state.path.push(next);
      state.expectedUserMove = undefined;
      // After a correct user move, auto play any opponent replies
      autoPlayOpponentMoves(state);
    }
  }
  // If incorrect, do not advance; the caller may decide to retry or end
  if (state.current.children.length === 0 || (!state.expectedUserMove && getOpponentBranches(state.current).length === 0)) {
    state.completed = true;
  }
  return { correct, expectedMove: expectedMove, completed: state.completed };
}
