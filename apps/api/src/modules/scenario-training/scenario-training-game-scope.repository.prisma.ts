import { Prisma } from '@prisma/client';
import prisma from '../../prisma';
import type { TacticalScenarioStartInput } from './scenario-training.schema';
import type { TacticalDetectionKind, TacticalScenarioType } from './scenario-training.repository.prisma';

const detectionSelect = {
  id: true,
  userId: true,
  importedGameId: true,
  kind: true,
  triggerPlyNumber: true,
  userReplyPlyNumber: true,
  moveUci: true,
  bestMoveUci: true,
  evalBeforeUserCp: true,
  evalAfterTriggerUserCp: true,
  thresholdsHash: true,
  detectionVersion: true,
  importedGame: {
    select: {
      id: true,
      userId: true,
      whiteUsername: true,
      blackUsername: true,
      whiteRating: true,
      blackRating: true,
      userColor: true,
      opponentUsername: true,
      resultForUser: true,
      result: true,
      openingEco: true,
      openingName: true,
      endedAt: true,
      providerUrl: true,
    },
  },
} satisfies Prisma.TacticalDetectionSelect;

export async function findGameScopedTacticalScenarioDetection(
  userId: number,
  input: TacticalScenarioStartInput,
  scope: { thresholdsHash: string; detectionVersion: number },
  options: { detectionKind: TacticalDetectionKind; scenarioType: TacticalScenarioType },
) {
  if (!input.gameId) return null;

  const candidates = await prisma.tacticalDetection.findMany({
    where: {
      userId,
      importedGameId: input.gameId,
      kind: options.detectionKind,
      thresholdsHash: scope.thresholdsHash,
      detectionVersion: scope.detectionVersion,
      ...(input.detectionId ? { id: input.detectionId } : {}),
      ...(!input.detectionId && input.excludeDetectionId ? { id: { not: input.excludeDetectionId } } : {}),
      ...(input.excludePassedRecently
        ? {
            scenarioTrainingSessions: {
              none: {
                userId,
                scenarioType: options.scenarioType,
                startedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
                attempts: { some: { passed: true } },
              },
            },
          }
        : {}),
      importedGame: { userId },
    },
    orderBy: { triggerPlyNumber: 'asc' },
    select: {
      id: true,
      importedGameId: true,
      kind: true,
      triggerPlyNumber: true,
    },
  });

  if (!candidates.length) return null;
  const disliked = await prisma.tacticalDetectionFeedback.findMany({
    where: {
      userId,
      status: 'DISLIKED',
      importedGameId: input.gameId,
      kind: options.detectionKind,
    },
    select: { importedGameId: true, kind: true, triggerPlyNumber: true },
  });
  const dislikedKeys = new Set(disliked.map((row) => `${row.importedGameId}:${row.kind}:${row.triggerPlyNumber}`));
  const available = candidates.filter(
    (row) => !dislikedKeys.has(`${row.importedGameId}:${row.kind}:${row.triggerPlyNumber}`),
  );
  if (!available.length) return null;

  const selected = input.random === false || input.detectionId
    ? available[0]
    : available[Math.floor(Math.random() * available.length)];
  return prisma.tacticalDetection.findUnique({ where: { id: selected.id }, select: detectionSelect });
}
