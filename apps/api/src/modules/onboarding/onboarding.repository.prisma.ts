import { Prisma, PrismaClient } from '@prisma/client';
import prisma from '../../prisma';
import type { PreparationPurpose } from '../preparation/preparation.types';

export const ONBOARDING_MAX_TARGETS = 16;
export const ONBOARDING_MAX_LATEST_BATCHES = 8;

export interface OnboardingUserDispositionRecord {
  disposition: 'PENDING' | 'COMPLETED' | 'SKIPPED';
  reason: string | null;
  changedAt: Date | null;
}

export interface OnboardingRunRecord {
  id: number;
  userId: number;
  purpose: PreparationPurpose;
  status: string;
  attentionCode: string | null;
  attentionDetail: string | null;
  firstImportedAt: Date | null;
  firstIndexedAt: Date | null;
  firstAnalysedAt: Date | null;
  coreReadyAt: Date | null;
  analysisCompletedAt: Date | null;
  targetCount: number;
}

export interface OnboardingScopeTotals {
  targetCount: number;
  completedImportTargets: number;
  windowsCompleted: number;
  windowsTotal: number;
  unknownWindowTargets: number;
  nonTerminalImportTargets: number;
  rateLimitUntil: Date | null;
  activeIndexBatches: number;
  activeAnalysisBatches: number;
  committedCount: number;
  indexedCount: number;
  indexPendingCount: number;
  indexFailedCount: number;
  analysedCount: number;
  analysisPendingCount: number;
  analysisRunningCount: number;
  analysisFailedCount: number;
}

export interface OnboardingTargetRecord {
  id: number;
  accountId: number | null;
  provider: string;
  username: string;
  ordinal: number;
  importStatus: string | null;
  windowsTotal: number | null;
  windowsCompleted: number;
  importedCount: number;
  indexedCount: number;
  indexPendingCount: number;
  indexFailedCount: number;
  analysedCount: number;
  analysisPendingCount: number;
  analysisRunningCount: number;
  analysisFailedCount: number;
  firstImportedAt: Date | null;
  firstIndexedAt: Date | null;
  firstAnalysedAt: Date | null;
  coreReadyAt: Date | null;
}

export interface OnboardingBatchSummaryRecord {
  batchCount: number;
  queuedBatches: number;
  runningBatches: number;
  terminalBatches: number;
  selectedTasks: number;
  queuedTasks: number;
  runningTasks: number;
  completedTasks: number;
  skippedTasks: number;
  failedTasks: number;
  cancelledTasks: number;
  remainingTasks: number;
}

export interface OnboardingBatchRecord {
  id: number;
  targetId: number;
  stage: 'INDEX' | 'ANALYSIS';
  lane: string;
  status: string;
  totalTasks: number;
  queuedTasks: number;
  runningTasks: number;
  completedTasks: number;
  skippedTasks: number;
  failedTasks: number;
  cancelledTasks: number;
}

export interface OnboardingProductEvidence {
  importedCount: number;
  indexedCount: number;
  indexFailedCount: number;
  openingCount: number;
  analysedCount: number;
  analysisRunningCount: number;
  analysisFailedCount: number;
  tacticalCount: number;
}

export interface OnboardingRevealRecord {
  kind: 'IMPORTED_GAME' | 'OPENING' | 'ANALYSIS';
  importedGameId: number;
  accountId: number;
  openingName: string | null;
  openingEco: string | null;
}

export interface OnboardingReadRepository {
  getDisposition(userId: number): Promise<OnboardingUserDispositionRecord>;
  getLatestRun(userId: number): Promise<OnboardingRunRecord | null>;
  getScopeTotals(userId: number, runId: number): Promise<OnboardingScopeTotals>;
  listTargets(userId: number, runId: number): Promise<OnboardingTargetRecord[]>;
  getBatchSummary(userId: number, runId: number): Promise<OnboardingBatchSummaryRecord>;
  listLatestBatches(userId: number, runId: number): Promise<OnboardingBatchRecord[]>;
  getProductEvidence(userId: number): Promise<OnboardingProductEvidence>;
  listReveals(userId: number): Promise<OnboardingRevealRecord[]>;
}

