import { Prisma } from '@prisma/client';
import prisma from '../../prisma';
import { TacticalMissedShotStartInput } from './scenario-training.schema';

export interface ScenarioContextPly {
  plyNumber: number;
  moveNumber: number;
  moveUci: string;
  moveSan: string | null;
  fenBefore: string;
  fenAfter: string;
  isUserMove: boolean;
}

export type TacticalMissedShotDetection = NonNullable<Awaited<ReturnType<typeof findTacticalMissedShotDetection>>>;

const detectionSelect = {
  id: true,
  userId: true,
  importedGameId: true,
  kind: true,
  triggerPlyNumber: true,
  userReplyPlyNumber: true,
  moveUci: true,
  bestMoveUci: true,
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

const sessionInclude = {
  attempts: { orderBy: { attemptNumber: 'asc' } },
  importedGame: {
    select: {
      whiteRating: true,
      blackRating: true,
    },
  },
} satisfies Prisma.ScenarioTrainingSessionInclude;

function dateRangeWhere(input: TacticalMissedShotStartInput): Prisma.ImportedGameWhereInput['endedAt'] {
  if (!input.from && !input.to) return undefined;
  const toExclusive = input.to ? new Date(input.to.getTime() + 24 * 60 * 60 * 1000) : undefined;
  return {
    ...(input.from ? { gte: input.from } : {}),
    ...(toExclusive ? { lt: toExclusive } : {}),
  };
}

export async function findTacticalMissedShotDetection(
  userId: number,
  input: TacticalMissedShotStartInput,
  scope: { thresholdsHash: string; detectionVersion: number },
) {
  const baseWhere: Prisma.TacticalDetectionWhereInput = {
    userId,
    kind: 'MISSED_SHOT',
    thresholdsHash: scope.thresholdsHash,
    detectionVersion: scope.detectionVersion,
    ...(input.detectionId ? { id: input.detectionId } : {}),
    ...(!input.detectionId && input.excludeDetectionId ? { id: { not: input.excludeDetectionId } } : {}),
    importedGame: {
      endedAt: dateRangeWhere(input),
    },
    ...(input.excludePassedRecently
      ? {
          scenarioTrainingSessions: {
            none: {
              userId,
              scenarioType: 'MISSED_OPPORTUNITY',
              startedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
              attempts: { some: { passed: true } },
            },
          },
        }
      : {}),
  };

  if (input.detectionId || input.random === false) {
    return prisma.tacticalDetection.findFirst({
      where: baseWhere,
      orderBy: [{ importedGame: { endedAt: 'desc' } }, { triggerPlyNumber: 'asc' }],
      select: detectionSelect,
    });
  }

  const count = await prisma.tacticalDetection.count({ where: baseWhere });
  if (!count) return null;
  return prisma.tacticalDetection.findFirst({
    where: baseWhere,
    skip: Math.floor(Math.random() * count),
    orderBy: [{ importedGame: { endedAt: 'desc' } }, { triggerPlyNumber: 'asc' }],
    select: detectionSelect,
  });
}

export async function findGamePliesThrough(userId: number, importedGameId: number, throughPlyNumber: number) {
  return prisma.importedGamePly.findMany({
    where: {
      importedGameId,
      importedGame: { userId },
      plyNumber: { lte: throughPlyNumber + 1 },
    },
    orderBy: { plyNumber: 'asc' },
    select: {
      plyNumber: true,
      moveUci: true,
      position: { select: { normalizedFen: true } },
    },
  });
}

export async function createScenarioTrainingSession(input: {
  userId: number;
  scenarioType: string;
  sourceType: string;
  sourceId: number;
  tacticalDetectionId: number;
  importedGameId: number;
  userColor: string;
  opponentUsername: string | null;
  whiteUsername: string | null;
  blackUsername: string | null;
  whiteRating: number | null;
  blackRating: number | null;
  resultForUser: string | null;
  gameResult: string | null;
  openingEco: string | null;
  openingName: string | null;
  endedAt: Date | null;
  providerUrl: string | null;
  previousFen: string | null;
  startFen: string;
  challengePlyNumber: number;
  triggerMoveUci: string | null;
  triggerMoveSan: string | null;
  originalUserMoveUci: string | null;
  originalUserMoveSan: string | null;
  referenceBestMoveUci: string | null;
  contextPlies: ScenarioContextPly[];
  baselineUserEvalCp: number | null;
  passToleranceCp: number;
}) {
  return prisma.scenarioTrainingSession.create({
    data: {
      ...input,
      contextPlies: input.contextPlies as unknown as Prisma.InputJsonValue,
    },
    include: sessionInclude,
  });
}

export async function findScenarioTrainingSession(userId: number, sessionId: number) {
  return prisma.scenarioTrainingSession.findFirst({
    where: { id: sessionId, userId },
    include: sessionInclude,
  });
}

export async function createScenarioTrainingAttempt(input: {
  sessionId: number;
  attemptNumber: number;
  fenBefore: string;
  playedMoveUci: string;
  playedMoveSan: string | null;
  fenAfter: string;
  baselineUserEvalCp: number | null;
  afterUserEvalCp: number | null;
  deltaCp: number | null;
  passed: boolean;
  engineSource: string;
  engineName: string | null;
  engineDepth: number;
  engineMultipv: number;
  rawEngineJson: unknown;
}) {
  return prisma.scenarioTrainingAttempt.create({
    data: {
      ...input,
      rawEngineJson: input.rawEngineJson === undefined ? Prisma.JsonNull : input.rawEngineJson as Prisma.InputJsonValue,
    },
  });
}

export async function completeScenarioTrainingSession(userId: number, sessionId: number) {
  return prisma.scenarioTrainingSession.updateMany({
    where: { id: sessionId, userId },
    data: { status: 'COMPLETED', completedAt: new Date() },
  });
}

export async function listScenarioTrainingHistory(userId: number) {
  return prisma.scenarioTrainingSession.findMany({
    where: { userId },
    orderBy: { startedAt: 'desc' },
    take: 100,
    include: sessionInclude,
  });
}
