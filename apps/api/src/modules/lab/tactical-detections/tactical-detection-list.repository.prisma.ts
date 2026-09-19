import prisma from '../../../prisma';
import { buildImportedGameWhere } from '../../imported-games/imported-games.repository.prisma';
import type { ImportedGameSummaryQuery } from '../../imported-games/imported-games.schemas';
import type { TacticalDetectionKind, TacticalDetectionListQuery } from './tactical-detection.schema';

export interface TacticalDetectionListItem {
  id: number;
  importedGameId: number;
  kind: TacticalDetectionKind;
  triggerPlyNumber: number;
  userReplyPlyNumber: number | null;
  moveUci: string;
  bestMoveUci: string | null;
  evalBeforeUserCp: number | null;
  evalAfterTriggerUserCp: number | null;
  evalAfterReplyUserCp: number | null;
  swingCp: number | null;
  opponentUsername: string | null;
  userColor: string | null;
  resultForUser: string | null;
  openingName: string | null;
  openingEco: string | null;
  endedAt: Date | null;
  providerUrl: string | null;
}

function feedbackKey(input: { importedGameId: number; kind: string; triggerPlyNumber: number }): string {
  return `${input.importedGameId}:${input.kind}:${input.triggerPlyNumber}`;
}

export async function listFilteredTacticalDetections(
  userId: number,
  query: TacticalDetectionListQuery & {
    thresholdsHash: string;
    detectionVersion: number;
  },
): Promise<TacticalDetectionListItem[]> {
  const {
    gameId,
    kind,
    limit,
    thresholdsHash,
    detectionVersion,
    ...gameFilters
  } = query;

  const importedGameWhere = buildImportedGameWhere(
    userId,
    gameFilters as ImportedGameSummaryQuery,
  );

  const rows = await prisma.tacticalDetection.findMany({
    where: {
      userId,
      kind,
      thresholdsHash,
      detectionVersion,
      ...(gameId ? { importedGameId: gameId } : {}),
      importedGame: importedGameWhere,
    },
    orderBy: [
      { importedGame: { endedAt: 'desc' } },
      { triggerPlyNumber: 'asc' },
    ],
    take: limit * 5,
    select: {
      id: true,
      importedGameId: true,
      kind: true,
      triggerPlyNumber: true,
      userReplyPlyNumber: true,
      moveUci: true,
      bestMoveUci: true,
      evalBeforeUserCp: true,
      evalAfterTriggerUserCp: true,
      evalAfterReplyUserCp: true,
      swingCp: true,
      importedGame: {
        select: {
          opponentUsername: true,
          userColor: true,
          resultForUser: true,
          openingName: true,
          openingEco: true,
          endedAt: true,
          providerUrl: true,
        },
      },
    },
  });

  const feedbackRows = rows.length
    ? await prisma.tacticalDetectionFeedback.findMany({
        where: {
          userId,
          status: 'DISLIKED',
          importedGameId: { in: [...new Set(rows.map((row) => row.importedGameId))] },
        },
        select: {
          importedGameId: true,
          kind: true,
          triggerPlyNumber: true,
        },
      })
    : [];
  const dislikedKeys = new Set(feedbackRows.map(feedbackKey));

  return rows
    .filter((row) => !dislikedKeys.has(feedbackKey(row)))
    .slice(0, limit)
    .map((row) => ({
      id: row.id,
      importedGameId: row.importedGameId,
      kind: row.kind as TacticalDetectionKind,
      triggerPlyNumber: row.triggerPlyNumber,
      userReplyPlyNumber: row.userReplyPlyNumber,
      moveUci: row.moveUci,
      bestMoveUci: row.bestMoveUci,
      evalBeforeUserCp: row.evalBeforeUserCp,
      evalAfterTriggerUserCp: row.evalAfterTriggerUserCp,
      evalAfterReplyUserCp: row.evalAfterReplyUserCp,
      swingCp: row.swingCp,
      opponentUsername: row.importedGame.opponentUsername,
      userColor: row.importedGame.userColor,
      resultForUser: row.importedGame.resultForUser,
      openingName: row.importedGame.openingName,
      openingEco: row.importedGame.openingEco,
      endedAt: row.importedGame.endedAt,
      providerUrl: row.importedGame.providerUrl,
    }));
}
