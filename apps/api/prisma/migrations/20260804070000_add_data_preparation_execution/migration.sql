-- ONB-017: durable preparation parent, ordered targets, retained child-batch evidence,
-- and database-enforced active-run/active-stage invariants.

-- CreateTable
CREATE TABLE "DataPreparationRun" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "purpose" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "recipeVersion" INTEGER NOT NULL,
    "recipeJson" JSONB NOT NULL,
    "retryOfRunId" INTEGER,
    "retryGeneration" INTEGER NOT NULL DEFAULT 0,
    "attentionCode" TEXT,
    "attentionDetail" TEXT,
    "reconcileAfter" TIMESTAMP(3),
    "firstImportedAt" TIMESTAMP(3),
    "firstIndexedAt" TIMESTAMP(3),
    "firstAnalysedAt" TIMESTAMP(3),
    "coreReadyAt" TIMESTAMP(3),
    "analysisCompletedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataPreparationRun_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "DataPreparationRun_purpose_check" CHECK ("purpose" IN ('ONBOARDING', 'EXPANSION', 'RECOVERY')),
    CONSTRAINT "DataPreparationRun_status_check" CHECK ("status" IN (
        'QUEUED',
        'RUNNING',
        'PAUSE_REQUESTED',
        'PAUSED',
        'CANCEL_REQUESTED',
        'NEEDS_ATTENTION',
        'COMPLETED',
        'CANCELLED',
        'FAILED'
    )),
    CONSTRAINT "DataPreparationRun_recipeVersion_check" CHECK ("recipeVersion" > 0),
    CONSTRAINT "DataPreparationRun_retryGeneration_check" CHECK ("retryGeneration" >= 0)
);

-- CreateTable
CREATE TABLE "DataPreparationTarget" (
    "id" SERIAL NOT NULL,
    "preparationRunId" INTEGER NOT NULL,
    "accountId" INTEGER,
    "accountProvider" TEXT NOT NULL,
    "accountUsername" TEXT NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "scopeVersion" INTEGER NOT NULL,
    "scopeHash" VARCHAR(64) NOT NULL,
    "scopeJson" JSONB NOT NULL,
    "requestedFrom" TIMESTAMP(3) NOT NULL,
    "requestedTo" TIMESTAMP(3) NOT NULL,
    "currentImportRunId" INTEGER,
    "firstImportedAt" TIMESTAMP(3),
    "firstIndexedAt" TIMESTAMP(3),
    "firstAnalysedAt" TIMESTAMP(3),
    "coreReadyAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataPreparationTarget_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "DataPreparationTarget_ordinal_check" CHECK ("ordinal" >= 0),
    CONSTRAINT "DataPreparationTarget_scopeVersion_check" CHECK ("scopeVersion" > 0),
    CONSTRAINT "DataPreparationTarget_range_check" CHECK ("requestedFrom" < "requestedTo")
);

-- CreateTable
CREATE TABLE "DataPreparationBatch" (
    "id" SERIAL NOT NULL,
    "preparationRunId" INTEGER NOT NULL,
    "targetId" INTEGER NOT NULL,
    "stage" TEXT NOT NULL,
    "lane" TEXT NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "plannedLimit" INTEGER NOT NULL,
    "jobRunId" INTEGER,
    "totalTasks" INTEGER NOT NULL,
    "completedTasks" INTEGER NOT NULL DEFAULT 0,
    "skippedTasks" INTEGER NOT NULL DEFAULT 0,
    "failedTasks" INTEGER NOT NULL DEFAULT 0,
    "cancelledTasks" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "firstSettledAt" TIMESTAMP(3),
    "settledAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataPreparationBatch_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "DataPreparationBatch_stage_check" CHECK ("stage" IN ('INDEX', 'ANALYSIS')),
    CONSTRAINT "DataPreparationBatch_lane_check" CHECK ("lane" IN (
        'FIRST_INDEX',
        'FIRST_ANALYSIS',
        'INDEX_CONTINUATION',
        'ANALYSIS_TAIL',
        'RETRY'
    )),
    CONSTRAINT "DataPreparationBatch_status_check" CHECK ("status" IN (
        'QUEUED',
        'RUNNING',
        'COMPLETED',
        'PARTIALLY_FAILED',
        'FAILED',
        'CANCELLED'
    )),
    CONSTRAINT "DataPreparationBatch_ordinal_check" CHECK ("ordinal" >= 0),
    CONSTRAINT "DataPreparationBatch_plannedLimit_check" CHECK ("plannedLimit" > 0),
    CONSTRAINT "DataPreparationBatch_taskCounts_check" CHECK (
        "totalTasks" >= 0
        AND "completedTasks" >= 0
        AND "skippedTasks" >= 0
        AND "failedTasks" >= 0
        AND "cancelledTasks" >= 0
        AND "completedTasks" + "skippedTasks" + "failedTasks" + "cancelledTasks" <= "totalTasks"
    )
);

