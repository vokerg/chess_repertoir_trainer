import { Prisma } from '@prisma/client';
import prisma from '../../prisma';
import {
  buildImportedGameWhere,
  importedGameListSelect,
} from '../imported-games/imported-games.repository.prisma';
import { ImportedGameSummaryQuery } from '../imported-games/imported-games.schemas';
import { RepertoireColor } from './repertoire-coverage.types';

export async function getCoverageCourse(userId: number, courseId: number) {
  return prisma.course.findFirst({
    where: { id: courseId, userId },
    select: { id: true, name: true, description: true },
  });
}

export async function getCourseReviewLines(userId: number, courseId: number) {
  return prisma.line.findMany({
    where: { chapter: { courseId, course: { userId } } },
    orderBy: [{ chapter: { sortOrder: 'asc' } }, { id: 'asc' }],
    select: {
      id: true,
      chapterId: true,
      name: true,
      sideToTrain: true,
      startingFen: true,
      moves: {
        orderBy: [{ plyNumber: 'asc' }, { sortOrder: 'asc' }, { id: 'asc' }],
        select: {
          id: true,
          lineId: true,
          parentId: true,
          plyNumber: true,
          fenBefore: true,
          fenAfter: true,
          moveUci: true,
          moveSan: true,
          colorToMoveBefore: true,
          isUserMove: true,
          isCorrectUserMove: true,
        },
      },
    },
  });
}

export async function getCourseReviewCandidateGames(input: {
  userId: number;
  sideToTrain: RepertoireColor | null;
  filters: ImportedGameSummaryQuery;
}) {
  const baseWhere = buildImportedGameWhere(input.userId, input.filters);
  const sideWhere: Prisma.ImportedGameWhereInput | null = input.sideToTrain
    ? { userColor: input.sideToTrain }
    : null;

  return prisma.importedGame.findMany({
    where: sideWhere ? { AND: [baseWhere, sideWhere] } : baseWhere,
    orderBy: [{ endedAt: 'desc' }, { id: 'desc' }],
    select: importedGameListSelect,
  });
}

export async function getCourseReviewPlies(importedGameIds: number[]) {
  if (importedGameIds.length === 0) return [];
  return prisma.importedGamePly.findMany({
    where: { importedGameId: { in: importedGameIds } },
    orderBy: [{ importedGameId: 'asc' }, { plyNumber: 'asc' }],
    select: {
      importedGameId: true,
      plyNumber: true,
      moveUci: true,
      position: { select: { normalizedFen: true } },
    },
  });
}
