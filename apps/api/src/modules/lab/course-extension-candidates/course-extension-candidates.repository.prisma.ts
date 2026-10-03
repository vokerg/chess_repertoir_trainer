import { decodeUciMove } from 'chess-domain';
import { Prisma } from '@prisma/client';
import prisma from '../../../prisma';
import { compactPositionIdentity, hydratePositionFen, positionIdentitySelect, type PositionFen } from '../../positions/position-storage';
import {
  buildImportedGameWhere,
} from '../../imported-games/imported-games.repository.prisma';
import { ImportedGameSummaryQuery } from '../../imported-games/imported-games.schemas';

const candidatePlySelect = {
  positionId: true,
  importedGameId: true,
  plyNumber: true,
  moveCode: true,
  position: { select: { ...positionIdentitySelect } },
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
export type CourseExtensionCandidatePlyRow = Omit<StoredCandidatePlyRow, 'moveCode' | 'position'> & { moveUci: string; position: PositionFen<StoredCandidatePlyRow['position']> };

export interface CourseExtensionPositionRow {
  id: number;
  normalizedFen: string;
}

export async function findCourseExtensionPositions(
  normalizedFens: string[],
): Promise<CourseExtensionPositionRow[]> {
  if (normalizedFens.length === 0) return [];
  const rows = await prisma.position.findMany({
    where: {
      positionDataCompact: {
        in: normalizedFens.map((fen) => compactPositionIdentity(fen)),
      },
    },
    select: positionIdentitySelect,
  });
  return rows.map((row) => ({ id: row.id, ...hydratePositionFen(row) }));
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
  return rows.map(({ moveCode, ...ply }) => ({ ...ply, position: hydratePositionFen(ply.position), moveUci: decodeUciMove(moveCode) }))
    .sort((a, b) => a.positionId - b.positionId || a.moveUci.localeCompare(b.moveUci)
      || a.importedGameId - b.importedGameId || a.plyNumber - b.plyNumber);
}
