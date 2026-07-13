import { Chess } from 'chess.js';
import { Prisma } from '@prisma/client';
import { normalizeFenForPosition } from 'chess-domain';
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
  listCourseMoveNodesForNormalizedFen,
  getNodeById,
  listChapters,
  listCourses,
  listLines,
  updateChapter,
  updateCourse,
  updateLine,
  updateMoveNode,
} from './courses.repository.prisma';
import { incrementCourseContentRevision } from './course-content-revision.repository.prisma';

function parseUci(moveUci: string): { from: string; to: string; promotion?: string } {
  return {
    from: moveUci.slice(0, 2),
    to: moveUci.slice(2, 4),
    promotion: moveUci.length === 5 ? moveUci[4] : undefined,
  };
}

function hasDataChanges(current: object, data: object): boolean {
  const row = current as Record<string, unknown>;
  return Object.entries(data).some(([key, value]) => value !== undefined && row[key] !== value);
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
  const created = await createMoveNode({ lineId, parentId, plyNumber, fenBefore, fenAfter: chess.fen(), moveUci,
    moveSan: move.san, moveNumber: Math.ceil(plyNumber / 2), colorToMoveBefore,
    side: colorToMoveBefore, isUserMove, isCorrectUserMove: isUserMove, comment, annotation,
    branchLabel, branchWeight, sortOrder }, tx);
  await tx.line.update({ where: { id: lineId }, data: { updatedAt: new Date() } });
  return created;
}

export const CourseService = {
  list: async (userId: number) => listCourses(userId),
  create: async (userId: number, data: { name: string; description?: string | null }) => createCourse(userId, data),
  get: async (userId: number, id: number) => getCourseById(userId, id),
  update: async (userId: number, id: number, data: { name?: string; description?: string | null }) =>
    prisma.$transaction(async (tx) => {
      const current = await getCourseById(userId, id, tx);
      if (!current) return null;
      if (!hasDataChanges(current, data)) return current;
      const updated = await updateCourse(userId, id, data, tx);
      if (!updated) return null;
      const revision = await incrementCourseContentRevision(id, tx);
      return { ...updated, ...revision };
    }),
  delete: async (userId: number, id: number) => deleteCourse(userId, id),
};

interface CoursePositionSuggestion {
  nodeId: number;
  fenBefore: string;
  fenAfter: string;
  moveUci: string;
  moveSan: string;
  isUserMove: boolean;
  isCorrectUserMove: boolean;
  sortOrder: number;
  lineId: number;
  lineName: string;
  chapterId: number;
  chapterName: string;
  chapterSortOrder: number;
  courseId: number;
  courseName: string;
}

export const CoursePositionSuggestionService = {
  listForFen: async (userId: number, fen: string) => {
    const normalizedFen = normalizeFenForPosition(fen);
    const candidates = await listCourseMoveNodesForNormalizedFen(userId, normalizedFen);
    const suggestions: CoursePositionSuggestion[] = candidates
      .map((node) => ({
        nodeId: node.id,
        fenBefore: node.fenBefore,
        fenAfter: node.fenAfter,
        moveUci: node.moveUci,
        moveSan: node.moveSan,
        isUserMove: node.isUserMove,
        isCorrectUserMove: node.isCorrectUserMove,
        sortOrder: node.sortOrder,
        lineId: node.line.id,
        lineName: node.line.name,
        chapterId: node.line.chapter.id,
        chapterName: node.line.chapter.name,
        chapterSortOrder: node.line.chapter.sortOrder,
        courseId: node.line.chapter.course.id,
        courseName: node.line.chapter.course.name,
      }))
      .sort(compareCoursePositionSuggestions);

    return { normalizedFen, suggestions };
  },
};

