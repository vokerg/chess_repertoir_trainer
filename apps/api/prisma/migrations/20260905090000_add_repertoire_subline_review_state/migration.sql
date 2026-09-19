CREATE TABLE "RepertoireSublineReviewState" (
    "userId" INTEGER NOT NULL,
    "lineId" INTEGER NOT NULL,
    "sublineHash" VARCHAR(64) NOT NULL,
    "sublineKeyVersion" INTEGER NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "intervalStage" INTEGER NOT NULL DEFAULT 0,
    "consecutiveSuccesses" INTEGER NOT NULL DEFAULT 0,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "lastTrainingSessionId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RepertoireSublineReviewState_pkey" PRIMARY KEY ("userId", "lineId", "sublineHash", "sublineKeyVersion")
);

CREATE INDEX "RepertoireSublineReviewState_userId_dueAt_lineId_idx"
ON "RepertoireSublineReviewState"("userId", "dueAt", "lineId");

CREATE INDEX "RepertoireSublineReviewState_userId_lineId_dueAt_idx"
ON "RepertoireSublineReviewState"("userId", "lineId", "dueAt");

ALTER TABLE "RepertoireSublineReviewState"
ADD CONSTRAINT "RepertoireSublineReviewState_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RepertoireSublineReviewState"
ADD CONSTRAINT "RepertoireSublineReviewState_lineId_fkey"
FOREIGN KEY ("lineId") REFERENCES "Line"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RepertoireSublineReviewState"
ADD CONSTRAINT "RepertoireSublineReviewState_lastTrainingSessionId_fkey"
FOREIGN KEY ("lastTrainingSessionId") REFERENCES "TrainingSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