type UserDispositionRow = {
  onboardingDisposition: string;
  onboardingDispositionReason: string | null;
  onboardingDispositionAt: Date | null;
};

type RunRow = Omit<OnboardingRunRecord, 'purpose'> & { purpose: string };
type BatchRow = Omit<OnboardingBatchRecord, 'stage'> & { stage: string };

const PREPARATION_PURPOSES = new Set<PreparationPurpose>(['ONBOARDING', 'EXPANSION', 'RECOVERY']);

const EMPTY_SCOPE_TOTALS: OnboardingScopeTotals = {
  targetCount: 0,
  completedImportTargets: 0,
  windowsCompleted: 0,
  windowsTotal: 0,
  unknownWindowTargets: 0,
  nonTerminalImportTargets: 0,
  rateLimitUntil: null,
  activeIndexBatches: 0,
  activeAnalysisBatches: 0,
  committedCount: 0,
  indexedCount: 0,
  indexPendingCount: 0,
  indexFailedCount: 0,
  analysedCount: 0,
  analysisPendingCount: 0,
  analysisRunningCount: 0,
  analysisFailedCount: 0,
};

const EMPTY_BATCH_SUMMARY: OnboardingBatchSummaryRecord = {
  batchCount: 0,
  queuedBatches: 0,
  runningBatches: 0,
  terminalBatches: 0,
  selectedTasks: 0,
  queuedTasks: 0,
  runningTasks: 0,
  completedTasks: 0,
  skippedTasks: 0,
  failedTasks: 0,
  cancelledTasks: 0,
  remainingTasks: 0,
};

function assertPositiveId(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`${name} must be a positive integer.`);
}

