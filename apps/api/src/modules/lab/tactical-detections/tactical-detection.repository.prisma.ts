import { Prisma } from '@prisma/client';
import prisma from '../../../prisma';
import { TacticalDetectionKind, TacticalDetectionListQuery } from './tactical-detection.schema';
import { TacticalDetectionThresholds } from './tactical-detection.constants';

type Db = Prisma.TransactionClient;

export interface TacticalDetectionCandidate {
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
}

export interface TacticalDetectionListItem extends TacticalDetectionCandidate {
  id: number;
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

export async function createTacticalDetectionRun(
  userId: number,
  input: { from: Date; to: Date; force: boolean; thresholds: TacticalDetectionThresholds; thresholdsHash: string },
) {
  return prisma.tacticalDetectionRun.create({
    data: {
      userId,
      from: input.from,
      to: input.to,
      force: input.force,
      thresholds: input.thresholds,
      thresholdsHash: input.thresholdsHash,
    },
  });
}

export async function markTacticalDetectionRunComplete(
  runId: number,
  input: { gamesScanned: number; detectionsMade: number },
) {
  await prisma.tacticalDetectionRun.update({
    where: { id: runId },
    data: {
      gamesScanned: input.gamesScanned,
      detectionsMade: input.detectionsMade,
      completedAt: new Date(),
    },
  });
}

export async function markTacticalDetectionRunFailed(runId: number, error: string) {
  await prisma.tacticalDetectionRun.update({
    where: { id: runId },
    data: { error, completedAt: new Date() },
  });
}

export async function findTacticalDetectionMatchingGameIds(
  userId: number,
  input: { from: Date; toExclusive: Date; thresholdsHash: string; force: boolean },
) {
  const rows = await prisma.importedGame.findMany({
    where: {
      userId,
      latestAnalysisStatus: 'COMPLETED',
      endedAt: { gte: input.from, lt: input.toExclusive },
      plyIndexedAt: { not: null },
      plies: { some: {} },
      ...(input.force ? {} : {
        tacticalDetectionProcessedGames: {
          none: { userId, thresholdsHash: input.thresholdsHash },
        },
      }),
    },
    select: { id: true },
  });
  return rows.map((row) => row.id);
}

export async function countTacticalDetectionMatchingGames(
  userId: number,
  input: { from: Date; toExclusive: Date },
) {
  return prisma.importedGame.count({
    where: {
      userId,
      latestAnalysisStatus: 'COMPLETED',
      endedAt: { gte: input.from, lt: input.toExclusive },
      plyIndexedAt: { not: null },
      plies: { some: {} },
    },
  });
}

export async function clearTacticalDetectionsForGames(
  db: Db,
  userId: number,
  gameIds: number[],
  scope: { thresholdsHash: string; detectionVersion: number },
) {
  if (!gameIds.length) return;
  await db.tacticalDetection.deleteMany({
    where: {
      userId,
      importedGameId: { in: gameIds },
      thresholdsHash: scope.thresholdsHash,
      detectionVersion: scope.detectionVersion,
    },
  });
  await db.tacticalDetectionProcessedGame.deleteMany({
    where: { userId, importedGameId: { in: gameIds }, thresholdsHash: scope.thresholdsHash },
  });
}

export async function findTacticalDetectionCandidatesForGames(
  db: Db,
  userId: number,
  gameIds: number[],
  thresholds: TacticalDetectionThresholds,
): Promise<TacticalDetectionCandidate[]> {
  if (!gameIds.length) return [];

  return db.$queryRaw<TacticalDetectionCandidate[]>`
    WITH candidate_games AS (
      SELECT id, "userColor"
      FROM "ImportedGame"
      WHERE "userId" = ${userId}
        AND id = ANY(${gameIds}::int[])
        AND "userColor" IN ('WHITE', 'BLACK')
    ),
    ordered_plies AS (
      SELECT
        p."importedGameId",
        p."plyNumber",
        p."moveUci",
        p."positionId",
        g."userColor",
        LEAD(p."plyNumber", 1) OVER game_order AS "nextPlyNumber",
        LEAD(p."moveUci", 1) OVER game_order AS "nextMoveUci",
        LEAD(p."positionId", 1) OVER game_order AS "nextPositionId",
        LEAD(p."positionId", 2) OVER game_order AS "secondNextPositionId"
      FROM "ImportedGamePly" p
      JOIN candidate_games g ON g.id = p."importedGameId"
      WINDOW game_order AS (PARTITION BY p."importedGameId" ORDER BY p."plyNumber")
    ),
    evals AS (
      SELECT
        p.*,
        CASE
          WHEN p."userColor" = 'WHITE' THEN
            COALESCE(before_analysis."bestScoreCpWhite", CASE WHEN before_analysis."bestMateWhite" >= 0 THEN ${thresholds.mateAsCp} WHEN before_analysis."bestMateWhite" < 0 THEN -${thresholds.mateAsCp} END)
          ELSE
            -COALESCE(before_analysis."bestScoreCpWhite", CASE WHEN before_analysis."bestMateWhite" >= 0 THEN ${thresholds.mateAsCp} WHEN before_analysis."bestMateWhite" < 0 THEN -${thresholds.mateAsCp} END)
        END AS "beforeUserEval",
        CASE
          WHEN p."userColor" = 'WHITE' THEN before_analysis."bestMateWhite"
          ELSE -before_analysis."bestMateWhite"
        END AS "beforeUserMate",
        CASE
          WHEN p."userColor" = 'WHITE' THEN
            COALESCE(after_trigger_analysis."bestScoreCpWhite", CASE WHEN after_trigger_analysis."bestMateWhite" >= 0 THEN ${thresholds.mateAsCp} WHEN after_trigger_analysis."bestMateWhite" < 0 THEN -${thresholds.mateAsCp} END)
          ELSE
            -COALESCE(after_trigger_analysis."bestScoreCpWhite", CASE WHEN after_trigger_analysis."bestMateWhite" >= 0 THEN ${thresholds.mateAsCp} WHEN after_trigger_analysis."bestMateWhite" < 0 THEN -${thresholds.mateAsCp} END)
        END AS "afterTriggerUserEval",
        CASE
          WHEN p."userColor" = 'WHITE' THEN after_trigger_analysis."bestMateWhite"
          ELSE -after_trigger_analysis."bestMateWhite"
        END AS "afterTriggerUserMate",
        CASE
          WHEN p."userColor" = 'WHITE' THEN
            COALESCE(after_reply_analysis."bestScoreCpWhite", CASE WHEN after_reply_analysis."bestMateWhite" >= 0 THEN ${thresholds.mateAsCp} WHEN after_reply_analysis."bestMateWhite" < 0 THEN -${thresholds.mateAsCp} END)
          ELSE
            -COALESCE(after_reply_analysis."bestScoreCpWhite", CASE WHEN after_reply_analysis."bestMateWhite" >= 0 THEN ${thresholds.mateAsCp} WHEN after_reply_analysis."bestMateWhite" < 0 THEN -${thresholds.mateAsCp} END)
        END AS "afterReplyUserEval",
        CASE
          WHEN p."userColor" = 'WHITE' THEN after_reply_analysis."bestMateWhite"
          ELSE -after_reply_analysis."bestMateWhite"
        END AS "afterReplyUserMate",
        before_analysis."bestMoveUci" AS "beforeBestMoveUci",
        after_trigger_analysis."bestMoveUci" AS "afterTriggerBestMoveUci"
      FROM ordered_plies p
      LEFT JOIN "PositionAnalysis" before_analysis ON before_analysis."positionId" = p."positionId"
      LEFT JOIN "PositionAnalysis" after_trigger_analysis ON after_trigger_analysis."positionId" = p."nextPositionId"
      LEFT JOIN "PositionAnalysis" after_reply_analysis ON after_reply_analysis."positionId" = p."secondNextPositionId"
    ),
    missed_shots AS (
      SELECT
        "importedGameId",
        'MISSED_SHOT'::text AS kind,
        "plyNumber" AS "triggerPlyNumber",
        "nextPlyNumber" AS "userReplyPlyNumber",
        "nextMoveUci" AS "moveUci",
        "afterTriggerBestMoveUci" AS "bestMoveUci",
        "beforeUserEval" AS "evalBeforeUserCp",
        "afterTriggerUserEval" AS "evalAfterTriggerUserCp",
        "afterReplyUserEval" AS "evalAfterReplyUserCp",
        ("afterTriggerUserEval" - "afterReplyUserEval") AS "swingCp"
      FROM evals
      WHERE
        CASE WHEN "userColor" = 'WHITE' THEN "plyNumber" % 2 = 0 ELSE "plyNumber" % 2 = 1 END
        AND "nextPlyNumber" = "plyNumber" + 1
        AND CASE WHEN "userColor" = 'WHITE' THEN "nextPlyNumber" % 2 = 1 ELSE "nextPlyNumber" % 2 = 0 END
        AND "beforeUserEval" IS NOT NULL
        AND "afterTriggerUserEval" IS NOT NULL
        AND "afterReplyUserEval" IS NOT NULL
        AND "afterTriggerBestMoveUci" IS NOT NULL
        AND LOWER("nextMoveUci") <> LOWER("afterTriggerBestMoveUci")
        AND NOT (
          "beforeUserEval" >= ${thresholds.decisiveEvalCp}
          AND "afterTriggerUserEval" >= ${thresholds.decisiveEvalCp}
          AND "afterReplyUserEval" >= ${thresholds.decisiveEvalCp}
        )
        AND NOT (
          "beforeUserEval" <= -${thresholds.decisiveEvalCp}
          AND "afterTriggerUserEval" <= -${thresholds.decisiveEvalCp}
          AND "afterReplyUserEval" <= -${thresholds.decisiveEvalCp}
        )
        AND ("afterTriggerUserEval" - "beforeUserEval") >= ${thresholds.opponentGiftMinCp}
        AND "afterTriggerUserEval" >= ${thresholds.minShotEvalCp}
        AND ("afterTriggerUserEval" - "afterReplyUserEval") >= ${thresholds.missedShotDropMinCp}
        AND "afterReplyUserEval" <= "beforeUserEval" + ${thresholds.recoveryToleranceCp}
        AND ("afterReplyUserMate" IS NULL OR "afterReplyUserMate" <= 0)
    ),
    punished_opponent_blunders AS (
      SELECT
        "importedGameId",
        'PUNISHED_OPPONENT_BLUNDER'::text AS kind,
        "plyNumber" AS "triggerPlyNumber",
        "nextPlyNumber" AS "userReplyPlyNumber",
        "nextMoveUci" AS "moveUci",
        "afterTriggerBestMoveUci" AS "bestMoveUci",
        "beforeUserEval" AS "evalBeforeUserCp",
        "afterTriggerUserEval" AS "evalAfterTriggerUserCp",
        "afterReplyUserEval" AS "evalAfterReplyUserCp",
        ("afterTriggerUserEval" - "beforeUserEval") AS "swingCp"
      FROM evals
      WHERE
        CASE WHEN "userColor" = 'WHITE' THEN "plyNumber" % 2 = 0 ELSE "plyNumber" % 2 = 1 END
        AND "nextPlyNumber" = "plyNumber" + 1
        AND CASE WHEN "userColor" = 'WHITE' THEN "nextPlyNumber" % 2 = 1 ELSE "nextPlyNumber" % 2 = 0 END
        AND "beforeUserEval" IS NOT NULL
        AND "afterTriggerUserEval" IS NOT NULL
        AND "afterReplyUserEval" IS NOT NULL
        AND NOT (
          "beforeUserEval" >= ${thresholds.decisiveEvalCp}
          AND "afterTriggerUserEval" >= ${thresholds.decisiveEvalCp}
          AND "afterReplyUserEval" >= ${thresholds.decisiveEvalCp}
        )
        AND NOT (
          "beforeUserEval" <= -${thresholds.decisiveEvalCp}
          AND "afterTriggerUserEval" <= -${thresholds.decisiveEvalCp}
          AND "afterReplyUserEval" <= -${thresholds.decisiveEvalCp}
        )
        AND ("afterTriggerUserEval" - "beforeUserEval") >= ${thresholds.opponentGiftMinCp}
        AND "afterTriggerUserEval" >= ${thresholds.minShotEvalCp}
        AND "afterReplyUserEval" >= "afterTriggerUserEval" - ${thresholds.recoveryToleranceCp}
    ),
    user_blunders AS (
      SELECT
        e."importedGameId",
        'USER_BLUNDER'::text AS kind,
        e."plyNumber" AS "triggerPlyNumber",
        NULL::smallint AS "userReplyPlyNumber",
        e."moveUci",
        e."beforeBestMoveUci" AS "bestMoveUci",
        e."beforeUserEval" AS "evalBeforeUserCp",
        e."afterTriggerUserEval" AS "evalAfterTriggerUserCp",
        NULL::integer AS "evalAfterReplyUserCp",
        (e."beforeUserEval" - e."afterTriggerUserEval") AS "swingCp"
      FROM evals e
      WHERE
        CASE WHEN e."userColor" = 'WHITE' THEN e."plyNumber" % 2 = 1 ELSE e."plyNumber" % 2 = 0 END
        AND e."beforeUserEval" IS NOT NULL
        AND e."afterTriggerUserEval" IS NOT NULL
        AND NOT (
          e."beforeUserEval" >= ${thresholds.decisiveEvalCp}
          AND e."afterTriggerUserEval" >= ${thresholds.decisiveEvalCp}
        )
        AND NOT (
          e."beforeUserEval" <= -${thresholds.decisiveEvalCp}
          AND e."afterTriggerUserEval" <= -${thresholds.decisiveEvalCp}
        )
        AND (e."beforeUserEval" - e."afterTriggerUserEval") >= ${thresholds.userBlunderDropMinCp}
        AND NOT EXISTS (
          SELECT 1
          FROM missed_shots m
          WHERE m."importedGameId" = e."importedGameId"
            AND m."userReplyPlyNumber" = e."plyNumber"
        )
    )
    SELECT
      "importedGameId"::int AS "importedGameId",
      kind,
      "triggerPlyNumber"::int AS "triggerPlyNumber",
      "userReplyPlyNumber"::int AS "userReplyPlyNumber",
      "moveUci",
      "bestMoveUci",
      "evalBeforeUserCp"::int AS "evalBeforeUserCp",
      "evalAfterTriggerUserCp"::int AS "evalAfterTriggerUserCp",
      "evalAfterReplyUserCp"::int AS "evalAfterReplyUserCp",
      "swingCp"::int AS "swingCp"
    FROM missed_shots
    UNION ALL
    SELECT
      "importedGameId"::int AS "importedGameId",
      kind,
      "triggerPlyNumber"::int AS "triggerPlyNumber",
      "userReplyPlyNumber"::int AS "userReplyPlyNumber",
      "moveUci",
      "bestMoveUci",
      "evalBeforeUserCp"::int AS "evalBeforeUserCp",
      "evalAfterTriggerUserCp"::int AS "evalAfterTriggerUserCp",
      "evalAfterReplyUserCp"::int AS "evalAfterReplyUserCp",
      "swingCp"::int AS "swingCp"
    FROM punished_opponent_blunders
    UNION ALL
    SELECT
      "importedGameId"::int AS "importedGameId",
      kind,
      "triggerPlyNumber"::int AS "triggerPlyNumber",
      "userReplyPlyNumber"::int AS "userReplyPlyNumber",
      "moveUci",
      "bestMoveUci",
      "evalBeforeUserCp"::int AS "evalBeforeUserCp",
      "evalAfterTriggerUserCp"::int AS "evalAfterTriggerUserCp",
      "evalAfterReplyUserCp"::int AS "evalAfterReplyUserCp",
      "swingCp"::int AS "swingCp"
    FROM user_blunders
  `;
}

export async function insertTacticalDetections(
  db: Db,
  runId: number,
  userId: number,
  candidates: TacticalDetectionCandidate[],
  scope: { thresholdsHash: string; detectionVersion: number },
) {
  if (!candidates.length) return 0;
  const result = await db.tacticalDetection.createMany({
    data: candidates.map((candidate) => ({
      runId,
      userId,
      importedGameId: candidate.importedGameId,
      kind: candidate.kind,
      thresholdsHash: scope.thresholdsHash,
      detectionVersion: scope.detectionVersion,
      triggerPlyNumber: candidate.triggerPlyNumber,
      userReplyPlyNumber: candidate.userReplyPlyNumber,
      moveUci: candidate.moveUci,
      bestMoveUci: candidate.bestMoveUci,
      evalBeforeUserCp: candidate.evalBeforeUserCp,
      evalAfterTriggerUserCp: candidate.evalAfterTriggerUserCp,
      evalAfterReplyUserCp: candidate.evalAfterReplyUserCp,
      swingCp: candidate.swingCp,
    })),
    skipDuplicates: true,
  });
  return result.count;
}

export async function markTacticalDetectionProcessedGames(
  db: Db,
  runId: number,
  userId: number,
  gameIds: number[],
  thresholdsHash: string,
) {
  if (!gameIds.length) return 0;
  const result = await db.tacticalDetectionProcessedGame.createMany({
    data: gameIds.map((importedGameId) => ({
      runId,
      userId,
      importedGameId,
      thresholdsHash,
    })),
    skipDuplicates: true,
  });
  return result.count;
}

export async function runTacticalDetectionTransaction<T>(callback: (db: Db) => Promise<T>) {
  return prisma.$transaction(callback, { timeout: 60_000 });
}

export async function listTacticalDetections(
  userId: number,
  query: TacticalDetectionListQuery & { toExclusive?: Date; thresholdsHash: string; detectionVersion: number },
): Promise<TacticalDetectionListItem[]> {
  const rows = await prisma.tacticalDetection.findMany({
    where: {
      userId,
      kind: query.kind,
      thresholdsHash: query.thresholdsHash,
      detectionVersion: query.detectionVersion,
      importedGame: {
        endedAt: {
          ...(query.from ? { gte: query.from } : {}),
          ...(query.toExclusive ? { lt: query.toExclusive } : query.to ? { lte: query.to } : {}),
        },
      },
    },
    orderBy: [
      { importedGame: { endedAt: 'desc' } },
      { triggerPlyNumber: 'asc' },
    ],
    take: query.limit * 5,
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
  const feedbackRows = await prisma.tacticalDetectionFeedback.findMany({
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
  });
  const dislikedKeys = new Set(feedbackRows.map(feedbackKey));

  return rows.filter((row) => !dislikedKeys.has(feedbackKey(row))).slice(0, query.limit).map((row) => ({
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
