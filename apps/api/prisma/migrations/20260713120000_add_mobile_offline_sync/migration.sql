-- Track the version of course content distributed to offline clients.
ALTER TABLE "Course"
ADD COLUMN "contentRevision" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "contentChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Preserve client identity and chronology for idempotent offline attempt ingestion.
ALTER TABLE "TrainingSession"
ADD COLUMN "clientAttemptId" TEXT,
ADD COLUMN "source" TEXT NOT NULL DEFAULT 'WEB_ONLINE',
ADD COLUMN "sourceDeviceId" TEXT,
ADD COLUMN "courseContentRevision" INTEGER,
ADD COLUMN "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX "TrainingSession_userId_clientAttemptId_key"
ON "TrainingSession"("userId", "clientAttemptId");
