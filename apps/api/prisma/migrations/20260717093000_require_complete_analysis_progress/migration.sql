-- A completed analysis run must account for every expected position. Older code could
-- report COMPLETED after a cached-only force pass left gaps, so normalize any such rows
-- before enforcing the invariant at the PostgreSQL boundary.
UPDATE "GameAnalysisRun"
SET
  "status" = 'FAILED',
  "error" = COALESCE("error", 'Analysis run completed with incomplete progress.'),
  "completedAt" = COALESCE("completedAt", NOW())
WHERE "status" = 'COMPLETED'
  AND "positionsDone" < "positionsTotal";

UPDATE "ImportedGame" AS game
SET
  "latestAnalysisStatus" = 'FAILED',
  "latestAnalysisCompletedAt" = COALESCE(run."completedAt", NOW())
FROM "GameAnalysisRun" AS run
WHERE game."latestAnalysisRunId" = run."id"
  AND run."status" = 'FAILED'
  AND run."positionsDone" < run."positionsTotal";

ALTER TABLE "GameAnalysisRun"
ADD CONSTRAINT "GameAnalysisRun_completed_progress_check"
CHECK (
  "status" <> 'COMPLETED'
  OR "positionsDone" >= "positionsTotal"
);
