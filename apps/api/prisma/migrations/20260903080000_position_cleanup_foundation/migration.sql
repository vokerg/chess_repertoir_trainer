-- ONB-026: bounded orphan shared-position cleanup foundation.
--
-- Correctness is database-owned: candidates are reset by statement-level
-- ImportedGamePly transition-table triggers, and the existing ply -> position
-- foreign key remains the final deletion backstop.

DO $$
BEGIN
    IF current_setting('server_version_num')::INTEGER < 100000 THEN
        RAISE EXCEPTION USING
            ERRCODE = '0A000',
            MESSAGE = 'POSITION_CLEANUP_POSTGRES_VERSION_UNSUPPORTED',
            DETAIL = format(
                'server_version_num=%s; PostgreSQL 10+ is required for transition relations',
                current_setting('server_version_num')
            );
    END IF;
END;
$$;

CREATE TABLE "PositionCleanupCandidate" (
    "positionId" INTEGER NOT NULL,
    "firstObservedOrphanAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastObservedOrphanAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PositionCleanupCandidate_pkey" PRIMARY KEY ("positionId"),
    CONSTRAINT "PositionCleanupCandidate_observation_order_check"
        CHECK ("lastObservedOrphanAt" >= "firstObservedOrphanAt")
);

ALTER TABLE "PositionCleanupCandidate"
ADD CONSTRAINT "PositionCleanupCandidate_positionId_fkey"
FOREIGN KEY ("positionId") REFERENCES "ImportedGamePosition"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "PositionCleanupCandidate_firstObservedOrphanAt_positionId_idx"
ON "PositionCleanupCandidate"("firstObservedOrphanAt", "positionId");

CREATE TABLE "PositionCleanupRun" (
    "id" SERIAL NOT NULL,
    "mode" VARCHAR(16) NOT NULL,
    "status" VARCHAR(24) NOT NULL DEFAULT 'QUEUED',
    "phase" VARCHAR(24) NOT NULL DEFAULT 'RECONCILE',
    "policyVersion" VARCHAR(24) NOT NULL,
    "graceDays" INTEGER NOT NULL,
    "graceCutoff" TIMESTAMP(3) NOT NULL,
    "inputPageSize" INTEGER NOT NULL,
    "initialDeleteBatchSize" INTEGER NOT NULL,
    "deleteBatchSize" INTEGER NOT NULL,
    "lockTimeoutMs" INTEGER NOT NULL,
    "requestedBy" VARCHAR(80) NOT NULL,
    "reconcileUpperBound" INTEGER NOT NULL DEFAULT 0,
    "positionUpperBound" INTEGER NOT NULL DEFAULT 0,
    "evaluationUpperBound" INTEGER,
    "reconcileAfterPositionId" INTEGER NOT NULL DEFAULT 0,
    "observeAfterPositionId" INTEGER NOT NULL DEFAULT 0,
    "evaluateAfterPositionId" INTEGER NOT NULL DEFAULT 0,
    "candidatesInspected" INTEGER NOT NULL DEFAULT 0,
    "candidatesReconciled" INTEGER NOT NULL DEFAULT 0,
    "positionsInspected" INTEGER NOT NULL DEFAULT 0,
    "orphansObserved" INTEGER NOT NULL DEFAULT 0,
    "eligibleObserved" INTEGER NOT NULL DEFAULT 0,
    "positionsDeleted" INTEGER NOT NULL DEFAULT 0,
    "analysisRowsDeleted" INTEGER NOT NULL DEFAULT 0,
    "cacheRowsDeleted" INTEGER NOT NULL DEFAULT 0,
    "skippedReferenced" INTEGER NOT NULL DEFAULT 0,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "lockTimeoutStreak" INTEGER NOT NULL DEFAULT 0,
    "staleRecoveryCount" INTEGER NOT NULL DEFAULT 0,
    "workKey" VARCHAR(80),
    "claimedAt" TIMESTAMP(3),
    "heartbeatAt" TIMESTAMP(3),
    "cancelRequestedAt" TIMESTAMP(3),
    "observationStartedAt" TIMESTAMP(3),
    "observationCompletedAt" TIMESTAMP(3),
    "lastBatchAt" TIMESTAMP(3),
    "terminalResult" VARCHAR(40),
    "errorCode" VARCHAR(120),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PositionCleanupRun_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PositionCleanupRun_mode_check"
        CHECK ("mode" IN ('DRY_RUN', 'EXECUTE')),
    CONSTRAINT "PositionCleanupRun_status_check"
        CHECK ("status" IN ('QUEUED', 'RUNNING', 'COMPLETED', 'CANCELLED', 'NEEDS_ATTENTION', 'FAILED')),
    CONSTRAINT "PositionCleanupRun_phase_check"
        CHECK ("phase" IN ('RECONCILE', 'OBSERVE', 'EVALUATE', 'DONE')),
    CONSTRAINT "PositionCleanupRun_graceDays_check"
        CHECK ("graceDays" >= 30),
    CONSTRAINT "PositionCleanupRun_inputPageSize_check"
        CHECK ("inputPageSize" BETWEEN 1 AND 500),
    CONSTRAINT "PositionCleanupRun_deleteBatchSize_check"
        CHECK (
            "initialDeleteBatchSize" BETWEEN 1 AND 500
            AND "initialDeleteBatchSize" <= "inputPageSize"
            AND "deleteBatchSize" BETWEEN 1 AND "initialDeleteBatchSize"
        ),
    CONSTRAINT "PositionCleanupRun_lockTimeoutMs_check"
        CHECK ("lockTimeoutMs" BETWEEN 1 AND 5000),
    CONSTRAINT "PositionCleanupRun_bounds_check"
        CHECK (
            "reconcileUpperBound" >= 0
            AND "positionUpperBound" >= 0
            AND ("evaluationUpperBound" IS NULL OR "evaluationUpperBound" >= 0)
        ),
    CONSTRAINT "PositionCleanupRun_checkpoints_check"
        CHECK (
            "reconcileAfterPositionId" >= 0
            AND "observeAfterPositionId" >= 0
            AND "evaluateAfterPositionId" >= 0
        ),
    CONSTRAINT "PositionCleanupRun_counters_check"
        CHECK (
            "candidatesInspected" >= 0
            AND "candidatesReconciled" >= 0
            AND "positionsInspected" >= 0
            AND "orphansObserved" >= 0
            AND "eligibleObserved" >= 0
            AND "positionsDeleted" >= 0
            AND "analysisRowsDeleted" >= 0
            AND "cacheRowsDeleted" >= 0
            AND "skippedReferenced" >= 0
            AND "retryCount" >= 0
            AND "lockTimeoutStreak" >= 0
            AND "staleRecoveryCount" >= 0
        ),
    CONSTRAINT "PositionCleanupRun_terminal_shape_check" CHECK (
        ("status" IN ('COMPLETED', 'CANCELLED', 'NEEDS_ATTENTION', 'FAILED') AND "completedAt" IS NOT NULL)
        OR ("status" IN ('QUEUED', 'RUNNING') AND "completedAt" IS NULL)
    ),
    CONSTRAINT "PositionCleanupRun_terminal_result_check" CHECK (
        "terminalResult" IS NULL OR "terminalResult" IN (
            'OBSERVATIONAL', 'EXECUTED', 'CANCELLED', 'NEEDS_ATTENTION', 'FAILED'
        )
    )
);

