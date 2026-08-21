import { Prisma } from '@prisma/client';
import type { ExternalAccountWorkflowSummaryResponse } from '@chess-trainer/contracts/external-accounts';
import prisma from '../../prisma';

interface WorkflowSummaryRow {
  eligibleCount: number;
  unindexedCount: number;
  indexedCount: number;
  missingOpeningCount: number;
}

export const ImportedGameWorkflowCandidatesService = {
  forAccount: async (
    userId: number,
    accountId: number,
  ): Promise<ExternalAccountWorkflowSummaryResponse> => {
    const rows = await prisma.$queryRaw<WorkflowSummaryRow[]>(Prisma.sql`
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
    const row = rows[0] ?? {
      eligibleCount: 0,
      unindexedCount: 0,
      indexedCount: 0,
      missingOpeningCount: 0,
    };

    return {
      accountId,
      eligibleCount: row.eligibleCount,
      unindexedCount: row.unindexedCount,
      indexedCount: row.indexedCount,
      missingOpeningCount: row.missingOpeningCount,
    };
  },
};
