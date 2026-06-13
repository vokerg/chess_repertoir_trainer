import { Prisma } from '@prisma/client';
import prisma from '../../prisma';

export type DbClient = typeof prisma | Prisma.TransactionClient;

export async function listCourses() {
  return prisma.course.findMany({ orderBy: { id: 'asc' } });
}

export async function createCourse(data: { name: string; description?: string | null }) {
  return prisma.course.create({ data });
}

export async function getCourseById(id: number) {
  return prisma.course.findUnique({ where: { id } });
}

export async function updateCourse(
  id: number,
  data: { name?: string; description?: string | null },
) {
  return prisma.course.update({ where: { id }, data });
}

export async function deleteCourse(id: number) {
  return prisma.course.delete({ where: { id } });
}

export async function listChapters(courseId: number) {
  return prisma.chapter.findMany({ where: { courseId }, orderBy: { sortOrder: 'asc' } });
}

export async function getChapterById(id: number) {
  return prisma.chapter.findUnique({ where: { id } });
}

export async function createChapter(
  courseId: number,
  data: { name: string; description?: string | null; sortOrder?: number },
) {
  return prisma.chapter.create({ data: { courseId, ...data } });
}

export async function updateChapter(
  id: number,
  data: { name?: string; description?: string | null; sortOrder?: number },
) {
  return prisma.chapter.update({ where: { id }, data });
}

export async function deleteChapter(id: number) {
  return prisma.chapter.delete({ where: { id } });
}

export async function listLines(chapterId: number) {
  return prisma.line.findMany({ where: { chapterId }, orderBy: { id: 'asc' } });
}

export async function createLine(
  chapterId: number,
  data: {
    name: string;
    sideToTrain: string;
    startingFen: string;
    tags?: string | null;
    notes?: string | null;
  },
  db: DbClient = prisma,
) {
  return db.line.create({ data: { chapterId, ...data } });
}

export async function getChapterWithCourse(chapterId: number, db: DbClient = prisma) {
  return db.chapter.findUnique({ where: { id: chapterId }, include: { course: true } });
}

export async function getCourseLinesWithMoves(courseId: number, db: DbClient = prisma) {
  return db.line.findMany({ where: { chapter: { courseId } }, include: { chapter: true, moves: true },
    orderBy: [{ chapterId: 'asc' }, { id: 'asc' }] });
}

export async function getChapterLinesWithMoves(chapterId: number, db: DbClient = prisma) {
  return db.line.findMany({ where: { chapterId }, include: { moves: true }, orderBy: { id: 'asc' } });
}

export async function getLineWithMoves(lineId: number, db: DbClient = prisma) {
  return db.line.findUnique({ where: { id: lineId }, include: { chapter: true, moves: true } });
}

export async function getLineById(id: number, db: DbClient = prisma) {
  return db.line.findUnique({ where: { id } });
}

export async function updateLine(
  id: number,
  data: Partial<{
    chapterId: number;
    name: string;
    sideToTrain: string;
    startingFen: string;
    tags: string | null;
    notes: string | null;
  }>,
  db: DbClient = prisma,
) {
  return db.line.update({ where: { id }, data });
}

export async function copyLineToChapter(
  sourceLineId: number,
  targetChapterId: number,
  name?: string,
) {
  return prisma.$transaction(async (tx) => {
    const [source, targetChapter] = await Promise.all([
      tx.line.findUnique({
        where: { id: sourceLineId },
        include: {
          moves: {
            orderBy: [{ plyNumber: 'asc' }, { sortOrder: 'asc' }, { id: 'asc' }],
          },
        },
      }),
      tx.chapter.findUnique({ where: { id: targetChapterId }, select: { id: true } }),
    ]);
    if (!source || !targetChapter) return null;

    const copiedLine = await tx.line.create({
      data: {
        chapterId: targetChapterId,
        name: name ?? `${source.name} (copy)`,
        sideToTrain: source.sideToTrain,
        startingFen: source.startingFen,
        tags: source.tags,
        notes: source.notes,
        passedCount: 0,
        failedCount: 0,
        totalAttempts: 0,
        lastTrainedAt: null,
      },
    });

    const newNodeIds = new Map<number, number>();
    const pendingNodes = [...source.moves];
    while (pendingNodes.length > 0) {
      let copiedInPass = 0;
      for (let index = 0; index < pendingNodes.length;) {
        const sourceNode = pendingNodes[index];
        const parentId = sourceNode.parentId === null
          ? null
          : newNodeIds.get(sourceNode.parentId);
        if (sourceNode.parentId !== null && parentId === undefined) {
          index += 1;
          continue;
        }

        const copiedNode = await tx.moveNode.create({
          data: {
            lineId: copiedLine.id,
            parentId,
            plyNumber: sourceNode.plyNumber,
            fenBefore: sourceNode.fenBefore,
            fenAfter: sourceNode.fenAfter,
            moveUci: sourceNode.moveUci,
            moveSan: sourceNode.moveSan,
            moveNumber: sourceNode.moveNumber,
            colorToMoveBefore: sourceNode.colorToMoveBefore,
            side: sourceNode.side,
            isUserMove: sourceNode.isUserMove,
            isCorrectUserMove: sourceNode.isCorrectUserMove,
            comment: sourceNode.comment,
            annotation: sourceNode.annotation,
            branchLabel: sourceNode.branchLabel,
            branchWeight: sourceNode.branchWeight,
            sortOrder: sourceNode.sortOrder,
            timesSeen: 0,
            correctCount: 0,
            incorrectCount: 0,
            currentStreak: 0,
            lastSeenAt: null,
          },
        });
        newNodeIds.set(sourceNode.id, copiedNode.id);
        pendingNodes.splice(index, 1);
        copiedInPass += 1;
      }
      if (copiedInPass === 0) {
        throw new Error(`Could not resolve move tree parents for line ${sourceLineId}.`);
      }
    }

    return copiedLine;
  });
}

export async function deleteLine(id: number) {
  return prisma.line.delete({ where: { id } });
}

export async function getLineMoveNodes(lineId: number) {
  return prisma.moveNode.findMany({
    where: { lineId },
    orderBy: [{ parentId: 'asc' }, { sortOrder: 'asc' }],
  });
}

export async function getNodeById(id: number, db: DbClient = prisma) {
  return db.moveNode.findUnique({ where: { id } });
}

export async function createMoveNode(data: any, db: DbClient = prisma) {
  return db.moveNode.create({ data });
}

export async function updateMoveNode(id: number, data: any, db: DbClient = prisma) {
  return db.moveNode.update({ where: { id }, data });
}

export async function deleteNodeAndSubtree(id: number, db: DbClient = prisma) {
  return db.moveNode.delete({ where: { id } });
}

export async function existsCorrectUserMove(
  lineId: number,
  parentId: number | null,
  db: DbClient = prisma,
) {
  const count = await db.moveNode.count({
    where: { lineId, parentId, isUserMove: true, isCorrectUserMove: true },
  });
  return count > 0;
}
