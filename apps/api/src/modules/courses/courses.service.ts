import { Chess } from 'chess.js';
import { Prisma } from '@prisma/client';
import { buildMoveTreeFromNodes } from '../../utils/move-tree-builder';
import prisma from '../../prisma';
import { StatsService } from '../../services/statsService';
import {
  createChapter,
  createCourse,
  createLine,
  copyLineToChapter,
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

function parseUci(moveUci: string): { from: string; to: string; promotion?: string } {
  return {
    from: moveUci.slice(0, 2),
    to: moveUci.slice(2, 4),
    promotion: moveUci.length === 5 ? moveUci[4] : undefined,
  };
}

export async function createMoveNodeInTransaction(
  tx: Prisma.TransactionClient,
  userId: number,
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
  const line = await getLineById(userId, lineId, tx);
  if (!line) throw new Error('Line not found');

  let fenBefore: string;
  let plyNumber: number;
  if (parentId != null) {
    const parentNode = await getNodeById(userId, parentId, tx);
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
  if (isUserMove && await existsCorrectUserMove(userId, lineId, parentId, tx)) {
    throw new Error('This position already has a correct trained-side move. Delete or replace it first.');
  }
  const move = chess.move(parseUci(moveUci));
  if (!move) throw new Error('Illegal move');
  return createMoveNode({ lineId, parentId, plyNumber, fenBefore, fenAfter: chess.fen(), moveUci,
    moveSan: move.san, moveNumber: Math.ceil(plyNumber / 2), colorToMoveBefore,
    side: colorToMoveBefore, isUserMove, isCorrectUserMove: isUserMove, comment, annotation,
    branchLabel, branchWeight, sortOrder }, tx);
}

export const CourseService = {
  list: async (userId: number) => listCourses(userId),
  create: async (userId: number, data: { name: string; description?: string | null }) => createCourse(userId, data),
  get: async (userId: number, id: number) => getCourseById(userId, id),
  update: async (userId: number, id: number, data: { name?: string; description?: string | null }) =>
    updateCourse(userId, id, data),
  delete: async (userId: number, id: number) => deleteCourse(userId, id),
};

export const ChapterService = {
  list: async (userId: number, courseId: number) => {
    if (!await getCourseById(userId, courseId)) return null;
    return listChapters(userId, courseId);
  },
  get: async (userId: number, id: number) => getChapterById(userId, id),
  create: async (
    userId: number,
    courseId: number,
    data: { name: string; description?: string | null; sortOrder?: number },
  ) => createChapter(userId, courseId, data),
  update: async (
    userId: number,
    id: number,
    data: { name?: string; description?: string | null; sortOrder?: number },
  ) => updateChapter(userId, id, data),
  delete: async (userId: number, id: number) => deleteChapter(userId, id),
};

export const LineService = {
  list: async (userId: number, chapterId: number) => {
    if (!await getChapterById(userId, chapterId)) return null;
    const [lines, statsByLine] = await Promise.all([
      listLines(userId, chapterId),
      StatsService.lineStatsForChapter(userId, chapterId),
    ]);
    return lines.map((line) => ({
      ...line,
      trainingStats: statsByLine?.get(line.id) ?? {
        totalAttempts: 0,
        passedCount: 0,
        failedCount: 0,
        passRate: 0,
        activeSublineCount: 0,
        trainedSublineCount: 0,
        untrainedSublineCount: 0,
        weakSublineCount: 0,
        status: 'NEW',
      },
    }));
  },
  create: async (
    userId: number,
    chapterId: number,
    data: {
      name: string;
      sideToTrain: string;
      startingFen: string;
      tags?: string | null;
      notes?: string | null;
    },
  ) => createLine(userId, chapterId, data),
  get: async (userId: number, id: number) => getLineById(userId, id),
  update: async (
    userId: number,
    id: number,
    data: Partial<{
      chapterId: number;
      name: string;
      sideToTrain: string;
      startingFen: string;
      tags: string | null;
      notes: string | null;
    }>,
  ) => updateLine(userId, id, data),
  copy: async (userId: number, sourceLineId: number, targetChapterId: number, name?: string) =>
    copyLineToChapter(userId, sourceLineId, targetChapterId, name),
  delete: async (userId: number, id: number) => deleteLine(userId, id),
  getMoveTree: async (userId: number, lineId: number) => {
    const line = await getLineById(userId, lineId);
    if (!line) return null;
    const nodes = await getLineMoveNodes(userId, lineId);
    return buildMoveTreeFromNodes(nodes, line);
  },
};

export const MoveNodeService = {
  create: async (
    userId: number,
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
    return prisma.$transaction((tx) => createMoveNodeInTransaction(tx, userId, lineId, body));
  },

  update: async (
    userId: number,
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
      const node = await getNodeById(userId, id, tx);
      if (!node) return null;
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
      return updateMoveNode(userId, id, data, tx);
    });
  },

  deleteSubtree: async (userId: number, id: number) => deleteNodeAndSubtree(userId, id),
};
