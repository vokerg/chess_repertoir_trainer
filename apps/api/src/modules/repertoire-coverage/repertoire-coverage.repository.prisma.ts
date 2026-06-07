import prisma from '../../prisma';
import { SINGLETON_USER_ID } from '../../services/currentUserService';
import { RepertoireColor } from './repertoire-coverage.types';

export async function getCoverageLine(lineId: number) {
  return prisma.line.findUnique({
    where: { id: lineId },
    include: {
      moves: {
        select: {
          id: true,
          parentId: true,
          moveUci: true,
          moveSan: true,
          isUserMove: true,
          isCorrectUserMove: true,
        },
      },
    },
  });
}

export async function getCoverageCandidateGames(input: {
  sideToTrain: RepertoireColor;
  since: Date;
  limit: number;
  offset: number;
}) {
  return prisma.importedGame.findMany({
    where: {
      userId: SINGLETON_USER_ID,
      userColor: input.sideToTrain,
      endedAt: { gte: input.since },
    },
    orderBy: [{ endedAt: 'desc' }, { id: 'desc' }],
    skip: input.offset,
    take: input.limit,
    select: {
      id: true,
      provider: true,
      providerGameId: true,
      providerUrl: true,
      endedAt: true,
      createdAt: true,
      userColor: true,
      opponentUsername: true,
      resultForUser: true,
      plyIndexedAt: true,
    },
  });
}

export async function getCoveragePlies(importedGameIds: number[]) {
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
