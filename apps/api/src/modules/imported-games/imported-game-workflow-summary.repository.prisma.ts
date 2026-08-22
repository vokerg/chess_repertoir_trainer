import { Prisma, PrismaClient } from '@prisma/client';
import prisma from '../../prisma';

export interface ImportedGameWorkflowSummaryCounts {
  eligibleCount: number;
  unindexedCount: number;
  indexedCount: number;
  missingOpeningCount: number;
}

export interface ImportedGameWorkflowSummaryRepository {
  forAccount(userId: number, accountId: number): Promise<ImportedGameWorkflowSummaryCounts>;
}

export function createImportedGameWorkflowSummaryRepository(
  database: PrismaClient = prisma,
): ImportedGameWorkflowSummaryRepository {
  return {
    async forAccount(userId, accountId) {
      const rows = await database.$queryRaw<ImportedGameWorkflowSummaryCounts[]>(Prisma.sql`
        SELECT
          COUNT(*)::int AS "eligibleCount",
          COUNT(*) FILTER (WHERE game."plyIndexedAt" IS NULL)::int AS "unindexedCount",
          COUNT(*) FILTER (WHERE game."plyIndexedAt" IS NOT NULL)::int AS "indexedCount",
          COUNT(*) FILTER (
            WHERE game."plyIndexedAt" IS NOT NULL
              AND (game."openingEco" IS NULL OR game."openingName" IS NULL)
          )::int AS "missingOpeningCount"
        FROM "ImportedGame" AS game
        WHERE game."userId" = ${userId}
          AND game."accountId" = ${accountId}
          AND LOWER(BTRIM(COALESCE(game."speedCategory", ''))) IN ('blitz', 'rapid')
          AND COALESCE(NULLIF(LOWER(BTRIM(game."variant")), ''), 'standard') IN ('standard', 'chess')
      `);
      return rows[0] ?? {
        eligibleCount: 0,
        unindexedCount: 0,
        indexedCount: 0,
        missingOpeningCount: 0,
      };
    },
  };
}

export const ImportedGameWorkflowSummaryRepository =
  createImportedGameWorkflowSummaryRepository();
