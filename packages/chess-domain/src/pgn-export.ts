import { Chess } from 'chess.js';
import { MoveTreeNode } from './types';

/**
 * Export a move tree to a PGN string. This follows a single path through
 * the tree by choosing the unique correct user move when available and the
 * first opponent branch otherwise. Branches beyond the first opponent move
 * are not represented in the PGN. This is a simplified exporter intended
 * primarily for demonstration purposes.
 */
export function exportToPgn(root: MoveTreeNode): string {
  const moves: string[] = [];
  const chess = root.node.fenAfter === 'startpos' ? new Chess() : new Chess(root.node.fenAfter);
  let current: MoveTreeNode | undefined = root;
  while (current && current.children.length > 0) {
    // Determine whose turn it is based on the underlying FEN
    const children: MoveTreeNode[] = current.children;
    // If there is a child where isUserMove is true and isCorrectUserMove is true, pick it.
    let next: MoveTreeNode | undefined = children.find((c: MoveTreeNode) => c.node.isUserMove && c.node.isCorrectUserMove);
    if (!next) {
      // Otherwise pick the first opponent branch
      next = children[0];
    }
    if (!next) break;
    moves.push(next.node.moveSan);
    current = next;
  }
  // Build PGN string with move numbers. PGN numbers increment each time White moves.
  const pgn: string[] = [];
  let moveNumber = chess.moveNumber() || 1;
  let isWhite = chess.turn() === 'w';
  for (const san of moves) {
    if (isWhite) {
      pgn.push(`${moveNumber}. ${san}`);
      isWhite = false;
    } else {
      pgn[pgn.length - 1] = `${pgn[pgn.length - 1]} ${san}`;
      moveNumber++;
      isWhite = true;
    }
  }
  return pgn.join(' ');
}