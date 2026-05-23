import { Chess } from 'chess.js';
import prisma from '../prisma';
import { getLineById } from '../repositories/lineRepository';
import {
  getNodeById,
  createMoveNode,
  updateMoveNode,
  deleteNodeAndSubtree,
  existsCorrectUserMove,
} from '../repositories/moveNodeRepository';

function parseUci(moveUci: string): { from: string; to: string; promotion?: string } {
  return {
    from: moveUci.slice(0, 2),
    to: moveUci.slice(2, 4),
    promotion: moveUci.length === 5 ? moveUci[4] : undefined,
  };
}

/**
 * Service for managing move nodes (authoring mode).
 * This layer encapsulates the core logic for validating and constructing move nodes
 * such as computing SAN/uci/FEN transitions via chess.js, enforcing the rule that
 * only one correct user move can exist per parent position, and persisting data.
 */
export const MoveNodeService = {
  /**
   * Create a new real move node under the given line. parentId null means this is
   * a first move from the line's synthetic root/start position.
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
    const line = await getLineById(lineId);
    if (!line) throw new Error('Line not found');

    let fenBefore: string;
    let plyNumber: number;

    if (parentId != null) {
      const parentNode = await getNodeById(parentId);
      if (!parentNode) throw new Error('Parent node not found');
      if (parentNode.lineId !== lineId) throw new Error('Parent node does not belong to this line');
      fenBefore = parentNode.fenAfter;
      plyNumber = parentNode.plyNumber + 1;
    } else {
      fenBefore = line.startingFen;
      plyNumber = 1;
    }

    const chess = fenBefore === 'startpos' ? new Chess() : new Chess(fenBefore);
    const colorToMoveBefore: 'WHITE' | 'BLACK' = chess.turn() === 'w' ? 'WHITE' : 'BLACK';
    const isUserMove = colorToMoveBefore === line.sideToTrain;

    if (isUserMove) {
      const exists = await existsCorrectUserMove(lineId, parentId);
      if (exists) {
        throw new Error('This position already has a correct trained-side move. Delete or replace it first.');
      }
    }

    const move = chess.move(parseUci(moveUci));
    if (!move) throw new Error('Illegal move');

    const nodeData = {
      lineId,
      parentId,
      plyNumber,
      fenBefore,
      fenAfter: chess.fen(),
      moveUci,
      moveSan: move.san,
      moveNumber: Math.ceil(plyNumber / 2),
      colorToMoveBefore,
      side: colorToMoveBefore,
      isUserMove,
      isCorrectUserMove: isUserMove,
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

    return createMoveNode(nodeData);
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
    const data: any = {};
    if (body.comment !== undefined) data.comment = body.comment;
    if (body.annotation !== undefined) data.annotation = body.annotation;
    if (body.branchLabel !== undefined) data.branchLabel = body.branchLabel;
    if (body.branchWeight !== undefined) data.branchWeight = body.branchWeight;
    if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder;
    if (body.isCorrectUserMove !== undefined && node.isUserMove) {
      if (!body.isCorrectUserMove) {
        throw new Error('A trained-side position must keep exactly one correct move. Delete or replace the node instead.');
      }
      await prisma.moveNode.updateMany({
        where: {
          lineId: node.lineId,
          parentId: node.parentId,
          isUserMove: true,
          isCorrectUserMove: true,
          NOT: { id: node.id },
        },
        data: { isCorrectUserMove: false },
      });
      data.isCorrectUserMove = true;
    }
    return updateMoveNode(id, data);
  },
  /**
   * Delete a node and its subtree. This cascades to child nodes and training attempts referencing this node.
   */
  deleteSubtree: async (id: number) => {
    return deleteNodeAndSubtree(id);
  },
};
