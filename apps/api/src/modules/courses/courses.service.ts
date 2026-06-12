import { Chess } from 'chess.js';
import { Prisma } from '@prisma/client';
import { MoveTree, MoveTreeNode } from 'chess-domain';
import prisma from '../../prisma';
import {
  createChapter,
  createCourse,
  createLine,
  createMoveNode,
  deleteChapter,
  deleteCourse,
  deleteLine,
  deleteNodeAndSubtree,
  existsCorrectUserMove,
  getChapterById,
  getCourseById,
  getLineById,
  getLineMoveNodes,
  getNodeById,
  listChapters,
  listCourses,
  listLines,
  updateChapter,
  updateCourse,
  updateLine,
  updateMoveNode,
} from './courses.repository.prisma';

function colorFromFen(fen: string): 'WHITE' | 'BLACK' {
  const chess = fen === 'startpos' ? new Chess() : new Chess(fen);
  return chess.turn() === 'w' ? 'WHITE' : 'BLACK';
}

function buildMoveTree(nodes: any[], line: any): MoveTree {
  const root: MoveTreeNode = {
    node: {
      id: 0,
      lineId: line.id,
      parentId: null,
      plyNumber: 0,
      fenBefore: line.startingFen,
      fenAfter: line.startingFen,
      moveUci: '',
      moveSan: '',
      moveNumber: 0,
      colorToMoveBefore: colorFromFen(line.startingFen),
      side: colorFromFen(line.startingFen),
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

  const map = new Map<number, MoveTreeNode>();
  for (const node of nodes) {
    map.set(node.id, { node, children: [] } as MoveTreeNode);
  }

  for (const node of nodes) {
    const treeNode = map.get(node.id);
    if (!treeNode) continue;

    if (node.parentId == null) {
      root.children.push(treeNode);
      continue;
    }

    const parent = map.get(node.parentId);
    if (parent) parent.children.push(treeNode);
  }

  const sortChildren = (treeNode: MoveTreeNode) => {
    treeNode.children.sort((a, b) => {
      const sortDelta = (a.node.sortOrder ?? 0) - (b.node.sortOrder ?? 0);
      if (sortDelta !== 0) return sortDelta;
      const plyDelta = a.node.plyNumber - b.node.plyNumber;
      if (plyDelta !== 0) return plyDelta;
      return a.node.id - b.node.id;
    });
    treeNode.children.forEach(sortChildren);
  };
  sortChildren(root);

  return { root };
}

function parseUci(moveUci: string): { from: string; to: string; promotion?: string } {
  return {
    from: moveUci.slice(0, 2),
    to: moveUci.slice(2, 4),
    promotion: moveUci.length === 5 ? moveUci[4] : undefined,
  };
}

export async function createMoveNodeInTransaction(
  tx: Prisma.TransactionClient,
  lineId: number,
  body: {
    parentId?: number | null;
    moveUci: string;
    comment?: string | null;
    annotation?: string | null;
    branchLabel?: string | null;
    branchWeight?: number | null;
    sortOrder?: number;
  },
) {
  const { parentId = null, moveUci, comment = null, annotation = null, branchLabel = null,
    branchWeight = null, sortOrder = 0 } = body;
  const line = await getLineById(lineId, tx);
  if (!line) throw new Error('Line not found');

  let fenBefore: string;
  let plyNumber: number;
  if (parentId != null) {
    const parentNode = await getNodeById(parentId, tx);
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
  if (isUserMove && await existsCorrectUserMove(lineId, parentId, tx)) {
    throw new Error('This position already has a correct trained-side move. Delete or replace it first.');
  }
  const move = chess.move(parseUci(moveUci));
  if (!move) throw new Error('Illegal move');
  return createMoveNode({ lineId, parentId, plyNumber, fenBefore, fenAfter: chess.fen(), moveUci,
    moveSan: move.san, moveNumber: Math.ceil(plyNumber / 2), colorToMoveBefore,
    side: colorToMoveBefore, isUserMove, isCorrectUserMove: isUserMove, comment, annotation,
    branchLabel, branchWeight, sortOrder, timesSeen: 0, correctCount: 0, incorrectCount: 0,
    currentStreak: 0 }, tx);
}

export const CourseService = {
  list: async () => listCourses(),
  create: async (data: { name: string; description?: string | null }) => createCourse(data),
  get: async (id: number) => getCourseById(id),
  update: async (id: number, data: { name?: string; description?: string | null }) =>
    updateCourse(id, data),
  delete: async (id: number) => deleteCourse(id),
};

export const ChapterService = {
  list: async (courseId: number) => listChapters(courseId),
  get: async (id: number) => getChapterById(id),
  create: async (
    courseId: number,
    data: { name: string; description?: string | null; sortOrder?: number },
  ) => createChapter(courseId, data),
  update: async (
    id: number,
    data: { name?: string; description?: string | null; sortOrder?: number },
  ) => updateChapter(id, data),
  delete: async (id: number) => deleteChapter(id),
};

export const LineService = {
  list: async (chapterId: number) => listLines(chapterId),
  create: async (
    chapterId: number,
    data: {
      name: string;
      sideToTrain: string;
      startingFen: string;
      tags?: string | null;
      notes?: string | null;
    },
  ) => createLine(chapterId, data),
  get: async (id: number) => getLineById(id),
  update: async (
    id: number,
    data: Partial<{
      name: string;
      sideToTrain: string;
      startingFen: string;
      tags: string | null;
      notes: string | null;
    }>,
  ) => updateLine(id, data),
  delete: async (id: number) => deleteLine(id),
  getMoveTree: async (lineId: number) => {
    const line = await getLineById(lineId);
    if (!line) return null;
    const nodes = await getLineMoveNodes(lineId);
    return buildMoveTree(nodes, line);
  },
};

export const MoveNodeService = {
  create: async (
    lineId: number,
    body: {
      parentId?: number | null;
      moveUci: string;
      comment?: string | null;
      annotation?: string | null;
      branchLabel?: string | null;
      branchWeight?: number | null;
      sortOrder?: number;
    },
  ) => {
    return prisma.$transaction((tx) => createMoveNodeInTransaction(tx, lineId, body));
  },

  update: async (
    id: number,
    body: {
      comment?: string | null;
      annotation?: string | null;
      branchLabel?: string | null;
      branchWeight?: number | null;
      sortOrder?: number;
      isCorrectUserMove?: boolean;
    },
  ) => {
    return prisma.$transaction(async (tx) => {
      const node = await getNodeById(id, tx);
      if (!node) throw new Error('Node not found');
      const data: any = {};
      if (body.comment !== undefined && body.comment !== node.comment) data.comment = body.comment;
      if (body.annotation !== undefined && body.annotation !== node.annotation)
        data.annotation = body.annotation;
      if (body.branchLabel !== undefined && body.branchLabel !== node.branchLabel)
        data.branchLabel = body.branchLabel;
      if (body.branchWeight !== undefined && body.branchWeight !== node.branchWeight)
        data.branchWeight = body.branchWeight;
      if (body.sortOrder !== undefined && body.sortOrder !== node.sortOrder)
        data.sortOrder = body.sortOrder;
      if (body.isCorrectUserMove !== undefined && node.isUserMove) {
        if (!body.isCorrectUserMove) {
          throw new Error(
            'A trained-side position must keep exactly one correct move. Delete or replace the node instead.',
          );
        }
        if (!node.isCorrectUserMove) {
          await tx.moveNode.updateMany({
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
      }
      if (Object.keys(data).length === 0) return node;
      return updateMoveNode(id, data, tx);
    });
  },

  deleteSubtree: async (id: number) => deleteNodeAndSubtree(id),
};
