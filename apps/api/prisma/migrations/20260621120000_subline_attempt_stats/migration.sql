-- CreateTable
CREATE TABLE "TrainingSublineAttempt" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "lineId" INTEGER NOT NULL,
    "trainingSessionId" INTEGER,
    "sublineHash" VARCHAR(64) NOT NULL,
    "sublineKeyVersion" INTEGER NOT NULL DEFAULT 1,
    "movesJson" JSONB NOT NULL,
    "moveText" TEXT,
    "trainingMode" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "passed" BOOLEAN,
    "mistakesCount" INTEGER NOT NULL DEFAULT 0,
    "totalExpectedMoves" INTEGER NOT NULL DEFAULT 0,
    "correctMoves" INTEGER NOT NULL DEFAULT 0,
    "accuracy" DOUBLE PRECISION,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "TrainingSublineAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TrainingSublineAttempt_trainingSessionId_key" ON "TrainingSublineAttempt"("trainingSessionId");

-- CreateIndex
CREATE INDEX "TrainingSublineAttempt_userId_lineId_startedAt_idx" ON "TrainingSublineAttempt"("userId", "lineId", "startedAt");

-- CreateIndex
CREATE INDEX "TrainingSublineAttempt_userId_sublineHash_startedAt_idx" ON "TrainingSublineAttempt"("userId", "sublineHash", "startedAt");

-- CreateIndex
CREATE INDEX "TrainingSublineAttempt_userId_lineId_sublineHash_startedAt_idx" ON "TrainingSublineAttempt"("userId", "lineId", "sublineHash", "startedAt");

-- CreateIndex
CREATE INDEX "TrainingSublineAttempt_userId_result_idx" ON "TrainingSublineAttempt"("userId", "result");

-- AddForeignKey
ALTER TABLE "TrainingSublineAttempt" ADD CONSTRAINT "TrainingSublineAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingSublineAttempt" ADD CONSTRAINT "TrainingSublineAttempt_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "Line"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingSublineAttempt" ADD CONSTRAINT "TrainingSublineAttempt_trainingSessionId_fkey" FOREIGN KEY ("trainingSessionId") REFERENCES "TrainingSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Drop obsolete persisted aggregate counters.
ALTER TABLE "Line" DROP COLUMN "passedCount",
DROP COLUMN "failedCount",
DROP COLUMN "totalAttempts",
DROP COLUMN "lastTrainedAt";

ALTER TABLE "MoveNode" DROP COLUMN "timesSeen",
DROP COLUMN "correctCount",
DROP COLUMN "incorrectCount",
DROP COLUMN "currentStreak",
DROP COLUMN "lastSeenAt";
