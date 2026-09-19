import { Chess } from 'chess.js';
import { MoveTree, MoveTreeNode, MoveNode, Color } from './types';

/**
 * Create an initial move tree for a line. This creates a synthetic root node
 * representing the starting position. The root node itself is not a real
 * database entity and has id 0 and no move associated. Its fenBefore and
 * fenAfter are both set to the starting position. All actual moves are added
 * as children of this root.
 */
export function createInitialTreeState(startingFen: string, sideToTrain: Color): MoveTree {
  const rootNode: MoveNode = {
    id: 0,
    lineId: 0,
    parentId: null,
    plyNumber: 0,
    fenBefore: startingFen,
    fenAfter: startingFen,
    moveUci: '',
    moveSan: '',
    moveNumber: 0,
    colorToMoveBefore: sideToTrain,
    side: sideToTrain,
    isUserMove: false,
    isCorrectUserMove: false,
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  return { root: { node: rootNode, children: [] } };
}

/**
 * Validate that a given move string is legal from the provided FEN. Returns
 * true if the move is legal, false otherwise.
 */
export function validateMoveFromFen(fen: string, move: string): boolean {
  const chess = fen === 'startpos' ? new Chess() : new Chess(fen);
  const moves = chess.moves({ verbose: true });
  return moves.some((m) => m.lan === move || m.san === move);
}

/**
 * Return the list of legal moves from a given FEN as an array of objects
 * containing both UCI and SAN notation. This function uses chess.js under
 * the hood. The returned moves can be used for UI highlighting or to
 * prepopulate move pickers.
 */
export function getLegalMoves(fen: string): { uci: string; san: string }[] {
  const chess = fen === 'startpos' ? new Chess() : new Chess(fen);
  return chess.moves({ verbose: true }).map((m) => ({ uci: m.lan, san: m.san }));
}

/**
 * Given a parent node, find the children representing correct user moves.
 * A correct user move is defined as a move where isUserMove === true and
 * isCorrectUserMove === true.
 */
export function getCorrectUserMoves(parent: MoveTreeNode): MoveTreeNode[] {
  return parent.children.filter((child) => child.node.isUserMove && child.node.isCorrectUserMove);
}

/**
 * Given a parent node, return the first correct user move, if any.
 * This remains useful for callers that only need a single matching node.
 */
export function getCorrectUserMove(parent: MoveTreeNode): MoveTreeNode | undefined {
  return getCorrectUserMoves(parent)[0];
}

/**
 * Return all opponent move branches for a parent node. Opponent moves are
 * those where isUserMove === false.
 */
export function getOpponentBranches(parent: MoveTreeNode): MoveTreeNode[] {
  return parent.children.filter((child) => !child.node.isUserMove);
}

/**
 * Evaluate whether the user played the correct move. The expected move is
 * provided in UCI notation; the played move is also in UCI notation. A
 * match indicates a correct move.
 */
export function evaluateTrainingMove(expectedMoveUci: string | undefined, playedMoveUci: string): boolean {
  return expectedMoveUci !== undefined && expectedMoveUci === playedMoveUci;
}

/**
 * Calculate the accuracy for a line. Accuracy is defined as correctMoves / totalExpectedMoves.
 * If totalExpectedMoves is zero, returns null to avoid division by zero.
 */
export function calculateAccuracy(correctMoves: number, totalExpectedMoves: number): number | null {
  if (totalExpectedMoves === 0) return null;
  return correctMoves / totalExpectedMoves;
}

/**
 * Export a line tree to a JSON representation. This can be stored or sent
 * across the wire and later reimported. The resulting structure includes
 * the root node and all child nodes recursively.
 */
export function exportTreeToJson(tree: MoveTree): any {
  const serialize = (node: MoveTreeNode): any => {
    return {
      node: { ...node.node },
      children: node.children.map((c) => serialize(c)),
    };
  };
  return serialize(tree.root);
}

/**
 * Import a move tree from a JSON representation. This performs a deep
 * reconstruction of MoveTreeNodes. Assumes the JSON was produced by
 * exportTreeToJson().
 */
export function importTreeFromJson(json: any): MoveTree {
  const deserialize = (obj: any): MoveTreeNode => {
    return {
      node: obj.node,
      children: (obj.children ?? []).map((child: any) => deserialize(child)),
    };
  };
  return { root: deserialize(json) };
}
