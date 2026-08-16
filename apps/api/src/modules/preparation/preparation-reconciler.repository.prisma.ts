import { Prisma, PrismaClient } from '@prisma/client';
import prisma from '../../prisma';
import type { PreparationRunStatus, PreparationStage } from './preparation.types';

const CLAIMABLE_STATUSES = [
  'QUEUED',
  'RUNNING',
  'PAUSE_REQUESTED',
  'CANCEL_REQUESTED',
] as const;
const RECOVERABLE_IMPORT_ATTENTION_CODES = [
  'IMPORT_PAUSED',
  'IMPORT_RETRY_AVAILABLE',
] as const;

export interface PreparationReconcileClaim {
  id: number;
  userId: number;
  status: PreparationRunStatus;
  dueAt: Date | null;
}

export interface PreparationTargetSnapshot {
  id: number;
  accountId: number | null;
  ordinal: number;
  currentImportRunId: number | null;
  importStatus: string | null;
  importWorkKey: string | null;
  importedCount: number;
  indexedCount: number;
  indexPendingCount: number;
  indexFailedCount: number;
  analysedCount: number;
  analysisPendingCount: number;
  analysisRunningCount: number;
  analysisFailedCount: number;
  normalIndexBatches: number;
  normalAnalysisBatches: number;
}

export interface PreparationActiveBatchSnapshot {
  id: number;
  targetId: number;
  stage: PreparationStage;
  status: string;
  jobRunId: number | null;
  priority: number | null;
  createdAt: Date;
  startedAt: Date | null;
  firstSettledAt: Date | null;
  settledAt: Date | null;
  activeWorkKeys: number;
  higherPriorityRunnable: boolean;
  workerCapacityAvailable: boolean;
}

export interface PreparationBatchTelemetry {
  batchCount: number;
  maxQueueWaitMs: number | null;
  maxFirstSettlementMs: number | null;
  maxTotalSettlementMs: number | null;
}

export interface PreparationReconcileSnapshot {
  run: {
    id: number;
    userId: number;
    status: PreparationRunStatus;
    retryGeneration: number;
    attentionCode: string | null;
    attentionDetail: string | null;
    firstImportedAt: Date | null;
    firstIndexedAt: Date | null;
    firstAnalysedAt: Date | null;
    coreReadyAt: Date | null;
    analysisCompletedAt: Date | null;
  };
  targets: PreparationTargetSnapshot[];
  activeBatches: PreparationActiveBatchSnapshot[];
  telemetry: PreparationBatchTelemetry;
}

export interface ApplyPreparationReconcileStateInput {
  runId: number;
  expectedStatus: PreparationRunStatus;
  status: PreparationRunStatus;
  attentionCode: string | null;
  attentionDetail: string | null;
  reconcileAfter: Date | null;
  markFirstImported: boolean;
  markFirstIndexed: boolean;
  markFirstAnalysed: boolean;
  markCoreReady: boolean;
  markAnalysisCompleted: boolean;
  targetMilestones: Array<{
    targetId: number;
    firstImported: boolean;
    firstIndexed: boolean;
    firstAnalysed: boolean;
    coreReady: boolean;
  }>;
}

export interface PreparationReconcilerRepository {
  claimNextDueRun(now: Date, leaseUntil: Date): Promise<PreparationReconcileClaim | null>;
  loadSnapshot(runId: number): Promise<PreparationReconcileSnapshot | null>;
  applyState(input: ApplyPreparationReconcileStateInput): Promise<boolean>;
  requestPause(userId: number, runId: number): Promise<boolean>;
  resume(userId: number, runId: number): Promise<boolean>;
  requestCancel(userId: number, runId: number): Promise<boolean>;
}

type RunRow = {
  id: number;
  userId: number;
  status: string;
  retryGeneration: number;
  attentionCode: string | null;
  attentionDetail: string | null;
  reconcileAfter: Date | null;
  firstImportedAt: Date | null;
  firstIndexedAt: Date | null;
  firstAnalysedAt: Date | null;
  coreReadyAt: Date | null;
  analysisCompletedAt: Date | null;
};

type TargetRow = Omit<PreparationTargetSnapshot, 'importedCount'
  | 'indexedCount'
  | 'indexPendingCount'
  | 'indexFailedCount'
  | 'analysedCount'
  | 'analysisPendingCount'
  | 'analysisRunningCount'
  | 'analysisFailedCount'
  | 'normalIndexBatches'
  | 'normalAnalysisBatches'> & {
    importedCount: number;
    indexedCount: number;
    indexPendingCount: number;
    indexFailedCount: number;
    analysedCount: number;
    analysisPendingCount: number;
    analysisRunningCount: number;
    analysisFailedCount: number;
    normalIndexBatches: number;
    normalAnalysisBatches: number;
  };