export function createOnboardingReadRepository(database: PrismaClient = prisma): OnboardingReadRepository {
  return {
    async getDisposition(userId) {
      assertPositiveId(userId, 'userId');
      const rows = await database.$queryRaw<UserDispositionRow[]>(Prisma.sql`
        SELECT
          "onboardingDisposition",
          "onboardingDispositionReason",
          "onboardingDispositionAt"
        FROM "AppUser"
        WHERE "id" = ${userId}
        LIMIT 1
      `);
      const row = rows[0];
      if (!row) throw new Error(`App user ${userId} not found.`);
      if (!['PENDING', 'COMPLETED', 'SKIPPED'].includes(row.onboardingDisposition)) {
        throw new Error(`Unsupported onboarding disposition: ${row.onboardingDisposition}`);
      }
      return {
        disposition: row.onboardingDisposition as OnboardingUserDispositionRecord['disposition'],
        reason: row.onboardingDispositionReason,
        changedAt: row.onboardingDispositionAt,
      };
    },

    async getLatestRun(userId) {
      assertPositiveId(userId, 'userId');
      const rows = await database.$queryRaw<RunRow[]>(Prisma.sql`
        SELECT
          run."id",
          run."userId",
          run."purpose",
          run."status",
          run."attentionCode",
          run."attentionDetail",
          run."firstImportedAt",
          run."firstIndexedAt",
          run."firstAnalysedAt",
          run."coreReadyAt",
          run."analysisCompletedAt",
          (SELECT COUNT(*)::int FROM "DataPreparationTarget" AS target WHERE target."preparationRunId" = run."id") AS "targetCount"
        FROM "DataPreparationRun" AS run
        WHERE run."userId" = ${userId}
        ORDER BY run."createdAt" DESC, run."id" DESC
        LIMIT 1
      `);
      const row = rows[0];
      if (!row) return null;
      if (!PREPARATION_PURPOSES.has(row.purpose as PreparationPurpose)) {
        throw new Error(`Unsupported preparation purpose: ${row.purpose}`);
      }
      return { ...row, purpose: row.purpose as PreparationPurpose };
    },

    async getScopeTotals(userId, runId) {
      assertPositiveId(userId, 'userId');
      assertPositiveId(runId, 'runId');
      const rows = await database.$queryRaw<OnboardingScopeTotals[]>(Prisma.sql`
        WITH owned_targets AS (
          SELECT target.*, import_run."status" AS "importStatus",
                 import_run."windowsTotal", import_run."windowsCompleted", import_run."rateLimitUntil"
          FROM "DataPreparationTarget" AS target
          JOIN "DataPreparationRun" AS run ON run."id" = target."preparationRunId"
          LEFT JOIN "ImportRun" AS import_run ON import_run."id" = target."currentImportRunId"
          WHERE target."preparationRunId" = ${runId}
            AND run."userId" = ${userId}
        ), evidence AS (
          SELECT
            COUNT(*) FILTER (WHERE game."pgn" IS NOT NULL)::int AS "committedCount",
            COUNT(*) FILTER (WHERE game."pgn" IS NOT NULL AND game."plyIndexedAt" IS NOT NULL)::int AS "indexedCount",
            COUNT(*) FILTER (WHERE game."pgn" IS NOT NULL AND game."plyIndexedAt" IS NULL AND game."plyIndexError" IS NULL)::int AS "indexPendingCount",
            COUNT(*) FILTER (WHERE game."pgn" IS NOT NULL AND game."plyIndexedAt" IS NULL AND game."plyIndexError" IS NOT NULL)::int AS "indexFailedCount",
            COUNT(*) FILTER (WHERE game."pgn" IS NOT NULL AND game."plyIndexedAt" IS NOT NULL AND game."latestAnalysisStatus" = 'COMPLETED')::int AS "analysedCount",
            COUNT(*) FILTER (WHERE game."pgn" IS NOT NULL AND game."plyIndexedAt" IS NOT NULL AND game."latestAnalysisStatus" IS NULL)::int AS "analysisPendingCount",
            COUNT(*) FILTER (WHERE game."pgn" IS NOT NULL AND game."plyIndexedAt" IS NOT NULL AND game."latestAnalysisStatus" = 'RUNNING')::int AS "analysisRunningCount",
            COUNT(*) FILTER (WHERE game."pgn" IS NOT NULL AND game."plyIndexedAt" IS NOT NULL AND game."latestAnalysisStatus" = 'FAILED')::int AS "analysisFailedCount"
          FROM "ImportedGame" AS game
          WHERE game."userId" = ${userId}
            AND EXISTS (
              SELECT 1
              FROM owned_targets AS target
              WHERE target."accountId" = game."accountId"
                AND game."endedAt" >= target."requestedFrom"
                AND game."endedAt" < target."requestedTo"
                AND (
                  NOT (target."scopeJson" ? 'rated')
                  OR UPPER(target."scopeJson"->>'rated') = 'ANY'
                  OR (UPPER(target."scopeJson"->>'rated') = 'RATED' AND game."rated" IS TRUE)
                  OR (UPPER(target."scopeJson"->>'rated') = 'UNRATED' AND game."rated" IS FALSE)
                )
                AND (
                  NOT (target."scopeJson" ? 'speedCategories')
                  OR jsonb_array_length(target."scopeJson"->'speedCategories') = 0
                  OR EXISTS (
                    SELECT 1 FROM jsonb_array_elements_text(target."scopeJson"->'speedCategories') AS speed(value)
                    WHERE LOWER(BTRIM(speed.value)) = LOWER(BTRIM(game."speedCategory"))
                  )
                )
                AND (
                  NOT (target."scopeJson" ? 'variants')
                  OR jsonb_array_length(target."scopeJson"->'variants') = 0
                  OR EXISTS (
                    SELECT 1 FROM jsonb_array_elements_text(target."scopeJson"->'variants') AS variant(value)
                    WHERE (
                      LOWER(BTRIM(variant.value)) IN ('standard', 'chess')
                      AND COALESCE(NULLIF(LOWER(BTRIM(game."variant")), ''), 'standard') IN ('standard', 'chess')
                    ) OR (
                      LOWER(BTRIM(variant.value)) NOT IN ('standard', 'chess')
                      AND game."variant" IS NOT NULL
                      AND LOWER(BTRIM(variant.value)) = LOWER(BTRIM(game."variant"))
                    )
                  )
                )
            )
        ), batch_activity AS (
          SELECT
            COUNT(*) FILTER (WHERE "stage" = 'INDEX' AND "status" IN ('QUEUED', 'RUNNING'))::int AS "activeIndexBatches",
            COUNT(*) FILTER (WHERE "stage" = 'ANALYSIS' AND "status" IN ('QUEUED', 'RUNNING'))::int AS "activeAnalysisBatches"
          FROM "DataPreparationBatch"
          WHERE "preparationRunId" = ${runId}
        )
        SELECT
          (SELECT COUNT(*)::int FROM owned_targets) AS "targetCount",
          (SELECT COUNT(*)::int FROM owned_targets WHERE "importStatus" = 'COMPLETED') AS "completedImportTargets",
          COALESCE((SELECT SUM("windowsCompleted")::int FROM owned_targets), 0) AS "windowsCompleted",
          COALESCE((SELECT SUM("windowsTotal")::int FROM owned_targets WHERE "windowsTotal" IS NOT NULL), 0) AS "windowsTotal",
          (SELECT COUNT(*)::int FROM owned_targets WHERE "windowsTotal" IS NULL) AS "unknownWindowTargets",
          (SELECT COUNT(*)::int FROM owned_targets WHERE "importStatus" IS NULL OR "importStatus" NOT IN ('COMPLETED', 'FAILED', 'CANCELLED')) AS "nonTerminalImportTargets",
          (SELECT MAX("rateLimitUntil") FROM owned_targets WHERE "importStatus" IN ('QUEUED', 'RUNNING')) AS "rateLimitUntil",
          COALESCE(batch_activity."activeIndexBatches", 0)::int AS "activeIndexBatches",
          COALESCE(batch_activity."activeAnalysisBatches", 0)::int AS "activeAnalysisBatches",
          COALESCE(evidence."committedCount", 0)::int AS "committedCount",
          COALESCE(evidence."indexedCount", 0)::int AS "indexedCount",
          COALESCE(evidence."indexPendingCount", 0)::int AS "indexPendingCount",
          COALESCE(evidence."indexFailedCount", 0)::int AS "indexFailedCount",
          COALESCE(evidence."analysedCount", 0)::int AS "analysedCount",
          COALESCE(evidence."analysisPendingCount", 0)::int AS "analysisPendingCount",
          COALESCE(evidence."analysisRunningCount", 0)::int AS "analysisRunningCount",
          COALESCE(evidence."analysisFailedCount", 0)::int AS "analysisFailedCount"
        FROM evidence CROSS JOIN batch_activity
      `);
      return rows[0] ?? EMPTY_SCOPE_TOTALS;
    },

    async listTargets(userId, runId) {
      assertPositiveId(userId, 'userId');
      assertPositiveId(runId, 'runId');
      return database.$queryRaw<OnboardingTargetRecord[]>(Prisma.sql`
        SELECT
          target."id",
          target."accountId",
          target."accountProvider" AS "provider",
          target."accountUsername" AS "username",
          target."ordinal",
          import_run."status" AS "importStatus",
          import_run."windowsTotal",
          COALESCE(import_run."windowsCompleted", 0)::int AS "windowsCompleted",
          COALESCE(evidence."importedCount", 0)::int AS "importedCount",
          COALESCE(evidence."indexedCount", 0)::int AS "indexedCount",
          COALESCE(evidence."indexPendingCount", 0)::int AS "indexPendingCount",
          COALESCE(evidence."indexFailedCount", 0)::int AS "indexFailedCount",
          COALESCE(evidence."analysedCount", 0)::int AS "analysedCount",
          COALESCE(evidence."analysisPendingCount", 0)::int AS "analysisPendingCount",
          COALESCE(evidence."analysisRunningCount", 0)::int AS "analysisRunningCount",
          COALESCE(evidence."analysisFailedCount", 0)::int AS "analysisFailedCount",
          target."firstImportedAt",
          target."firstIndexedAt",
          target."firstAnalysedAt",
          target."coreReadyAt"
        FROM "DataPreparationTarget" AS target
        JOIN "DataPreparationRun" AS run ON run."id" = target."preparationRunId"
        LEFT JOIN "ImportRun" AS import_run ON import_run."id" = target."currentImportRunId"
        LEFT JOIN LATERAL (
          SELECT
            COUNT(*) FILTER (WHERE game."pgn" IS NOT NULL)::int AS "importedCount",
            COUNT(*) FILTER (WHERE game."pgn" IS NOT NULL AND game."plyIndexedAt" IS NOT NULL)::int AS "indexedCount",
            COUNT(*) FILTER (WHERE game."pgn" IS NOT NULL AND game."plyIndexedAt" IS NULL AND game."plyIndexError" IS NULL)::int AS "indexPendingCount",
            COUNT(*) FILTER (WHERE game."pgn" IS NOT NULL AND game."plyIndexedAt" IS NULL AND game."plyIndexError" IS NOT NULL)::int AS "indexFailedCount",
            COUNT(*) FILTER (WHERE game."pgn" IS NOT NULL AND game."plyIndexedAt" IS NOT NULL AND game."latestAnalysisStatus" = 'COMPLETED')::int AS "analysedCount",
            COUNT(*) FILTER (WHERE game."pgn" IS NOT NULL AND game."plyIndexedAt" IS NOT NULL AND game."latestAnalysisStatus" IS NULL)::int AS "analysisPendingCount",
            COUNT(*) FILTER (WHERE game."pgn" IS NOT NULL AND game."plyIndexedAt" IS NOT NULL AND game."latestAnalysisStatus" = 'RUNNING')::int AS "analysisRunningCount",
            COUNT(*) FILTER (WHERE game."pgn" IS NOT NULL AND game."plyIndexedAt" IS NOT NULL AND game."latestAnalysisStatus" = 'FAILED')::int AS "analysisFailedCount"
          FROM "ImportedGame" AS game
          WHERE game."userId" = run."userId"
            AND game."accountId" = target."accountId"
            AND game."endedAt" >= target."requestedFrom"
            AND game."endedAt" < target."requestedTo"
            AND (
              NOT (target."scopeJson" ? 'rated') OR UPPER(target."scopeJson"->>'rated') = 'ANY'
              OR (UPPER(target."scopeJson"->>'rated') = 'RATED' AND game."rated" IS TRUE)
              OR (UPPER(target."scopeJson"->>'rated') = 'UNRATED' AND game."rated" IS FALSE)
            )
            AND (
              NOT (target."scopeJson" ? 'speedCategories') OR jsonb_array_length(target."scopeJson"->'speedCategories') = 0
              OR EXISTS (SELECT 1 FROM jsonb_array_elements_text(target."scopeJson"->'speedCategories') AS speed(value) WHERE LOWER(BTRIM(speed.value)) = LOWER(BTRIM(game."speedCategory")))
            )
            AND (
              NOT (target."scopeJson" ? 'variants') OR jsonb_array_length(target."scopeJson"->'variants') = 0
              OR EXISTS (
                SELECT 1 FROM jsonb_array_elements_text(target."scopeJson"->'variants') AS variant(value)
                WHERE (LOWER(BTRIM(variant.value)) IN ('standard', 'chess') AND COALESCE(NULLIF(LOWER(BTRIM(game."variant")), ''), 'standard') IN ('standard', 'chess'))
                   OR (LOWER(BTRIM(variant.value)) NOT IN ('standard', 'chess') AND game."variant" IS NOT NULL AND LOWER(BTRIM(variant.value)) = LOWER(BTRIM(game."variant")))
              )
            )
        ) AS evidence ON TRUE
        WHERE target."preparationRunId" = ${runId}
          AND run."userId" = ${userId}
        ORDER BY target."ordinal" ASC, target."id" ASC
        LIMIT ${ONBOARDING_MAX_TARGETS}
      `);
    },

    async getBatchSummary(userId, runId) {
      assertPositiveId(userId, 'userId');
      assertPositiveId(runId, 'runId');
      const rows = await database.$queryRaw<OnboardingBatchSummaryRecord[]>(Prisma.sql`
        WITH owned_batches AS (
          SELECT batch.*
          FROM "DataPreparationBatch" AS batch
          JOIN "DataPreparationRun" AS run ON run."id" = batch."preparationRunId"
          WHERE batch."preparationRunId" = ${runId}
            AND run."userId" = ${userId}
        ), live_task_counts AS (
          SELECT
            COUNT(*) FILTER (WHERE task."status" = 'QUEUED')::int AS "queuedTasks",
            COUNT(*) FILTER (WHERE task."status" = 'RUNNING')::int AS "runningTasks"
          FROM "JobTask" AS task
          WHERE EXISTS (
            SELECT 1 FROM owned_batches AS batch WHERE batch."jobRunId" = task."jobRunId"
          )
        )
        SELECT
          COUNT(*)::int AS "batchCount",
          COUNT(*) FILTER (WHERE batch."status" = 'QUEUED')::int AS "queuedBatches",
          COUNT(*) FILTER (WHERE batch."status" = 'RUNNING')::int AS "runningBatches",
          COUNT(*) FILTER (WHERE batch."status" NOT IN ('QUEUED', 'RUNNING'))::int AS "terminalBatches",
          COALESCE(SUM(batch."totalTasks"), 0)::int AS "selectedTasks",
          COALESCE((SELECT "queuedTasks" FROM live_task_counts), 0)::int AS "queuedTasks",
          COALESCE((SELECT "runningTasks" FROM live_task_counts), 0)::int AS "runningTasks",
          COALESCE(SUM(batch."completedTasks"), 0)::int AS "completedTasks",
          COALESCE(SUM(batch."skippedTasks"), 0)::int AS "skippedTasks",
          COALESCE(SUM(batch."failedTasks"), 0)::int AS "failedTasks",
          COALESCE(SUM(batch."cancelledTasks"), 0)::int AS "cancelledTasks",
          GREATEST(0, COALESCE(SUM(
            batch."totalTasks" - batch."completedTasks" - batch."skippedTasks" - batch."failedTasks" - batch."cancelledTasks"
          ), 0))::int AS "remainingTasks"
        FROM owned_batches AS batch
      `);
      return rows[0] ?? EMPTY_BATCH_SUMMARY;
    },

    async listLatestBatches(userId, runId) {
      assertPositiveId(userId, 'userId');
      assertPositiveId(runId, 'runId');
      const rows = await database.$queryRaw<BatchRow[]>(Prisma.sql`
        SELECT
          batch."id", batch."targetId", batch."stage", batch."lane", batch."status", batch."totalTasks",
          COALESCE(task_counts."queuedTasks", 0)::int AS "queuedTasks",
          COALESCE(task_counts."runningTasks", 0)::int AS "runningTasks",
          batch."completedTasks", batch."skippedTasks", batch."failedTasks", batch."cancelledTasks"
        FROM "DataPreparationBatch" AS batch
        JOIN "DataPreparationRun" AS run ON run."id" = batch."preparationRunId"
        LEFT JOIN LATERAL (
          SELECT
            COUNT(*) FILTER (WHERE task."status" = 'QUEUED')::int AS "queuedTasks",
            COUNT(*) FILTER (WHERE task."status" = 'RUNNING')::int AS "runningTasks"
          FROM "JobTask" AS task
          WHERE task."jobRunId" = batch."jobRunId"
        ) AS task_counts ON TRUE
        WHERE batch."preparationRunId" = ${runId}
          AND run."userId" = ${userId}
        ORDER BY batch."ordinal" DESC, batch."id" DESC
        LIMIT ${ONBOARDING_MAX_LATEST_BATCHES}
      `);
      return rows.map((row) => ({ ...row, stage: row.stage as 'INDEX' | 'ANALYSIS' }));
    },

    async getProductEvidence(userId) {
      assertPositiveId(userId, 'userId');
      const rows = await database.$queryRaw<OnboardingProductEvidence[]>(Prisma.sql`
        SELECT
          COUNT(*) FILTER (WHERE game."pgn" IS NOT NULL)::int AS "importedCount",
          COUNT(*) FILTER (WHERE game."pgn" IS NOT NULL AND game."plyIndexedAt" IS NOT NULL)::int AS "indexedCount",
          COUNT(*) FILTER (WHERE game."pgn" IS NOT NULL AND game."plyIndexedAt" IS NULL AND game."plyIndexError" IS NOT NULL)::int AS "indexFailedCount",
          COUNT(*) FILTER (WHERE game."pgn" IS NOT NULL AND game."plyIndexedAt" IS NOT NULL AND game."openingName" IS NOT NULL)::int AS "openingCount",
          COUNT(*) FILTER (WHERE game."pgn" IS NOT NULL AND game."plyIndexedAt" IS NOT NULL AND game."latestAnalysisStatus" = 'COMPLETED')::int AS "analysedCount",
          COUNT(*) FILTER (WHERE game."pgn" IS NOT NULL AND game."plyIndexedAt" IS NOT NULL AND game."latestAnalysisStatus" = 'RUNNING')::int AS "analysisRunningCount",
          COUNT(*) FILTER (WHERE game."pgn" IS NOT NULL AND game."plyIndexedAt" IS NOT NULL AND game."latestAnalysisStatus" = 'FAILED')::int AS "analysisFailedCount",
          (SELECT COUNT(*)::int FROM "TacticalDetection" AS detection WHERE detection."userId" = ${userId}) AS "tacticalCount"
        FROM "ImportedGame" AS game
        WHERE game."userId" = ${userId}
      `);
      return rows[0] ?? {
        importedCount: 0,
        indexedCount: 0,
        indexFailedCount: 0,
        openingCount: 0,
        analysedCount: 0,
        analysisRunningCount: 0,
        analysisFailedCount: 0,
        tacticalCount: 0,
      };
    },

    async listReveals(userId) {
      assertPositiveId(userId, 'userId');
      return database.$queryRaw<OnboardingRevealRecord[]>(Prisma.sql`
        WITH candidates AS (
          SELECT
            CASE
              WHEN game."latestAnalysisStatus" = 'COMPLETED' THEN 'ANALYSIS'
              WHEN game."openingName" IS NOT NULL THEN 'OPENING'
              ELSE 'IMPORTED_GAME'
            END AS "kind",
            game."id" AS "importedGameId",
            game."accountId",
            game."openingName",
            game."openingEco",
            game."endedAt",
            ROW_NUMBER() OVER (
              PARTITION BY CASE
                WHEN game."latestAnalysisStatus" = 'COMPLETED' THEN 'ANALYSIS'
                WHEN game."openingName" IS NOT NULL THEN 'OPENING'
                ELSE 'IMPORTED_GAME'
              END
              ORDER BY game."endedAt" DESC NULLS LAST, game."id" DESC
            ) AS rank
          FROM "ImportedGame" AS game
          WHERE game."userId" = ${userId}
            AND game."pgn" IS NOT NULL
        )
        SELECT "kind", "importedGameId", "accountId", "openingName", "openingEco"
        FROM candidates
        WHERE rank = 1
        ORDER BY CASE "kind" WHEN 'ANALYSIS' THEN 1 WHEN 'OPENING' THEN 2 ELSE 3 END
        LIMIT 3
      `);
    },
  };
}

export const OnboardingReadRepository = createOnboardingReadRepository();
