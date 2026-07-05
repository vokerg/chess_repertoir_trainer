ALTER TABLE "TacticalDetection"
ADD COLUMN "thresholdsHash" VARCHAR(64),
ADD COLUMN "detectionVersion" INTEGER NOT NULL DEFAULT 2;

UPDATE "TacticalDetection" d
SET "thresholdsHash" = r."thresholdsHash"
FROM "TacticalDetectionRun" r
WHERE d."runId" = r."id"
  AND d."thresholdsHash" IS NULL;

UPDATE "TacticalDetection"
SET "thresholdsHash" = 'legacy'
WHERE "thresholdsHash" IS NULL;

ALTER TABLE "TacticalDetection"
ALTER COLUMN "thresholdsHash" SET NOT NULL;

DROP INDEX IF EXISTS "TacticalDetection_userId_importedGameId_kind_triggerPlyNumber_key";

CREATE UNIQUE INDEX "TacticalDetection_scope_key"
ON "TacticalDetection"("userId", "importedGameId", "kind", "triggerPlyNumber", "thresholdsHash", "detectionVersion");

CREATE INDEX "TacticalDetection_userId_thresholdsHash_detectionVersion_idx"
ON "TacticalDetection"("userId", "thresholdsHash", "detectionVersion");

CREATE TABLE "ScenarioTrainingSession" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "scenarioType" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" INTEGER NOT NULL,
    "tacticalDetectionId" INTEGER,
    "importedGameId" INTEGER,
    "userColor" TEXT NOT NULL,
    "opponentUsername" TEXT,
    "whiteUsername" TEXT,
    "blackUsername" TEXT,
    "resultForUser" TEXT,
    "gameResult" TEXT,
    "openingEco" TEXT,
    "openingName" TEXT,
    "endedAt" TIMESTAMP(3),
    "providerUrl" TEXT,
    "previousFen" TEXT,
    "startFen" TEXT NOT NULL,
    "challengePlyNumber" INTEGER NOT NULL,
    "triggerMoveUci" TEXT,
    "triggerMoveSan" TEXT,
    "originalUserMoveUci" TEXT,
    "originalUserMoveSan" TEXT,
    "referenceBestMoveUci" TEXT,
    "contextPlies" JSONB NOT NULL,
    "baselineUserEvalCp" INTEGER,
    "passToleranceCp" INTEGER NOT NULL DEFAULT 100,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ScenarioTrainingSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ScenarioTrainingAttempt" (
    "id" SERIAL NOT NULL,
    "sessionId" INTEGER NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "fenBefore" TEXT NOT NULL,
    "playedMoveUci" TEXT NOT NULL,
    "playedMoveSan" TEXT,
    "fenAfter" TEXT NOT NULL,
    "baselineUserEvalCp" INTEGER,
    "afterUserEvalCp" INTEGER,
    "deltaCp" INTEGER,
    "passed" BOOLEAN NOT NULL,
    "engineSource" TEXT NOT NULL,
    "engineName" TEXT,
    "engineDepth" INTEGER NOT NULL,
    "engineMultipv" INTEGER NOT NULL DEFAULT 1,
    "rawEngineJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScenarioTrainingAttempt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ScenarioTrainingSession_userId_scenarioType_startedAt_idx"
ON "ScenarioTrainingSession"("userId", "scenarioType", "startedAt");

CREATE INDEX "ScenarioTrainingSession_userId_sourceType_sourceId_idx"
ON "ScenarioTrainingSession"("userId", "sourceType", "sourceId");

CREATE INDEX "ScenarioTrainingSession_userId_tacticalDetectionId_idx"
ON "ScenarioTrainingSession"("userId", "tacticalDetectionId");

CREATE INDEX "ScenarioTrainingAttempt_sessionId_attemptNumber_idx"
ON "ScenarioTrainingAttempt"("sessionId", "attemptNumber");

ALTER TABLE "ScenarioTrainingSession"
ADD CONSTRAINT "ScenarioTrainingSession_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ScenarioTrainingSession"
ADD CONSTRAINT "ScenarioTrainingSession_tacticalDetectionId_fkey"
FOREIGN KEY ("tacticalDetectionId") REFERENCES "TacticalDetection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ScenarioTrainingSession"
ADD CONSTRAINT "ScenarioTrainingSession_importedGameId_fkey"
FOREIGN KEY ("importedGameId") REFERENCES "ImportedGame"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ScenarioTrainingAttempt"
ADD CONSTRAINT "ScenarioTrainingAttempt_sessionId_fkey"
FOREIGN KEY ("sessionId") REFERENCES "ScenarioTrainingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
