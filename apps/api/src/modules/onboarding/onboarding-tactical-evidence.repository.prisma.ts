import { Prisma, PrismaClient } from '@prisma/client';
import prisma from '../../prisma';

export interface OnboardingTacticalEvidencePolicy {
  thresholdsHash: string;
  detectionVersion: number;
}

export interface OnboardingTacticalEvidence {
  eligibleCount: number;
  processedCount: number;
  detectionCount: number;
}

export interface OnboardingTacticalEvidenceRepository {
  get(userId: number, policy: OnboardingTacticalEvidencePolicy): Promise<OnboardingTacticalEvidence>;
}

function assertPositiveId(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`${name} must be a positive integer.`);
}

function assertPolicy(policy: OnboardingTacticalEvidencePolicy): void {
  if (!policy.thresholdsHash) throw new Error('thresholdsHash is required.');
  if (!Number.isSafeInteger(policy.detectionVersion) || policy.detectionVersion <= 0) {
    throw new Error('detectionVersion must be a positive integer.');
  }
}

export function createOnboardingTacticalEvidenceRepository(
  database: PrismaClient = prisma,
): OnboardingTacticalEvidenceRepository {
  return {
    async get(userId, policy) {
      assertPositiveId(userId, 'userId');
      assertPolicy(policy);
      const rows = await database.$queryRaw<OnboardingTacticalEvidence[]>(Prisma.sql`
        WITH eligible_games AS (
          SELECT game."id"
          FROM "ImportedGame" AS game
          WHERE game."userId" = ${userId}
            AND game."pgn" IS NOT NULL
            AND game."plyIndexedAt" IS NOT NULL
            AND game."latestAnalysisStatus" = 'COMPLETED'
            AND EXISTS (
              SELECT 1
              FROM "ImportedGamePly" AS ply
              WHERE ply."importedGameId" = game."id"
            )
        ), processed_games AS (
          SELECT DISTINCT processed."importedGameId"
          FROM "TacticalDetectionProcessedGame" AS processed
          JOIN eligible_games AS game ON game."id" = processed."importedGameId"
          WHERE processed."userId" = ${userId}
            AND processed."thresholdsHash" = ${policy.thresholdsHash}
        ), visible_detections AS (
          SELECT detection."id"
          FROM "TacticalDetection" AS detection
          JOIN eligible_games AS game ON game."id" = detection."importedGameId"
          WHERE detection."userId" = ${userId}
            AND detection."thresholdsHash" = ${policy.thresholdsHash}
            AND detection."detectionVersion" = ${policy.detectionVersion}
            AND NOT EXISTS (
              SELECT 1
              FROM "TacticalDetectionFeedback" AS feedback
              WHERE feedback."userId" = ${userId}
                AND feedback."importedGameId" = detection."importedGameId"
                AND feedback."kind" = detection."kind"
                AND feedback."triggerPlyNumber" = detection."triggerPlyNumber"
                AND feedback."status" = 'DISLIKED'
            )
        )
        SELECT
          (SELECT COUNT(*)::int FROM eligible_games) AS "eligibleCount",
          (SELECT COUNT(*)::int FROM processed_games) AS "processedCount",
          (SELECT COUNT(*)::int FROM visible_detections) AS "detectionCount"
      `);
      return rows[0] ?? { eligibleCount: 0, processedCount: 0, detectionCount: 0 };
    },
  };
}

export const OnboardingTacticalEvidenceRepository = createOnboardingTacticalEvidenceRepository();
