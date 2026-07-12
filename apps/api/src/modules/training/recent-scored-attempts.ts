import { Prisma } from '@prisma/client';
import prisma from '../../prisma';
import { SCORED_TRAINING_RESULTS, TRAINING_STATS_RECENT_ATTEMPTS } from './training.constants';
import { performanceDebug } from '../../utils/performance-debug';

export interface RecentScoredAttempt {
  lineId: number;
  sublineHash: string;
  result: string;
  passed: boolean | null;
  startedAt: Date;
  completedAt: Date | null;
}

export interface SublineIdentity { lineId: number; sublineHash: string }

export function sublineIdentityKey(identity: SublineIdentity): string {
  return `${identity.lineId}:${identity.sublineHash}`;
}

export async function loadRecentScoredAttempts(
  userId: number,
  identities: SublineIdentity[],
): Promise<RecentScoredAttempt[]> {
  const unique = [...new Map(identities.map((identity) => [sublineIdentityKey(identity), identity])).values()];
  if (unique.length === 0) return [];

  const identityValues = Prisma.join(unique.map(({ lineId, sublineHash }) => Prisma.sql`(${lineId}, ${sublineHash})`));
  const startedAt = performance.now();
  const rows = await prisma.$queryRaw<RecentScoredAttempt[]>(Prisma.sql`
    WITH requested("lineId", "sublineHash") AS (VALUES ${identityValues}),
    ranked AS (
      SELECT
        attempt."lineId",
        attempt."sublineHash",
        attempt."result",
        attempt."passed",
        attempt."startedAt",
        attempt."completedAt",
        ROW_NUMBER() OVER (
          PARTITION BY attempt."lineId", attempt."sublineHash"
          ORDER BY attempt."completedAt" DESC NULLS LAST, attempt."startedAt" DESC
        ) AS row_number
      FROM "TrainingSublineAttempt" attempt
      INNER JOIN requested
        ON requested."lineId" = attempt."lineId"
       AND requested."sublineHash" = attempt."sublineHash"
      WHERE attempt."userId" = ${userId}
        AND attempt."result" IN (${Prisma.join([...SCORED_TRAINING_RESULTS])})
    )
    SELECT "lineId", "sublineHash", "result", "passed", "startedAt", "completedAt"
    FROM ranked
    WHERE row_number <= ${TRAINING_STATS_RECENT_ATTEMPTS}
    ORDER BY "lineId", "sublineHash", "completedAt" DESC NULLS LAST, "startedAt" DESC
  `);
  performanceDebug('recent-attempt-query', startedAt, { identities: unique.length, attemptRows: rows.length });
  return rows;
}

export function groupRecentAttempts(attempts: RecentScoredAttempt[]): Map<string, RecentScoredAttempt[]> {
  const grouped = new Map<string, RecentScoredAttempt[]>();
  for (const attempt of attempts) {
    const key = sublineIdentityKey(attempt);
    grouped.set(key, [...(grouped.get(key) ?? []), attempt]);
  }
  return grouped;
}

export function summarizeRecentAttempts(attempts: RecentScoredAttempt[]) {
  const passedCount = attempts.filter((attempt) => attempt.result === 'PASSED' || attempt.passed === true).length;
  const failedCount = attempts.filter((attempt) => attempt.result === 'FAILED' || attempt.passed === false).length;
  return {
    recentAttempts: attempts.length,
    passedCount,
    failedCount,
    passRate: attempts.length > 0 ? passedCount / attempts.length : 0,
  };
}