CREATE UNIQUE INDEX "PositionCleanupRun_workKey_key"
ON "PositionCleanupRun"("workKey")
WHERE "workKey" IS NOT NULL;

CREATE UNIQUE INDEX "PositionCleanupRun_one_nonterminal_key"
ON "PositionCleanupRun"((1))
WHERE "status" IN ('QUEUED', 'RUNNING');

CREATE INDEX "PositionCleanupRun_status_updatedAt_idx"
ON "PositionCleanupRun"("status", "updatedAt", "id");

CREATE INDEX "PositionCleanupRun_completedAt_idx"
ON "PositionCleanupRun"("completedAt");

CREATE FUNCTION "position_cleanup_reset_candidates_from_new_plies"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM "PositionCleanupCandidate" AS candidate
    USING (
        SELECT DISTINCT "positionId"
        FROM position_cleanup_new_plies
        WHERE "positionId" IS NOT NULL
    ) AS referenced
    WHERE candidate."positionId" = referenced."positionId";

    RETURN NULL;
END;
$$;

CREATE TRIGGER "ImportedGamePly_position_cleanup_reset_insert"
AFTER INSERT ON "ImportedGamePly"
REFERENCING NEW TABLE AS position_cleanup_new_plies
FOR EACH STATEMENT
EXECUTE FUNCTION "position_cleanup_reset_candidates_from_new_plies"();

-- PostgreSQL transition relations require an unqualified UPDATE event: an
-- UPDATE OF column list cannot be combined with REFERENCING NEW TABLE.
CREATE TRIGGER "ImportedGamePly_position_cleanup_reset_update"
AFTER UPDATE ON "ImportedGamePly"
REFERENCING NEW TABLE AS position_cleanup_new_plies
FOR EACH STATEMENT
EXECUTE FUNCTION "position_cleanup_reset_candidates_from_new_plies"();
