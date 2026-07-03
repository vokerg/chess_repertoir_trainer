CREATE TABLE "TacticalDetectionRun" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "from" TIMESTAMP(3) NOT NULL,
    "to" TIMESTAMP(3) NOT NULL,
    "force" BOOLEAN NOT NULL DEFAULT false,
    "thresholds" JSONB NOT NULL,
    "thresholdsHash" TEXT NOT NULL,
    "gamesScanned" INTEGER NOT NULL DEFAULT 0,
    "detectionsMade" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "error" TEXT,

    CONSTRAINT "TacticalDetectionRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TacticalDetection" (
    "id" SERIAL NOT NULL,
    "runId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "importedGameId" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "triggerPlyNumber" SMALLINT NOT NULL,
    "userReplyPlyNumber" SMALLINT,
    "moveUci" VARCHAR(5) NOT NULL,
    "bestMoveUci" VARCHAR(5),
    "evalBeforeUserCp" INTEGER,
    "evalAfterTriggerUserCp" INTEGER,
    "evalAfterReplyUserCp" INTEGER,
    "swingCp" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TacticalDetection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TacticalDetectionProcessedGame" (
    "userId" INTEGER NOT NULL,
    "importedGameId" INTEGER NOT NULL,
    "thresholdsHash" TEXT NOT NULL,
    "runId" INTEGER NOT NULL,
    "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TacticalDetectionProcessedGame_pkey" PRIMARY KEY ("userId","importedGameId","thresholdsHash")
);

CREATE INDEX "TacticalDetectionRun_userId_startedAt_idx" ON "TacticalDetectionRun"("userId", "startedAt");
CREATE INDEX "TacticalDetectionRun_userId_thresholdsHash_idx" ON "TacticalDetectionRun"("userId", "thresholdsHash");

CREATE UNIQUE INDEX "TacticalDetection_userId_importedGameId_kind_triggerPlyNumber_key"
ON "TacticalDetection"("userId", "importedGameId", "kind", "triggerPlyNumber");
CREATE INDEX "TacticalDetection_userId_kind_createdAt_idx" ON "TacticalDetection"("userId", "kind", "createdAt");
CREATE INDEX "TacticalDetection_userId_importedGameId_idx" ON "TacticalDetection"("userId", "importedGameId");

CREATE INDEX "TacticalDetectionProcessedGame_userId_scannedAt_idx"
ON "TacticalDetectionProcessedGame"("userId", "scannedAt");
CREATE INDEX "TacticalDetectionProcessedGame_runId_idx" ON "TacticalDetectionProcessedGame"("runId");

ALTER TABLE "TacticalDetectionRun"
ADD CONSTRAINT "TacticalDetectionRun_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TacticalDetection"
ADD CONSTRAINT "TacticalDetection_runId_fkey"
FOREIGN KEY ("runId") REFERENCES "TacticalDetectionRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TacticalDetection"
ADD CONSTRAINT "TacticalDetection_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TacticalDetection"
ADD CONSTRAINT "TacticalDetection_importedGameId_fkey"
FOREIGN KEY ("importedGameId") REFERENCES "ImportedGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TacticalDetectionProcessedGame"
ADD CONSTRAINT "TacticalDetectionProcessedGame_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TacticalDetectionProcessedGame"
ADD CONSTRAINT "TacticalDetectionProcessedGame_importedGameId_fkey"
FOREIGN KEY ("importedGameId") REFERENCES "ImportedGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TacticalDetectionProcessedGame"
ADD CONSTRAINT "TacticalDetectionProcessedGame_runId_fkey"
FOREIGN KEY ("runId") REFERENCES "TacticalDetectionRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
