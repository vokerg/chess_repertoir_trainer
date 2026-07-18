-- Keep an imported game fenced while a cancelled executor is still stopping.
DROP INDEX IF EXISTS "JobTask_active_importedGameId_key";
CREATE UNIQUE INDEX "JobTask_active_importedGameId_key"
ON "JobTask"("importedGameId")
WHERE "workKey" IS NOT NULL AND "importedGameId" IS NOT NULL;

-- Repair databases that applied the incomplete-completion normalization before
-- derived summaries and accuracy fields were cleared.
UPDATE "GameAnalysisRun"
SET
  "summary" = NULL,
  "accuracyVersion" = NULL,
  "whiteAccuracy" = NULL,
  "blackAccuracy" = NULL,
  "whiteAverageCentipawnLoss" = NULL,
  "blackAverageCentipawnLoss" = NULL,
  "whiteMovesAnalyzed" = 0,
  "blackMovesAnalyzed" = 0
WHERE "status" = 'FAILED'
  AND "positionsDone" < "positionsTotal";

UPDATE "ImportedGame" AS game
SET
  "latestWhiteAccuracy" = NULL,
  "latestBlackAccuracy" = NULL
FROM "GameAnalysisRun" AS run
WHERE game."latestAnalysisRunId" = run."id"
  AND run."status" = 'FAILED'
  AND run."positionsDone" < run."positionsTotal";
