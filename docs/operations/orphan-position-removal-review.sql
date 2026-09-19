-- REVIEW ARTIFACT ONLY: orphan shared-position removal, 2026-09-19.
-- Human review is required before any destructive execution.
-- Tracking issue: https://github.com/vokerg/chess_repertoir_trainer/issues/431
-- The canonical position-cleanup service/worker is the production path:
-- apps/api/src/scripts/cleanup-orphan-positions.ts
-- This SQL illustrates the exact selection and a single bounded delete batch.
-- It is not a migration, is not scheduled, and ends in ROLLBACK.
-- Direct COMMIT would bypass the canonical run claim, checkpoint, audit, retry,
-- and cancellation protocol. Do not change ROLLBACK to COMMIT without reviewing
-- that difference and the effect on analysis-only positions and caches.

-- Inventory: these counts can change while indexing or deletion runs.
SELECT
  (SELECT count(*) FROM "ImportedGamePosition") AS positions,
  (SELECT count(*) FROM "PositionCleanupCandidate") AS observed_candidates,
  (SELECT count(*) FROM "PositionCleanupCandidate" AS candidate
   WHERE candidate."firstObservedOrphanAt" <= now() - interval '30 days'
     AND NOT EXISTS (
       SELECT 1 FROM "ImportedGamePly" AS ply
       WHERE ply."positionId" = candidate."positionId"
     )) AS currently_graced_candidates;

-- Current orphans include rows with PositionAnalysis or MastersExplorerCache.
-- They are not automatically deletion-eligible: persisted observation and
-- the full grace period are required first.
SELECT
  count(*) AS currently_unreferenced_positions,
  count(*) FILTER (WHERE EXISTS (
    SELECT 1 FROM "PositionAnalysis" AS analysis
    WHERE analysis."positionId" = position."id"
  )) AS unreferenced_with_analysis,
  count(*) FILTER (WHERE EXISTS (
    SELECT 1 FROM "MastersExplorerCache" AS cache
    WHERE cache."positionId" = position."id"
  )) AS unreferenced_with_cache
FROM "ImportedGamePosition" AS position
WHERE NOT EXISTS (
  SELECT 1 FROM "ImportedGamePly" AS ply
  WHERE ply."positionId" = position."id"
);

-- Illustrative bounded deletion transaction. Its result is rolled back.
-- A production run must use the canonical service so that its persisted
-- upper bound, claim/work key, checkpoint, and audit are also enforced.
BEGIN;
SET LOCAL lock_timeout = '250ms';
LOCK TABLE "ImportedGamePly" IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE "ImportedGamePosition" IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE "PositionAnalysis" IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE "MastersExplorerCache" IN SHARE ROW EXCLUSIVE MODE;

WITH input AS MATERIALIZED (
  SELECT candidate."positionId", candidate."firstObservedOrphanAt"
  FROM "PositionCleanupCandidate" AS candidate
  ORDER BY candidate."positionId"
  LIMIT 100
), eligible AS MATERIALIZED (
  SELECT input."positionId"
  FROM input
  WHERE input."firstObservedOrphanAt" <= now() - interval '30 days'
    AND NOT EXISTS (
      SELECT 1 FROM "ImportedGamePly" AS ply
      WHERE ply."positionId" = input."positionId"
    )
), dependent AS MATERIALIZED (
  SELECT
    (SELECT count(*) FROM "PositionAnalysis" AS analysis
     JOIN eligible ON eligible."positionId" = analysis."positionId") AS analysis_rows,
    (SELECT count(*) FROM "MastersExplorerCache" AS cache
     JOIN eligible ON eligible."positionId" = cache."positionId") AS cache_rows
), deleted AS (
  DELETE FROM "ImportedGamePosition" AS position
  USING eligible
  WHERE position."id" = eligible."positionId"
    AND NOT EXISTS (
      SELECT 1 FROM "ImportedGamePly" AS final_ply
      WHERE final_ply."positionId" = position."id"
    )
  RETURNING position."id"
)
SELECT
  (SELECT count(*) FROM input) AS input_rows,
  (SELECT count(*) FROM eligible) AS eligible_rows,
  (SELECT count(*) FROM deleted) AS deleted_rows_rolled_back,
  dependent.analysis_rows AS dependent_analysis_rows_rolled_back,
  dependent.cache_rows AS dependent_cache_rows_rolled_back
FROM dependent;

ROLLBACK;
