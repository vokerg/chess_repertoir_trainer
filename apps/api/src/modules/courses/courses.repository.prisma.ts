import { Prisma } from '@prisma/client';
import prisma from '../../prisma';

export type DbClient = typeof prisma | Prisma.TransactionClient;

export async function listCourses(userId: number) {
  return prisma.course.findMany({ where: { userId }, orderBy: { id: 'asc' } });
}

export async function createCourse(userId: number, data: { name: string; description?: string | null }) {
  return prisma.course.create({ data: { userId, ...data } });
}

export async function getCourseById(userId: number, id: number, db: DbClient = prisma) {
  return db.course.findFirst({ where: { id, userId } });
}

export async function updateCourse(
  userId: number,
  id: number,
  data: { name?: string; description?: string | null },
) {
  if (!await getCourseById(userId, id)) return null;
  return prisma.course.update({ where: { id }, data });
}

export async function deleteCourse(userId: number, id: number) {
  if (!await getCourseById(userId, id)) return null;
  return prisma.course.delete({ where: { id } });
}

export async function listChapters(userId: number, courseId: number) {
  return prisma.chapter.findMany({ where: { courseId, course: { userId } }, orderBy: { sortOrder: 'asc' } });
}

export async function getChapterById(userId: number, id: number, db: DbClient = prisma) {
  return db.chapter.findFirst({ where: { id, course: { userId } } });
}

export async function createChapter(
  userId: number,
  courseId: number,
  data: { name: string; description?: string | null; sortOrder?: number },
) {
  if (!await getCourseById(userId, courseId)) return null;
  return prisma.chapter.create({ data: { courseId, ...data } });
}

export async function updateChapter(
  userId: number,
  id: number,
  data: { name?: string; description?: string | null; sortOrder?: number },
) {
  if (!await getChapterById(userId, id)) return null;
  return prisma.chapter.update({ where: { id }, data });
}

export async function deleteChapter(userId: number, id: number) {
  if (!await getChapterById(userId, id)) return null;
  return prisma.chapter.delete({ where: { id } });
}

export async function listLines(userId: number, chapterId: number) {
  return prisma.line.findMany({ where: { chapterId, chapter: { course: { userId } } }, orderBy: { id: 'asc' } });
}

export async function createLine(
  userId: number,
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
  if (!await getChapterById(userId, chapterId, db)) return null;
  return db.line.create({ data: { chapterId, ...data } });
}

export async function getChapterWithCourse(userId: number, chapterId: number, db: DbClient = prisma) {
  return db.chapter.findFirst({ where: { id: chapterId, course: { userId } }, include: { course: true } });
}

export async function getCourseLinesWithMoves(userId: number, courseId: number, db: DbClient = prisma) {
  return db.line.findMany({ where: { chapter: { courseId, course: { userId } } }, include: { chapter: true, moves: true },
    orderBy: [
      { chapter: { sortOrder: 'asc' } },
      { chapterId: 'asc' },
      { name: 'asc' },
      { id: 'asc' },
    ] });
}

export async function getChapterLinesWithMoves(userId: number, chapterId: number, db: DbClient = prisma) {
  return db.line.findMany({ where: { chapterId, chapter: { course: { userId } } }, include: { chapter: true, moves: true },
    orderBy: { id: 'asc' } });
}

export async function getLineWithMoves(userId: number, lineId: number, db: DbClient = prisma) {
  return db.line.findFirst({ where: { id: lineId, chapter: { course: { userId } } }, include: { chapter: true, moves: true } });
}

export async function getLineById(userId: number, id: number, db: DbClient = prisma) {
  return db.line.findFirst({ where: { id, chapter: { course: { userId } } } });
}

export async function updateLine(
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
  db: DbClient = prisma,
) {
  if (!await getLineById(userId, id, db)) return null;
  if (data.chapterId !== undefined && !await getChapterById(userId, data.chapterId, db)) return null;
  return db.line.update({ where: { id }, data });
}

export async function copyLineToChapter(
  userId: number,
  sourceLineId: number,
  targetChapterId: number,
  name?: string,
) {
  return prisma.$transaction(async (tx) => {
    const [source, targetChapter] = await Promise.all([
      tx.line.findFirst({
        where: { id: sourceLineId, chapter: { course: { userId } } },
        include: {
          moves: {
            orderBy: [{ plyNumber: 'asc' }, { sortOrder: 'asc' }, { id: 'asc' }],
          },
        },
      }),
      tx.chapter.findFirst({ where: { id: targetChapterId, course: { userId } }, select: { id: true } }),
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

export async function deleteLine(userId: number, id: number) {
  if (!await getLineById(userId, id)) return null;
  return prisma.line.delete({ where: { id } });
}

export async function getLineMoveNodes(userId: number, lineId: number) {
  return prisma.moveNode.findMany({
    where: { lineId, line: { chapter: { course: { userId } } } },
    orderBy: [{ parentId: 'asc' }, { sortOrder: 'asc' }],
  });
}

export async function getNodeById(userId: number, id: number, db: DbClient = prisma) {
  return db.moveNode.findFirst({ where: { id, line: { chapter: { course: { userId } } } } });
}

export async function createMoveNode(data: any, db: DbClient = prisma) {
  return db.moveNode.create({ data });
}

export async function updateMoveNode(userId: number, id: number, data: any, db: DbClient = prisma) {
  if (!await getNodeById(userId, id, db)) return null;
  return db.moveNode.update({ where: { id }, data });
}

export async function deleteNodeAndSubtree(userId: number, id: number, db: DbClient = prisma) {
  if (!await getNodeById(userId, id, db)) return null;
  return db.moveNode.delete({ where: { id } });
}

export async function existsCorrectUserMove(
  userId: number,
  lineId: number,
  parentId: number | null,
  db: DbClient = prisma,
) {
  const count = await db.moveNode.count({
    where: { lineId, parentId, line: { chapter: { course: { userId } } }, isUserMove: true, isCorrectUserMove: true },
  });
  return count > 0;
}
