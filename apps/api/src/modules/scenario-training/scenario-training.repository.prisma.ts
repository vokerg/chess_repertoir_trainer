import { Prisma } from '@prisma/client';
import prisma from '../../prisma';
import { TacticalScenarioStartInput } from './scenario-training.schema';

export type TacticalDetectionKind = 'MISSED_SHOT' | 'USER_BLUNDER';
export type TacticalScenarioType = 'MISSED_OPPORTUNITY' | 'BLUNDER_AVOIDANCE';

export interface ScenarioContextPly {
  plyNumber: number;
  moveNumber: number;
  moveUci: string;
  moveSan: string | null;
  fenBefore: string;
  fenAfter: string;
  isUserMove: boolean;
}

export type TacticalScenarioDetection = NonNullable<
  Awaited<ReturnType<typeof findTacticalScenarioDetection>>
>;

type TacticalDetectionFeedbackKey = {
  id: number;
  importedGameId: number;
  kind: string;
  triggerPlyNumber: number;
};

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

const sessionInclude = {
  attempts: { orderBy: { attemptNumber: 'asc' } },
  importedGame: {
    select: {
      whiteRating: true,
      blackRating: true,
    },
  },
} satisfies Prisma.ScenarioTrainingSessionInclude;

const dislikeSessionInclude = {
  attempts: { orderBy: { attemptNumber: 'asc' } },
  tacticalDetection: true,
} satisfies Prisma.ScenarioTrainingSessionInclude;

function dateRangeWhere(
  input: TacticalScenarioStartInput,
): Prisma.ImportedGameWhereInput['endedAt'] {
  if (!input.from && !input.to) return undefined;
  const toExclusive = input.to ? new Date(input.to.getTime() + 24 * 60 * 60 * 1000) : undefined;
  return {
    ...(input.from ? { gte: input.from } : {}),
    ...(toExclusive ? { lt: toExclusive } : {}),
  };
}

function feedbackKey(input: {
  importedGameId: number;
  kind: string;
  triggerPlyNumber: number;
}): string {
  return `${input.importedGameId}:${input.kind}:${input.triggerPlyNumber}`;
}

async function removeDislikedDetections(
  userId: number,
  detectionKind: TacticalDetectionKind,
  detections: TacticalDetectionFeedbackKey[],
): Promise<TacticalDetectionFeedbackKey[]> {
  if (!detections.length) return detections;
  const feedbackRows = await prisma.tacticalDetectionFeedback.findMany({
    where: {
      userId,
      status: 'DISLIKED',
      kind: detectionKind,
      importedGameId: { in: [...new Set(detections.map((detection) => detection.importedGameId))] },
    },
    select: {
      importedGameId: true,
      kind: true,
      triggerPlyNumber: true,
    },
  });
  const dislikedKeys = new Set(feedbackRows.map(feedbackKey));
  return detections.filter((detection) => !dislikedKeys.has(feedbackKey(detection)));
}

export async function findTacticalScenarioDetection(
  userId: number,
  input: TacticalScenarioStartInput,
  scope: { thresholdsHash: string; detectionVersion: number },
  options: {
    detectionKind: TacticalDetectionKind;
    scenarioType: TacticalScenarioType;
  },
) {
  const baseWhere: Prisma.TacticalDetectionWhereInput = {
    userId,
    kind: options.detectionKind,
    thresholdsHash: scope.thresholdsHash,
    detectionVersion: scope.detectionVersion,
    ...(input.detectionId ? { id: input.detectionId } : {}),
    ...(!input.detectionId && input.excludeDetectionId
      ? { id: { not: input.excludeDetectionId } }
      : {}),
    importedGame: {
      endedAt: dateRangeWhere(input),
    },
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
  };

  const candidates = await prisma.tacticalDetection.findMany({
    where: baseWhere,
    orderBy: [{ importedGame: { endedAt: 'desc' } }, { triggerPlyNumber: 'asc' }],
    select: {
      id: true,
      importedGameId: true,
      kind: true,
      triggerPlyNumber: true,
    },
  });
  const available = await removeDislikedDetections(userId, options.detectionKind, candidates);
  if (!available.length) return null;
  const selected =
    input.detectionId || input.random === false
      ? available[0]
      : available[Math.floor(Math.random() * available.length)];
  return prisma.tacticalDetection.findUnique({
    where: { id: selected.id },
    select: detectionSelect,
  });
}

export async function findGamePliesThrough(
  userId: number,
  importedGameId: number,
  throughPlyNumber: number,
) {
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

export async function findScenarioTrainingSessionForDislike(userId: number, sessionId: number) {
  return prisma.scenarioTrainingSession.findFirst({
    where: {
      id: sessionId,
      userId,
      sourceType: 'TACTICAL_DETECTION',
    },
    include: dislikeSessionInclude,
  });
}

export async function upsertTacticalDetectionFeedback(input: {
  userId: number;
  importedGameId: number;
  kind: string;
  triggerPlyNumber: number;
  status: string;
  reason: string | null;
  sourceSessionId: number;
}) {
  return prisma.tacticalDetectionFeedback.upsert({
    where: {
      userId_importedGameId_kind_triggerPlyNumber: {
        userId: input.userId,
        importedGameId: input.importedGameId,
        kind: input.kind,
        triggerPlyNumber: input.triggerPlyNumber,
      },
    },
    create: input,
    update: {
      status: input.status,
      reason: input.reason,
      sourceSessionId: input.sourceSessionId,
    },
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
      rawEngineJson:
        input.rawEngineJson === undefined
          ? Prisma.JsonNull
          : (input.rawEngineJson as Prisma.InputJsonValue),
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