function compareCoursePositionSuggestions(a: CoursePositionSuggestion, b: CoursePositionSuggestion): number {
  return a.courseName.localeCompare(b.courseName)
    || a.chapterSortOrder - b.chapterSortOrder
    || a.chapterName.localeCompare(b.chapterName)
    || a.lineName.localeCompare(b.lineName)
    || a.moveSan.localeCompare(b.moveSan)
    || a.sortOrder - b.sortOrder
    || a.nodeId - b.nodeId;
}

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
  ) => prisma.$transaction(async (tx) => {
    const created = await createChapter(userId, courseId, data, tx);
    if (!created) return null;
    await incrementCourseContentRevision(courseId, tx);
    return created;
  }),
  update: async (
    userId: number,
    id: number,
    data: { name?: string; description?: string | null; sortOrder?: number },
  ) => prisma.$transaction(async (tx) => {
    const chapter = await getChapterById(userId, id, tx);
    if (!chapter) return null;
    if (!hasDataChanges(chapter, data)) {
      return tx.chapter.findUniqueOrThrow({ where: { id } });
    }
    const updated = await updateChapter(userId, id, data, tx);
    if (!updated) return null;
    await incrementCourseContentRevision(chapter.courseId, tx);
    return updated;
  }),
  delete: async (userId: number, id: number) => prisma.$transaction(async (tx) => {
    const chapter = await getChapterById(userId, id, tx);
    if (!chapter) return null;
    const deleted = await deleteChapter(userId, id, tx);
    if (!deleted) return null;
    await incrementCourseContentRevision(chapter.courseId, tx);
    return deleted;
  }),
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
  ) => prisma.$transaction(async (tx) => {
    const chapter = await getChapterById(userId, chapterId, tx);
    if (!chapter) return null;
    const created = await createLine(userId, chapterId, data, tx);
    if (!created) return null;
    await incrementCourseContentRevision(chapter.courseId, tx);
    return created;
  }),
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
  ) => prisma.$transaction(async (tx) => {
    const current = await tx.line.findFirst({
      where: { id, chapter: { course: { userId } } },
      include: { chapter: { select: { courseId: true } } },
    });
    if (!current) return null;
    const destination = data.chapterId === undefined
      ? null
      : await tx.chapter.findFirst({
          where: { id: data.chapterId, course: { userId } },
          select: { courseId: true },
        });
    if (data.chapterId !== undefined && !destination) return null;
    if (!hasDataChanges(current, data)) {
      const { chapter: _chapter, ...unchanged } = current;
      return unchanged;
    }
    const updated = await updateLine(userId, id, data, tx);
    if (!updated) return null;
    const affectedCourseIds = new Set([
      current.chapter.courseId,
      destination?.courseId ?? current.chapter.courseId,
    ]);
    for (const courseId of affectedCourseIds) await incrementCourseContentRevision(courseId, tx);
    return updated;
  }),
  copy: async (userId: number, sourceLineId: number, targetChapterId: number, name?: string) =>
    copyLineToChapter(userId, sourceLineId, targetChapterId, name),
  delete: async (userId: number, id: number) => prisma.$transaction(async (tx) => {
    const line = await tx.line.findFirst({
      where: { id, chapter: { course: { userId } } },
      select: { chapter: { select: { courseId: true } } },
    });
    if (!line) return null;
    const deleted = await deleteLine(userId, id, tx);
    if (!deleted) return null;
    await incrementCourseContentRevision(line.chapter.courseId, tx);
    return deleted;
  }),
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
    return prisma.$transaction(async (tx) => {
      const created = await createMoveNodeInTransaction(tx, userId, lineId, body);
      const line = await tx.line.findUniqueOrThrow({
        where: { id: lineId },
        select: { chapter: { select: { courseId: true } } },
      });
      await incrementCourseContentRevision(line.chapter.courseId, tx);
      return created;
    });
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
      const updated = await updateMoveNode(userId, id, data, tx);
      await tx.line.update({ where: { id: node.lineId }, data: { updatedAt: new Date() } });
      const line = await tx.line.findUniqueOrThrow({
        where: { id: node.lineId },
        select: { chapter: { select: { courseId: true } } },
      });
      await incrementCourseContentRevision(line.chapter.courseId, tx);
      return updated;
    });
  },

  deleteSubtree: async (userId: number, id: number) => prisma.$transaction(async (tx) => {
    const node = await getNodeById(userId, id, tx);
    if (!node) return null;
    const deleted = await deleteNodeAndSubtree(userId, id, tx);
    await tx.line.update({ where: { id: node.lineId }, data: { updatedAt: new Date() } });
    const line = await tx.line.findUniqueOrThrow({
      where: { id: node.lineId },
      select: { chapter: { select: { courseId: true } } },
    });
    await incrementCourseContentRevision(line.chapter.courseId, tx);
    return deleted;
  }),
};