type ActiveBatchRow = Omit<PreparationActiveBatchSnapshot, 'stage'> & { stage: string };
type TelemetryRow = PreparationBatchTelemetry;
type StatusRow = { status: string };

export function createPreparationReconcilerRepository(
  database: PrismaClient = prisma,
): PreparationReconcilerRepository {
  return {
    async claimNextDueRun(now, leaseUntil) {
      validateDate(now, 'now');
      validateDate(leaseUntil, 'leaseUntil');
      if (leaseUntil <= now) throw new Error('Preparation reconcile lease must end after now.');

      return database.$transaction(async (transaction) => {
        const rows = await transaction.$queryRaw<RunRow[]>(Prisma.sql`
          SELECT
            run."id",
            run."userId",
            run."status",
            run."retryGeneration",
            run."attentionCode",
            run."attentionDetail",
            run."reconcileAfter",
            run."firstImportedAt",
            run."firstIndexedAt",
            run."firstAnalysedAt",
            run."coreReadyAt",
            run."analysisCompletedAt"
          FROM "DataPreparationRun" AS run
          WHERE (
            (
              run."status" IN (${Prisma.join(CLAIMABLE_STATUSES.map((status) => Prisma.sql`${status}`))})
              AND (run."reconcileAfter" IS NULL OR run."reconcileAfter" <= ${now})
            )
            OR (
              run."status" = 'NEEDS_ATTENTION'
              AND run."attentionCode" IN (${Prisma.join(RECOVERABLE_IMPORT_ATTENTION_CODES.map((code) => Prisma.sql`${code}`))})
              AND run."reconcileAfter" IS NOT NULL
              AND run."reconcileAfter" <= ${now}
            )
          )
          ORDER BY COALESCE(run."reconcileAfter", run."createdAt") ASC, run."id" ASC
          FOR UPDATE SKIP LOCKED
          LIMIT 1
        `);
        const row = rows[0];
        if (!row) return null;

        await transaction.$executeRaw(Prisma.sql`
          UPDATE "DataPreparationRun"
          SET "reconcileAfter" = ${leaseUntil}
          WHERE "id" = ${row.id}
            AND "status" = ${row.status}
        `);

        return {
          id: row.id,
          userId: row.userId,
          status: row.status as PreparationRunStatus,
          dueAt: row.reconcileAfter,
        };
      });
    },

    async loadSnapshot(runId) {
      validateId(runId, 'runId');
      const runRows = await database.$queryRaw<RunRow[]>(Prisma.sql`
        SELECT
          run."id",
          run."userId",
          run."status",
          run."retryGeneration",
          run."attentionCode",
          run."attentionDetail",
          run."reconcileAfter",
          run."firstImportedAt",
          run."firstIndexedAt",
          run."firstAnalysedAt",
          run."coreReadyAt",
          run."analysisCompletedAt"
        FROM "DataPreparationRun" AS run
        WHERE run."id" = ${runId}
        LIMIT 1
      `);
      const run = runRows[0];
      if (!run) return null;

      const [targets, activeBatches, telemetryRows] = await Promise.all([
        database.$queryRaw<TargetRow[]>(Prisma.sql`
          SELECT
            target."id",
            target."accountId",
            target."ordinal",
            target."currentImportRunId",
            import_run."status" AS "importStatus",
            import_run."workKey" AS "importWorkKey",
            COALESCE(evidence."importedCount", 0)::int AS "importedCount",
            COALESCE(evidence."indexedCount", 0)::int AS "indexedCount",
            COALESCE(evidence."indexPendingCount", 0)::int AS "indexPendingCount",
            COALESCE(evidence."indexFailedCount", 0)::int AS "indexFailedCount",
            COALESCE(evidence."analysedCount", 0)::int AS "analysedCount",
            COALESCE(evidence."analysisPendingCount", 0)::int AS "analysisPendingCount",
            COALESCE(evidence."analysisRunningCount", 0)::int AS "analysisRunningCount",
            COALESCE(evidence."analysisFailedCount", 0)::int AS "analysisFailedCount",
            COALESCE(batch_counts."normalIndexBatches", 0)::int AS "normalIndexBatches",
            COALESCE(batch_counts."normalAnalysisBatches", 0)::int AS "normalAnalysisBatches"
          FROM "DataPreparationTarget" AS target
          JOIN "DataPreparationRun" AS run ON run."id" = target."preparationRunId"
          LEFT JOIN "ImportRun" AS import_run ON import_run."id" = target."currentImportRunId"
          LEFT JOIN LATERAL (
            SELECT
              COUNT(*) FILTER (WHERE game."pgn" IS NOT NULL)::int AS "importedCount",
              COUNT(*) FILTER (
                WHERE game."pgn" IS NOT NULL
                  AND game."plyIndexedAt" IS NOT NULL
              )::int AS "indexedCount",
              COUNT(*) FILTER (
                WHERE game."pgn" IS NOT NULL
                  AND game."plyIndexedAt" IS NULL
                  AND game."plyIndexError" IS NULL
              )::int AS "indexPendingCount",
              COUNT(*) FILTER (
                WHERE game."pgn" IS NOT NULL
                  AND game."plyIndexedAt" IS NULL
                  AND game."plyIndexError" IS NOT NULL
              )::int AS "indexFailedCount",
              COUNT(*) FILTER (
                WHERE game."pgn" IS NOT NULL
                  AND game."plyIndexedAt" IS NOT NULL
                  AND game."latestAnalysisStatus" = 'COMPLETED'
              )::int AS "analysedCount",
              COUNT(*) FILTER (
                WHERE game."pgn" IS NOT NULL
                  AND game."plyIndexedAt" IS NOT NULL
                  AND game."latestAnalysisStatus" IS NULL
              )::int AS "analysisPendingCount",
              COUNT(*) FILTER (
                WHERE game."pgn" IS NOT NULL
                  AND game."plyIndexedAt" IS NOT NULL
                  AND game."latestAnalysisStatus" = 'RUNNING'
              )::int AS "analysisRunningCount",
              COUNT(*) FILTER (
                WHERE game."pgn" IS NOT NULL
                  AND game."plyIndexedAt" IS NOT NULL
                  AND game."latestAnalysisStatus" = 'FAILED'
              )::int AS "analysisFailedCount"
            FROM "ImportedGame" AS game
            WHERE game."userId" = run."userId"
              AND game."accountId" = target."accountId"
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
                  SELECT 1
                  FROM jsonb_array_elements_text(target."scopeJson"->'speedCategories') AS speed(value)
                  WHERE LOWER(BTRIM(speed.value)) = LOWER(BTRIM(game."speedCategory"))
                )
              )
              AND (
                NOT (target."scopeJson" ? 'variants')
                OR jsonb_array_length(target."scopeJson"->'variants') = 0
                OR EXISTS (
                  SELECT 1
                  FROM jsonb_array_elements_text(target."scopeJson"->'variants') AS variant(value)
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
          ) AS evidence ON TRUE
          LEFT JOIN LATERAL (
            SELECT
              COUNT(*) FILTER (
                WHERE batch."stage" = 'INDEX' AND batch."lane" <> 'RETRY'
              )::int AS "normalIndexBatches",
              COUNT(*) FILTER (
                WHERE batch."stage" = 'ANALYSIS' AND batch."lane" <> 'RETRY'
              )::int AS "normalAnalysisBatches"
            FROM "DataPreparationBatch" AS batch
            WHERE batch."targetId" = target."id"
          ) AS batch_counts ON TRUE
          WHERE target."preparationRunId" = ${runId}
          ORDER BY target."ordinal" ASC, target."id" ASC
        `),
        database.$queryRaw<ActiveBatchRow[]>(Prisma.sql`
          SELECT
            batch."id",
            batch."targetId",
            batch."stage",
            batch."status",
            batch."jobRunId",
            job."priority",
            batch."createdAt",
            batch."startedAt",
            batch."firstSettledAt",
            batch."settledAt",
            COALESCE((
              SELECT COUNT(*)::int
              FROM "JobTask" AS task
              WHERE task."jobRunId" = batch."jobRunId"
                AND task."workKey" IS NOT NULL
            ), 0)::int AS "activeWorkKeys",
            CASE
              WHEN job."priority" IS NULL THEN FALSE
              ELSE EXISTS (
                SELECT 1
                FROM "JobTask" AS other_task
                JOIN "JobRun" AS other_job ON other_job."id" = other_task."jobRunId"
                WHERE other_task."status" = 'QUEUED'
                  AND other_job."status" IN ('QUEUED', 'RUNNING')
                  AND other_job."priority" > job."priority"
              )
            END AS "higherPriorityRunnable",
            NOT EXISTS (
              SELECT 1
              FROM "JobTask" AS running_task
              WHERE running_task."workKey" IS NOT NULL
            ) AS "workerCapacityAvailable"
          FROM "DataPreparationBatch" AS batch
          LEFT JOIN "JobRun" AS job ON job."id" = batch."jobRunId"
          WHERE batch."preparationRunId" = ${runId}
            AND (
              batch."status" IN ('QUEUED', 'RUNNING')
              OR EXISTS (
                SELECT 1
                FROM "JobTask" AS active_task
                WHERE active_task."jobRunId" = batch."jobRunId"
                  AND active_task."workKey" IS NOT NULL
              )
            )
          ORDER BY batch."ordinal" ASC, batch."id" ASC
        `),
        database.$queryRaw<TelemetryRow[]>(Prisma.sql`
          SELECT
            COUNT(*)::int AS "batchCount",
            MAX(
              EXTRACT(EPOCH FROM (batch."startedAt" - batch."createdAt")) * 1000
            )::double precision AS "maxQueueWaitMs",
            MAX(
              EXTRACT(EPOCH FROM (
                batch."firstSettledAt" - COALESCE(batch."startedAt", batch."createdAt")
              )) * 1000
            )::double precision AS "maxFirstSettlementMs",
            MAX(
              EXTRACT(EPOCH FROM (
                batch."settledAt" - COALESCE(batch."startedAt", batch."createdAt")
              )) * 1000
            )::double precision AS "maxTotalSettlementMs"
          FROM "DataPreparationBatch" AS batch
          WHERE batch."preparationRunId" = ${runId}
        `),
      ]);

      return {
        run: {
          id: run.id,
          userId: run.userId,
          status: run.status as PreparationRunStatus,
          retryGeneration: run.retryGeneration,
          attentionCode: run.attentionCode,
          attentionDetail: run.attentionDetail,
          firstImportedAt: run.firstImportedAt,
          firstIndexedAt: run.firstIndexedAt,
          firstAnalysedAt: run.firstAnalysedAt,
          coreReadyAt: run.coreReadyAt,
          analysisCompletedAt: run.analysisCompletedAt,
        },
        targets,
        activeBatches: activeBatches.map((batch) => ({
          ...batch,
          stage: batch.stage as PreparationStage,
        })),
        telemetry: telemetryRows[0] ?? {
          batchCount: 0,
          maxQueueWaitMs: null,
          maxFirstSettlementMs: null,
          maxTotalSettlementMs: null,
        },
      };
    },

    async applyState(input) {
      validateDateOrNull(input.reconcileAfter, 'reconcileAfter');
      return database.$transaction(async (transaction) => {
        const statusRows = await transaction.$queryRaw<StatusRow[]>(Prisma.sql`
          SELECT "status"
          FROM "DataPreparationRun"
          WHERE "id" = ${input.runId}
          FOR UPDATE
        `);
        if (statusRows[0]?.status !== input.expectedStatus) return false;

        for (const target of input.targetMilestones) {
          await transaction.$executeRaw(Prisma.sql`
            UPDATE "DataPreparationTarget"
            SET "firstImportedAt" = CASE
                  WHEN ${target.firstImported} THEN COALESCE("firstImportedAt", NOW())
                  ELSE "firstImportedAt"
                END,
                "firstIndexedAt" = CASE
                  WHEN ${target.firstIndexed} THEN COALESCE("firstIndexedAt", NOW())
                  ELSE "firstIndexedAt"
                END,
                "firstAnalysedAt" = CASE
                  WHEN ${target.firstAnalysed} THEN COALESCE("firstAnalysedAt", NOW())
                  ELSE "firstAnalysedAt"
                END,
                "coreReadyAt" = CASE
                  WHEN ${target.coreReady} THEN COALESCE("coreReadyAt", NOW())
                  ELSE "coreReadyAt"
                END,
                "updatedAt" = NOW()
            WHERE "id" = ${target.targetId}
              AND "preparationRunId" = ${input.runId}
          `);
        }

        const terminal = input.status === 'COMPLETED'
          || input.status === 'CANCELLED'
          || input.status === 'FAILED';
        const updated = await transaction.$executeRaw(Prisma.sql`
          UPDATE "DataPreparationRun"
          SET "status" = ${input.status},
              "attentionCode" = ${input.attentionCode},
              "attentionDetail" = ${input.attentionDetail},
              "reconcileAfter" = CASE
                WHEN ${input.reconcileAfter}::timestamp IS NULL THEN NULL
                ELSE LEAST(COALESCE("reconcileAfter", ${input.reconcileAfter}), ${input.reconcileAfter})
              END,
              "firstImportedAt" = CASE
                WHEN ${input.markFirstImported} THEN COALESCE("firstImportedAt", NOW())
                ELSE "firstImportedAt"
              END,
              "firstIndexedAt" = CASE
                WHEN ${input.markFirstIndexed} THEN COALESCE("firstIndexedAt", NOW())
                ELSE "firstIndexedAt"
              END,
              "firstAnalysedAt" = CASE
                WHEN ${input.markFirstAnalysed} THEN COALESCE("firstAnalysedAt", NOW())
                ELSE "firstAnalysedAt"
              END,
              "coreReadyAt" = CASE
                WHEN ${input.markCoreReady} THEN COALESCE("coreReadyAt", NOW())
                ELSE "coreReadyAt"
              END,
              "analysisCompletedAt" = CASE
                WHEN ${input.markAnalysisCompleted} THEN COALESCE("analysisCompletedAt", NOW())
                ELSE "analysisCompletedAt"
              END,
              "completedAt" = CASE
                WHEN ${terminal} THEN COALESCE("completedAt", NOW())
                ELSE "completedAt"
              END,
              "updatedAt" = NOW()
          WHERE "id" = ${input.runId}
            AND "status" = ${input.expectedStatus}
        `);
        return updated === 1;
      });
    },

    async requestPause(userId, runId) {
      return updateOwnedControlState(database, userId, runId, 'PAUSE');
    },

    async resume(userId, runId) {
      return database.$transaction(async (transaction) => {
        const rows = await lockOwnedRun(transaction, userId, runId);
        const status = rows[0]?.status;
        if (status === undefined) return false;
        if (status === 'RUNNING' || status === 'QUEUED') return true;
        if (status !== 'PAUSED') return false;
        const updated = await transaction.$executeRaw(Prisma.sql`
          UPDATE "DataPreparationRun"
          SET "status" = 'RUNNING',
              "attentionCode" = NULL,
              "attentionDetail" = NULL,
              "reconcileAfter" = NOW(),
              "completedAt" = NULL,
              "updatedAt" = NOW()
          WHERE "id" = ${runId}
            AND "userId" = ${userId}
            AND "status" = 'PAUSED'
        `);
        return updated === 1;
      });
    },

    async requestCancel(userId, runId) {
      return updateOwnedControlState(database, userId, runId, 'CANCEL');
    },
  };
}