-- CreateIndex
CREATE INDEX "DataPreparationRun_userId_status_updatedAt_idx"
ON "DataPreparationRun"("userId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "DataPreparationRun_status_reconcileAfter_idx"
ON "DataPreparationRun"("status", "reconcileAfter");

-- CreateIndex: one non-terminal preparation run per user.
CREATE UNIQUE INDEX "DataPreparationRun_one_active_per_user_key"
ON "DataPreparationRun"("userId")
WHERE "status" IN (
    'QUEUED',
    'RUNNING',
    'PAUSE_REQUESTED',
    'PAUSED',
    'CANCEL_REQUESTED',
    'NEEDS_ATTENTION'
);

-- CreateIndex
CREATE UNIQUE INDEX "DataPreparationTarget_preparationRunId_accountId_key"
ON "DataPreparationTarget"("preparationRunId", "accountId");

-- CreateIndex
CREATE UNIQUE INDEX "DataPreparationTarget_preparationRunId_ordinal_key"
ON "DataPreparationTarget"("preparationRunId", "ordinal");

-- CreateIndex
CREATE INDEX "DataPreparationTarget_accountId_idx"
ON "DataPreparationTarget"("accountId");

-- CreateIndex
CREATE INDEX "DataPreparationTarget_currentImportRunId_idx"
ON "DataPreparationTarget"("currentImportRunId");

-- CreateIndex
CREATE UNIQUE INDEX "DataPreparationBatch_jobRunId_key"
ON "DataPreparationBatch"("jobRunId");

-- CreateIndex
CREATE UNIQUE INDEX "DataPreparationBatch_preparationRunId_ordinal_key"
ON "DataPreparationBatch"("preparationRunId", "ordinal");

-- CreateIndex
CREATE INDEX "DataPreparationBatch_preparationRunId_stage_status_idx"
ON "DataPreparationBatch"("preparationRunId", "stage", "status");

-- CreateIndex
CREATE INDEX "DataPreparationBatch_targetId_stage_createdAt_idx"
ON "DataPreparationBatch"("targetId", "stage", "createdAt");

-- CreateIndex: one non-terminal batch per run and stage.
CREATE UNIQUE INDEX "DataPreparationBatch_one_active_stage_per_run_key"
ON "DataPreparationBatch"("preparationRunId", "stage")
WHERE "status" IN ('QUEUED', 'RUNNING');

-- Supporting bounded newest-first target selection.
CREATE INDEX "ImportedGame_accountId_endedAt_id_idx"
ON "ImportedGame"("accountId", "endedAt" DESC, "id" DESC);

-- AddForeignKey
ALTER TABLE "DataPreparationRun"
ADD CONSTRAINT "DataPreparationRun_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataPreparationRun"
ADD CONSTRAINT "DataPreparationRun_retryOfRunId_fkey"
FOREIGN KEY ("retryOfRunId") REFERENCES "DataPreparationRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataPreparationTarget"
ADD CONSTRAINT "DataPreparationTarget_preparationRunId_fkey"
FOREIGN KEY ("preparationRunId") REFERENCES "DataPreparationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Account deletion invalidates current evidence while preserving immutable account identity snapshots.
ALTER TABLE "DataPreparationTarget"
ADD CONSTRAINT "DataPreparationTarget_accountId_fkey"
FOREIGN KEY ("accountId") REFERENCES "ExternalAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ONB-011 may expand ImportRun; this nullable historical pointer remains additive.
ALTER TABLE "DataPreparationTarget"
ADD CONSTRAINT "DataPreparationTarget_currentImportRunId_fkey"
FOREIGN KEY ("currentImportRunId") REFERENCES "ImportRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataPreparationBatch"
ADD CONSTRAINT "DataPreparationBatch_preparationRunId_fkey"
FOREIGN KEY ("preparationRunId") REFERENCES "DataPreparationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataPreparationBatch"
ADD CONSTRAINT "DataPreparationBatch_targetId_fkey"
FOREIGN KEY ("targetId") REFERENCES "DataPreparationTarget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Child dismissal is only a visibility change. Retention deletion clears this pointer after the trigger below snapshots counts.
ALTER TABLE "DataPreparationBatch"
ADD CONSTRAINT "DataPreparationBatch_jobRunId_fkey"
FOREIGN KEY ("jobRunId") REFERENCES "JobRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Persist aggregate child evidence when a child changes state or is removed by retention.
CREATE FUNCTION "snapshot_data_preparation_batch_for_job"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    child_job "JobRun"%ROWTYPE;
BEGIN
    IF TG_OP = 'DELETE' THEN
        child_job := OLD;
    ELSE
        child_job := NEW;
    END IF;

    UPDATE "DataPreparationBatch" AS batch
    SET "status" = child_job."status",
        "totalTasks" = child_job."totalTasks",
        "completedTasks" = counts."completedTasks",
        "skippedTasks" = counts."skippedTasks",
        "failedTasks" = counts."failedTasks",
        "cancelledTasks" = counts."cancelledTasks",
        "startedAt" = COALESCE(batch."startedAt", child_job."startedAt"),
        "firstSettledAt" = COALESCE(batch."firstSettledAt", counts."firstSettledAt"),
        "settledAt" = CASE
            WHEN child_job."status" IN ('COMPLETED', 'PARTIALLY_FAILED', 'FAILED', 'CANCELLED')
                THEN COALESCE(child_job."completedAt", counts."lastSettledAt", CURRENT_TIMESTAMP)
            ELSE batch."settledAt"
        END,
        "updatedAt" = CURRENT_TIMESTAMP
    FROM (
        SELECT
            COUNT(*) FILTER (WHERE task."status" = 'COMPLETED')::int AS "completedTasks",
            COUNT(*) FILTER (WHERE task."status" = 'SKIPPED')::int AS "skippedTasks",
            COUNT(*) FILTER (WHERE task."status" = 'FAILED')::int AS "failedTasks",
            COUNT(*) FILTER (WHERE task."status" = 'CANCELLED')::int AS "cancelledTasks",
            MIN(task."settledAt") AS "firstSettledAt",
            MAX(task."settledAt") AS "lastSettledAt"
        FROM "JobTask" AS task
        WHERE task."jobRunId" = child_job."id"
    ) AS counts
    WHERE batch."jobRunId" = child_job."id";

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER "DataPreparationBatch_snapshot_job_update"
AFTER UPDATE OF "status", "startedAt", "completedAt" ON "JobRun"
FOR EACH ROW
WHEN (NEW."source" = 'ONBOARDING')
EXECUTE FUNCTION "snapshot_data_preparation_batch_for_job"();

CREATE TRIGGER "DataPreparationBatch_snapshot_job_delete"
BEFORE DELETE ON "JobRun"
FOR EACH ROW
WHEN (OLD."source" = 'ONBOARDING')
EXECUTE FUNCTION "snapshot_data_preparation_batch_for_job"();
