-- CreateTable
CREATE TABLE "PositionAnalysis" (
    "id" SERIAL NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "fen" TEXT NOT NULL,
    "normalizedFen" TEXT NOT NULL,
    "playedMoveUci" TEXT,
    "depth" INTEGER NOT NULL,
    "multipv" INTEGER NOT NULL,
    "engineName" TEXT NOT NULL,
    "engineVersion" TEXT,
    "classificationVersion" TEXT NOT NULL DEFAULT 'v1',
    "bestMoveUci" TEXT,
    "bestScoreCpWhite" INTEGER,
    "playedScoreCpWhite" INTEGER,
    "scoreLossCp" INTEGER,
    "classification" TEXT,
    "lines" JSONB,
    "playedLine" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PositionAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameAnalysisRun" (
    "id" SERIAL NOT NULL,
    "importedGameId" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "depth" INTEGER NOT NULL,
    "multipv" INTEGER NOT NULL,
    "engineName" TEXT NOT NULL,
    "engineVersion" TEXT,
    "positionsTotal" INTEGER NOT NULL DEFAULT 0,
    "positionsDone" INTEGER NOT NULL DEFAULT 0,
    "summary" JSONB,
    "error" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameAnalysisRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameMoveAnalysis" (
    "id" SERIAL NOT NULL,
    "analysisRunId" INTEGER NOT NULL,
    "importedGameId" INTEGER NOT NULL,
    "positionAnalysisId" INTEGER NOT NULL,
    "plyNumber" INTEGER NOT NULL,
    "moveNumber" INTEGER NOT NULL,
    "side" TEXT NOT NULL,
    "fenBefore" TEXT NOT NULL,
    "fenAfter" TEXT,
    "playedMoveUci" TEXT NOT NULL,
    "playedMoveSan" TEXT,
    "classification" TEXT,
    "scoreLossCp" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameMoveAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PositionAnalysis_cacheKey_key" ON "PositionAnalysis"("cacheKey");

-- CreateIndex
CREATE INDEX "PositionAnalysis_normalizedFen_idx" ON "PositionAnalysis"("normalizedFen");

-- CreateIndex
CREATE INDEX "PositionAnalysis_classification_idx" ON "PositionAnalysis"("classification");

-- CreateIndex
CREATE INDEX "GameAnalysisRun_importedGameId_createdAt_idx" ON "GameAnalysisRun"("importedGameId", "createdAt");

-- CreateIndex
CREATE INDEX "GameAnalysisRun_status_idx" ON "GameAnalysisRun"("status");

-- CreateIndex
CREATE UNIQUE INDEX "GameMoveAnalysis_analysisRunId_plyNumber_key" ON "GameMoveAnalysis"("analysisRunId", "plyNumber");

-- CreateIndex
CREATE INDEX "GameMoveAnalysis_importedGameId_plyNumber_idx" ON "GameMoveAnalysis"("importedGameId", "plyNumber");

-- CreateIndex
CREATE INDEX "GameMoveAnalysis_positionAnalysisId_idx" ON "GameMoveAnalysis"("positionAnalysisId");

-- CreateIndex
CREATE INDEX "GameMoveAnalysis_classification_idx" ON "GameMoveAnalysis"("classification");

-- AddForeignKey
ALTER TABLE "GameAnalysisRun" ADD CONSTRAINT "GameAnalysisRun_importedGameId_fkey" FOREIGN KEY ("importedGameId") REFERENCES "ImportedGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameMoveAnalysis" ADD CONSTRAINT "GameMoveAnalysis_analysisRunId_fkey" FOREIGN KEY ("analysisRunId") REFERENCES "GameAnalysisRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameMoveAnalysis" ADD CONSTRAINT "GameMoveAnalysis_importedGameId_fkey" FOREIGN KEY ("importedGameId") REFERENCES "ImportedGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameMoveAnalysis" ADD CONSTRAINT "GameMoveAnalysis_positionAnalysisId_fkey" FOREIGN KEY ("positionAnalysisId") REFERENCES "PositionAnalysis"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