async function updateOwnedControlState(
  database: PrismaClient,
  userId: number,
  runId: number,
  control: 'PAUSE' | 'CANCEL',
): Promise<boolean> {
  validateId(userId, 'userId');
  validateId(runId, 'runId');
  return database.$transaction(async (transaction) => {
    const rows = await lockOwnedRun(transaction, userId, runId);
    const status = rows[0]?.status;
    if (status === undefined) return false;

    if (control === 'PAUSE') {
      if (status === 'PAUSED' || status === 'PAUSE_REQUESTED') return true;
      if (!['QUEUED', 'RUNNING', 'NEEDS_ATTENTION'].includes(status)) return false;
      const updated = await transaction.$executeRaw(Prisma.sql`
        UPDATE "DataPreparationRun"
        SET "status" = 'PAUSE_REQUESTED',
            "reconcileAfter" = NOW(),
            "updatedAt" = NOW()
        WHERE "id" = ${runId}
          AND "userId" = ${userId}
          AND "status" = ${status}
      `);
      return updated === 1;
    }

    if (status === 'CANCELLED' || status === 'CANCEL_REQUESTED') return true;
    if (!['QUEUED', 'RUNNING', 'PAUSE_REQUESTED', 'PAUSED', 'NEEDS_ATTENTION'].includes(status)) {
      return false;
    }
    const updated = await transaction.$executeRaw(Prisma.sql`
      UPDATE "DataPreparationRun"
      SET "status" = 'CANCEL_REQUESTED',
          "reconcileAfter" = NOW(),
          "updatedAt" = NOW()
      WHERE "id" = ${runId}
        AND "userId" = ${userId}
        AND "status" = ${status}
    `);
    return updated === 1;
  });
}

function lockOwnedRun(
  transaction: Prisma.TransactionClient,
  userId: number,
  runId: number,
): Promise<StatusRow[]> {
  return transaction.$queryRaw<StatusRow[]>(Prisma.sql`
    SELECT "status"
    FROM "DataPreparationRun"
    WHERE "id" = ${runId}
      AND "userId" = ${userId}
    FOR UPDATE
  `);
}

function validateId(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`Preparation ${name} must be a positive integer.`);
  }
}

function validateDate(value: Date, name: string): void {
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) {
    throw new Error(`Preparation ${name} must be a valid Date.`);
  }
}

function validateDateOrNull(value: Date | null, name: string): void {
  if (value !== null) validateDate(value, name);
}

export const PreparationReconcilerRepository = createPreparationReconcilerRepository();
