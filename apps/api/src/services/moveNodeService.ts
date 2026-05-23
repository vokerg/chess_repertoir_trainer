import { Chess } from 'chess.js';
import prisma from '../prisma';
import { getLineById } from '../repositories/lineRepository';
import {
  getNodeById,
  getChildrenOfParent,
  createMoveNode,
  updateMoveNode,
  deleteNodeAndSubtree,
  existsCorrectUserMove,
} from '../repositories/moveNodeRepository';

/**
 * Service for managing move nodes (authoring mode).
 * This layer encapsulates the core logic for validating and constructing move nodes
 * such as computing SAN/uci/FEN transitions via chess.js, enforcing the rule that
 * only one correct user move can exist per parent position, and persisting data.
 */
export const MoveNodeService = {
  /**
   * Create a new move node under the given line. The node can be attached to a parent
   * or be a root node if parentId is null. The body should contain at least the
   * moveUci. Additional optional fields like comment, annotation, branchLabel, etc. can be passed.
   */
  create: async (lineId: number, body: {
    parentId?: number | null;
    moveUci: string;
    comment?: string | null;
    annotation?: string | null;
    branchLabel?: string | null;
    branchWeight?: number | null;
    sortOrder?: number;
  }) => {
    const { parentId = null, moveUci, comment = null, annotation = null, branchLabel = null, branchWeight = null, sortOrder = 0 } = body;
    // Fetch line to get starting FEN and side to train
    const line = await getLineById(lineId);
    if (!line) throw new Error('Line not found');
    // Determine the FEN before the move based on parent
    let fenBefore: string;
    let plyNumber: number;
    let moveNumber: number;
    let colorToMoveBefore: 'WHITE' | 'BLACK';
    if (parentId) {
      const parentNode = await getNodeById(parentId);
      if (!parentNode) throw new Error('Parent node not found');
      if (parentNode.lineId !== lineId) throw new Error('Parent node does not belong to this line');
      fenBefore = parentNode.fenAfter;
      plyNumber = parentNode.plyNumber + 1;
      moveNumber = parentNode.moveNumber;
    } else {
      // Root node uses line starting FEN
      fenBefore = line.startingFen;
      // plyNumber starts at 1
      plyNumber = 1;
      // moveNumber starts at 1
      moveNumber = 1;
    }

    // Use chess.js to validate and apply the move
    const chess = fenBefore === 'startpos' ? new Chess() : new Chess(fenBefore);
    // Determine color from chess instance: it's the side whose turn it is to move
    colorToMoveBefore = chess.turn() === 'w' ? 'WHITE' : 'BLACK';
    // Determine whether this move is a user (trained side) or opponent move
    const isUserMove = colorToMoveBefore === line.sideToTrain;

    const move = chess.move({ from: moveUci.slice(0, 2), to: moveUci.slice(2, 4), promotion: moveUci.length === 5 ? moveUci[4] : undefined });
    if (!move) throw new Error('Illegal move');
    const fenAfter = chess.fen();
    const moveSan = move.san;
    // Determine new move number: increment on Black's move to White's move; but simpler: derive from fen after and plyNumber.
    // We'll set moveNumber based on plyNumber: round up ply/2
    const newPlyNumber = plyNumber;
    const newMoveNumber = Math.ceil(newPlyNumber / 2);
    // Check if there's an existing correct user move under this parent
    let isCorrectUserMove = false;
    if (isUserMove) {
      const exists = await existsCorrectUserMove(lineId, parentId);
      // If none exists, mark this as correct. Otherwise it's an additional branch for user side and not correct.
      isCorrectUserMove = !exists;
    }
    const nodeData = {
      lineId,
      parentId,
      plyNumber: newPlyNumber,
      fenBefore,
      fenAfter,
      moveUci,
      moveSan,
      moveNumber: newMoveNumber,
      colorToMoveBefore,
      side: colorToMoveBefore,
      isUserMove,
      isCorrectUserMove,
      comment,
      annotation,
      branchLabel,
      branchWeight,
      sortOrder,
      timesSeen: 0,
      correctCount: 0,
      incorrectCount: 0,
      currentStreak: 0,
    };
    const created = await createMoveNode(nodeData);
    return created;
  },
  /**
   * Update node properties such as comment, annotation, branchLabel, branchWeight and sortOrder.
   * Does not allow changing the move itself.
   */
  update: async (id: number, body: {
    comment?: string | null;
    annotation?: string | null;
    branchLabel?: string | null;
    branchWeight?: number | null;
    sortOrder?: number;
    isCorrectUserMove?: boolean;
  }) => {
    const node = await getNodeById(id);
    if (!node) throw new Error('Node not found');
    // Only allow isCorrectUserMove change for user moves
    const data: any = {};
    if (body.comment !== undefined) data.comment = body.comment;
    if (body.annotation !== undefined) data.annotation = body.annotation;
    if (body.branchLabel !== undefined) data.branchLabel = body.branchLabel;
    if (body.branchWeight !== undefined) data.branchWeight = body.branchWeight;
    if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder;
    if (body.isCorrectUserMove !== undefined && node.isUserMove) {
      // Ensure there is only one correct user move per parent; if setting this to true, unset others
      if (body.isCorrectUserMove) {
        // Update other siblings
        await prisma.moveNode.updateMany({
          where: {
            lineId: node.lineId,
            parentId: node.parentId,
            isUserMove: true,
            isCorrectUserMove: true,
          },
          data: { isCorrectUserMove: false },
        });
      }
      data.isCorrectUserMove = body.isCorrectUserMove;
    }
    const updated = await updateMoveNode(id, data);
    return updated;
  },
  /**
   * Delete a node and its subtree. This cascades to child nodes and training attempts referencing this node.
   */
  deleteSubtree: async (id: number) => {
    return deleteNodeAndSubtree(id);
  },
};