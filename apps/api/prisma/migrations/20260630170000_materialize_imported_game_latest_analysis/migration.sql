ALTER TABLE "ImportedGame"
ADD COLUMN "latestAnalysisRunId" INTEGER,
ADD COLUMN "latestAnalysisStatus" TEXT,
ADD COLUMN "latestAnalysisCreatedAt" TIMESTAMP(3),
ADD COLUMN "latestAnalysisCompletedAt" TIMESTAMP(3),
ADD COLUMN "latestWhiteAccuracy" DOUBLE PRECISION,
ADD COLUMN "latestBlackAccuracy" DOUBLE PRECISION;

UPDATE "ImportedGame" game
SET
  "latestAnalysisRunId" = latest.id,
  "latestAnalysisStatus" = latest.status,
  "latestAnalysisCreatedAt" = latest."createdAt",
  "latestAnalysisCompletedAt" = latest."completedAt",
  "latestWhiteAccuracy" = latest."whiteAccuracy",
  "latestBlackAccuracy" = latest."blackAccuracy"
FROM (
  SELECT DISTINCT ON ("importedGameId")
    id,
    "importedGameId",
    status,
    "createdAt",
    "completedAt",
    "whiteAccuracy",
    "blackAccuracy"
  FROM "GameAnalysisRun"
  ORDER BY "importedGameId", "createdAt" DESC, id DESC
) latest
WHERE latest."importedGameId" = game.id;

CREATE INDEX "ImportedGame_userId_latestAnalysisStatus_endedAt_idx"
ON "ImportedGame"("userId", "latestAnalysisStatus", "endedAt");
