ALTER TABLE "GameAnalysisRun"
  ADD COLUMN "accuracyVersion" TEXT,
  ADD COLUMN "whiteAccuracy" DOUBLE PRECISION,
  ADD COLUMN "blackAccuracy" DOUBLE PRECISION,
  ADD COLUMN "whiteAverageCentipawnLoss" DOUBLE PRECISION,
  ADD COLUMN "blackAverageCentipawnLoss" DOUBLE PRECISION,
  ADD COLUMN "whiteMovesAnalyzed" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "blackMovesAnalyzed" INTEGER NOT NULL DEFAULT 0;
