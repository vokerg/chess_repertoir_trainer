-- ONB-026 review corrections.
--
-- Keep the already-applied foundation migration immutable. This forward migration
-- narrows UPDATE-trigger work to newly introduced position references and adds
-- phase-exact inspected/matched counters to durable cleanup runs.

BEGIN;

ALTER TABLE "PositionCleanupRun"
ADD COLUMN "reconcileCandidatesInspected" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "orphansMatched" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "candidatesMatched" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "PositionCleanupRun"
DROP CONSTRAINT "PositionCleanupRun_counters_check";

ALTER TABLE "PositionCleanupRun"
ADD CONSTRAINT "PositionCleanupRun_counters_check"
CHECK (
    "reconcileCandidatesInspected" >= 0
    AND "candidatesReconciled" >= 0
    AND "positionsInspected" >= 0
    AND "orphansMatched" >= 0
    AND "orphansFirstObserved" >= 0
    AND "orphansRefreshed" >= 0
    AND "candidatesInspected" >= 0
    AND "candidatesMatched" >= 0
    AND "eligibleObserved" >= 0
    AND "positionsDeleted" >= 0
    AND "analysisRowsDeleted" >= 0
    AND "cacheRowsDeleted" >= 0
    AND "skippedReferenced" >= 0
    AND "retryCount" >= 0
    AND "lockTimeoutStreak" >= 0
    AND "staleRecoveryCount" >= 0
);

CREATE FUNCTION "position_cleanup_reset_candidates_from_updated_plies"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    reset_position_ids INTEGER[];
BEGIN
    -- A changed/new reference must always take the observer fence. A retained
    -- reference only needs cleanup work when a stale candidate actually exists.
    -- This keeps analysis/classification/move-only UPDATE statements off the
    -- advisory-lock path during normal operation while preserving idempotent reset.
    SELECT ARRAY(
        SELECT DISTINCT new_ply."positionId"
        FROM position_cleanup_new_plies AS new_ply
        WHERE new_ply."positionId" IS NOT NULL
          AND (
              NOT EXISTS (
                  SELECT 1
                  FROM position_cleanup_old_plies AS old_ply
                  WHERE old_ply."importedGameId" = new_ply."importedGameId"
                    AND old_ply."plyNumber" = new_ply."plyNumber"
                    AND old_ply."positionId" = new_ply."positionId"
              )
              OR EXISTS (
                  SELECT 1
                  FROM "PositionCleanupCandidate" AS candidate
                  WHERE candidate."positionId" = new_ply."positionId"
              )
          )
        ORDER BY new_ply."positionId" ASC
    )
    INTO reset_position_ids;

    PERFORM "position_cleanup_lock_reference_ids"(reset_position_ids);

    DELETE FROM "PositionCleanupCandidate" AS candidate
    WHERE candidate."positionId" = ANY(reset_position_ids);

    RETURN NULL;
END;
$$;

DROP TRIGGER "ImportedGamePly_position_cleanup_reset_update"
ON "ImportedGamePly";

-- PostgreSQL transition relations require an unqualified UPDATE event: an
-- UPDATE OF column list cannot be combined with transition relations.
CREATE TRIGGER "ImportedGamePly_position_cleanup_reset_update"
AFTER UPDATE ON "ImportedGamePly"
REFERENCING OLD TABLE AS position_cleanup_old_plies NEW TABLE AS position_cleanup_new_plies
FOR EACH STATEMENT
EXECUTE FUNCTION "position_cleanup_reset_candidates_from_updated_plies"();

COMMIT;
