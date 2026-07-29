CREATE TABLE "LichessPuzzle" (
    "id" VARCHAR(16) NOT NULL,
    "gameId" VARCHAR(16) NOT NULL,
    "gamePgn" TEXT NOT NULL,
    "initialPly" SMALLINT NOT NULL,
    "startFen" VARCHAR(120) NOT NULL,
    "lastMoveUci" VARCHAR(5) NOT NULL,
    "sideToMove" VARCHAR(5) NOT NULL,
    "solutionUci" TEXT[] NOT NULL,
    "themes" TEXT[] NOT NULL,
    "rating" INTEGER NOT NULL,
    "plays" INTEGER NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LichessPuzzle_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LichessPuzzleRound" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "puzzleId" VARCHAR(16) NOT NULL,
    "source" VARCHAR(32) NOT NULL,
    "angle" VARCHAR(80) NOT NULL,
    "difficulty" VARCHAR(16),
    "ratedRequested" BOOLEAN NOT NULL DEFAULT true,
    "status" VARCHAR(24) NOT NULL DEFAULT 'IN_PROGRESS',
    "outcome" VARCHAR(16),
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "currentFen" VARCHAR(120) NOT NULL,
    "moveAttempts" JSONB NOT NULL,
    "firstWrongAt" TIMESTAMP(3),
    "revealedAt" TIMESTAMP(3),
    "learningCompletedAt" TIMESTAMP(3),
    "upstreamOutcome" VARCHAR(8),
    "upstreamStatus" VARCHAR(16) NOT NULL DEFAULT 'NOT_REQUIRED',
    "upstreamError" TEXT,
    "ratingDiff" INTEGER,
    "syncedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LichessPuzzleRound_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LichessPuzzleReviewState" (
    "userId" INTEGER NOT NULL,
    "puzzleId" VARCHAR(16) NOT NULL,
    "dueAt" TIMESTAMP(3),
    "intervalStage" INTEGER NOT NULL DEFAULT 0,
    "consecutiveSuccesses" INTEGER NOT NULL DEFAULT 0,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "bookmarked" BOOLEAN NOT NULL DEFAULT false,
    "lastRoundId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LichessPuzzleReviewState_pkey" PRIMARY KEY ("userId","puzzleId")
);

CREATE INDEX "LichessPuzzleRound_userId_status_startedAt_idx"
ON "LichessPuzzleRound"("userId", "status", "startedAt");

CREATE INDEX "LichessPuzzleRound_userId_puzzleId_startedAt_idx"
ON "LichessPuzzleRound"("userId", "puzzleId", "startedAt");

CREATE INDEX "LichessPuzzleRound_upstreamStatus_updatedAt_idx"
ON "LichessPuzzleRound"("upstreamStatus", "updatedAt");

CREATE INDEX "LichessPuzzleReviewState_userId_dueAt_idx"
ON "LichessPuzzleReviewState"("userId", "dueAt");

CREATE INDEX "LichessPuzzleReviewState_userId_bookmarked_dueAt_idx"
ON "LichessPuzzleReviewState"("userId", "bookmarked", "dueAt");

ALTER TABLE "LichessPuzzleRound"
ADD CONSTRAINT "LichessPuzzleRound_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LichessPuzzleRound"
ADD CONSTRAINT "LichessPuzzleRound_puzzleId_fkey"
FOREIGN KEY ("puzzleId") REFERENCES "LichessPuzzle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "LichessPuzzleReviewState"
ADD CONSTRAINT "LichessPuzzleReviewState_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "AppUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LichessPuzzleReviewState"
ADD CONSTRAINT "LichessPuzzleReviewState_puzzleId_fkey"
FOREIGN KEY ("puzzleId") REFERENCES "LichessPuzzle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
