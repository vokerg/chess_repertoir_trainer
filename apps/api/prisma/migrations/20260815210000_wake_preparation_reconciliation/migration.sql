-- ONB-018: durable preparation wake hints.
-- Polling remains authoritative; these triggers only move active parents, or
-- recoverable import-attention parents, due sooner.

CREATE OR REPLACE FUNCTION "snapshot_data_preparation_batch_for_job"()
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

    UPDATE "DataPreparationRun" AS run
    SET "reconcileAfter" = CURRENT_TIMESTAMP,
        "updatedAt" = CURRENT_TIMESTAMP
    FROM "DataPreparationBatch" AS batch
    WHERE batch."jobRunId" = child_job."id"
      AND run."id" = batch."preparationRunId"
      AND run."status" IN ('QUEUED', 'RUNNING', 'PAUSE_REQUESTED', 'CANCEL_REQUESTED');

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;

CREATE FUNCTION "wake_data_preparation_for_import"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE "DataPreparationRun" AS run
    SET "reconcileAfter" = CURRENT_TIMESTAMP,
        "updatedAt" = CURRENT_TIMESTAMP
    FROM "DataPreparationTarget" AS target
    WHERE target."currentImportRunId" = NEW."id"
      AND run."id" = target."preparationRunId"
      AND run."status" IN ('QUEUED', 'RUNNING', 'PAUSE_REQUESTED', 'CANCEL_REQUESTED', 'NEEDS_ATTENTION');
    RETURN NEW;
END;
$$;

CREATE TRIGGER "DataPreparationRun_wake_import_progress"
AFTER UPDATE OF
    "status",
    "windowsCompleted",
    "gamesImported",
    "gamesUpdated",
    "gamesDuplicate",
    "lastProgressAt"
ON "ImportRun"
FOR EACH ROW
WHEN (
    OLD."status" IS DISTINCT FROM NEW."status"
    OR OLD."windowsCompleted" IS DISTINCT FROM NEW."windowsCompleted"
    OR OLD."gamesImported" IS DISTINCT FROM NEW."gamesImported"
    OR OLD."gamesUpdated" IS DISTINCT FROM NEW."gamesUpdated"
    OR OLD."gamesDuplicate" IS DISTINCT FROM NEW."gamesDuplicate"
    OR OLD."lastProgressAt" IS DISTINCT FROM NEW."lastProgressAt"
)
EXECUTE FUNCTION "wake_data_preparation_for_import"();

CREATE FUNCTION "wake_data_preparation_for_job_task"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE "DataPreparationRun" AS run
    SET "reconcileAfter" = CURRENT_TIMESTAMP,
        "updatedAt" = CURRENT_TIMESTAMP
    FROM "DataPreparationBatch" AS batch
    WHERE batch."jobRunId" = NEW."jobRunId"
      AND run."id" = batch."preparationRunId"
      AND run."status" IN ('QUEUED', 'RUNNING', 'PAUSE_REQUESTED', 'CANCEL_REQUESTED');
    RETURN NEW;
END;
$$;

CREATE TRIGGER "DataPreparationRun_wake_job_task_settlement"
AFTER UPDATE OF "status", "workKey" ON "JobTask"
FOR EACH ROW
WHEN (
    OLD."status" IS DISTINCT FROM NEW."status"
    OR OLD."workKey" IS DISTINCT FROM NEW."workKey"
)
EXECUTE FUNCTION "wake_data_preparation_for_job_task"();

CREATE FUNCTION "wake_data_preparation_for_target_import"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE "DataPreparationRun"
    SET "reconcileAfter" = CURRENT_TIMESTAMP,
        "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = NEW."preparationRunId"
      AND "status" IN ('QUEUED', 'RUNNING', 'PAUSE_REQUESTED', 'CANCEL_REQUESTED', 'NEEDS_ATTENTION');
    RETURN NEW;
END;
$$;

CREATE TRIGGER "DataPreparationRun_wake_target_import_link"
AFTER UPDATE OF "currentImportRunId" ON "DataPreparationTarget"
FOR EACH ROW
WHEN (OLD."currentImportRunId" IS DISTINCT FROM NEW."currentImportRunId")
EXECUTE FUNCTION "wake_data_preparation_for_target_import"();
