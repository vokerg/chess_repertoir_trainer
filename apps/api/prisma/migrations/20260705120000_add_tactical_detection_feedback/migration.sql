CREATE TABLE "TacticalDetectionFeedback" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "importedGameId" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "triggerPlyNumber" SMALLINT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DISLIKED',
    "reason" TEXT,
    "sourceSessionId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TacticalDetectionFeedback_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TacticalDetectionFeedback_userId_importedGameId_kind_triggerPlyNumber_key"
ON "TacticalDetectionFeedback"("userId", "importedGameId", "kind", "triggerPlyNumber");

CREATE INDEX "TacticalDetectionFeedback_userId_status_updatedAt_idx"
ON "TacticalDetectionFeedback"("userId", "status", "updatedAt");

CREATE INDEX "TacticalDetectionFeedback_userId_importedGameId_idx"
ON "TacticalDetectionFeedback"("userId", "importedGameId");

ALTER TABLE "TacticalDetectionFeedback"
ADD CONSTRAINT "TacticalDetectionFeedback_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TacticalDetectionFeedback"
ADD CONSTRAINT "TacticalDetectionFeedback_importedGameId_fkey"
FOREIGN KEY ("importedGameId") REFERENCES "ImportedGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;
