import { decodeUciMove } from 'chess-domain';
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
  moveCode: true,
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

type StoredCandidatePlyRow = Prisma.ImportedGamePlyGetPayload<{ select: typeof candidatePlySelect }>;
export type CourseExtensionCandidatePlyRow = Omit<StoredCandidatePlyRow, 'moveCode'> & { moveUci: string };

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
  const rows = await prisma.importedGamePly.findMany({
    where: {
      positionId: { in: positionIds },
      importedGame: buildImportedGameWhere(userId, filters),
    },
    distinct: ['positionId', 'moveCode', 'importedGameId'],
    orderBy: [
      { positionId: 'asc' },
      { moveCode: 'asc' },
      { importedGameId: 'asc' },
      { plyNumber: 'asc' },
    ],
    select: candidatePlySelect,
  });
  return rows.map(({ moveCode, ...ply }) => ({ ...ply, moveUci: decodeUciMove(moveCode) }))
    .sort((a, b) => a.positionId - b.positionId || a.moveUci.localeCompare(b.moveUci)
      || a.importedGameId - b.importedGameId || a.plyNumber - b.plyNumber);
}
