-- CreateTable
CREATE TABLE "ImportedGameAiReview" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "importedGameId" INTEGER NOT NULL,
    "analysisRunId" INTEGER,
    "inputHash" VARCHAR(64) NOT NULL,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "promptVersion" INTEGER NOT NULL DEFAULT 1,
    "provider" VARCHAR(40) NOT NULL,
    "model" VARCHAR(120) NOT NULL,
    "content" JSONB NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportedGameAiReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ImportedGameAiReview_importedGameId_key" ON "ImportedGameAiReview"("importedGameId");

-- CreateIndex
CREATE UNIQUE INDEX "ImportedGameAiReview_userId_importedGameId_key" ON "ImportedGameAiReview"("userId", "importedGameId");

-- CreateIndex
CREATE INDEX "ImportedGameAiReview_userId_updatedAt_idx" ON "ImportedGameAiReview"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "ImportedGameAiReview_analysisRunId_idx" ON "ImportedGameAiReview"("analysisRunId");

-- AddForeignKey
ALTER TABLE "ImportedGameAiReview" ADD CONSTRAINT "ImportedGameAiReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportedGameAiReview" ADD CONSTRAINT "ImportedGameAiReview_importedGameId_fkey" FOREIGN KEY ("importedGameId") REFERENCES "ImportedGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportedGameAiReview" ADD CONSTRAINT "ImportedGameAiReview_analysisRunId_fkey" FOREIGN KEY ("analysisRunId") REFERENCES "GameAnalysisRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
