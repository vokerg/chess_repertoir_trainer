import { Prisma } from '@prisma/client';
import prisma from '../../../prisma';
import {
  buildImportedGameWhere,
} from '../../imported-games/imported-games.repository.prisma';
import { ImportedGameSummaryQuery } from '../../imported-games/imported-games.schemas';
import { positionKeyForNormalizedFen } from '../../positions/position-key';

const candidatePlySelect = {
  positionId: true,
  importedGameId: true,
  plyNumber: true,
  moveUci: true,
  position: { select: { normalizedFen: true } },
  importedGame: {
    select: {
      id: true,
      provider: true,
      providerGameId: true,
      providerUrl: true,
      endedAt: true,
      userColor: true,
      opponentUsername: true,
      resultForUser: true,
    },
  },
} as const;

export type CourseExtensionCandidatePlyRow = Prisma.ImportedGamePlyGetPayload<{
  select: typeof candidatePlySelect;
}>;

export interface CourseExtensionPositionRow {
  id: number;
  normalizedFen: string;
}

export async function findCourseExtensionPositions(
  normalizedFens: string[],
): Promise<CourseExtensionPositionRow[]> {
  if (normalizedFens.length === 0) return [];
  return prisma.position.findMany({
    where: {
      positionKey: {
        in: normalizedFens.map((fen) => new Uint8Array(positionKeyForNormalizedFen(fen))),
      },
    },
    select: { id: true, normalizedFen: true },
  });
}

export async function findCourseExtensionCandidatePlies(
  userId: number,
  positionIds: number[],
  filters: ImportedGameSummaryQuery,
): Promise<CourseExtensionCandidatePlyRow[]> {
  if (positionIds.length === 0) return [];
  return prisma.importedGamePly.findMany({
    where: {
      positionId: { in: positionIds },
      importedGame: buildImportedGameWhere(userId, filters),
    },
    distinct: ['positionId', 'moveUci', 'importedGameId'],
    orderBy: [
      { positionId: 'asc' },
      { moveUci: 'asc' },
      { importedGameId: 'asc' },
      { plyNumber: 'asc' },
    ],
    select: candidatePlySelect,
  });
}
