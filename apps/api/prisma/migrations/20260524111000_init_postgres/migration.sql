CREATE TABLE "Course" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "Chapter" (
  "id" SERIAL PRIMARY KEY,
  "courseId" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Chapter_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Line" (
  "id" SERIAL PRIMARY KEY,
  "chapterId" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "sideToTrain" TEXT NOT NULL,
  "startingFen" TEXT NOT NULL,
  "tags" TEXT,
  "notes" TEXT,
  "passedCount" INTEGER NOT NULL DEFAULT 0,
  "failedCount" INTEGER NOT NULL DEFAULT 0,
  "totalAttempts" INTEGER NOT NULL DEFAULT 0,
  "lastTrainedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Line_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "MoveNode" (
  "id" SERIAL PRIMARY KEY,
  "lineId" INTEGER NOT NULL,
  "parentId" INTEGER,
  "plyNumber" INTEGER NOT NULL,
  "fenBefore" TEXT NOT NULL,
  "fenAfter" TEXT NOT NULL,
  "moveUci" TEXT NOT NULL,
  "moveSan" TEXT NOT NULL,
  "moveNumber" INTEGER NOT NULL,
  "colorToMoveBefore" TEXT NOT NULL,
  "side" TEXT NOT NULL,
  "isUserMove" BOOLEAN NOT NULL,
  "isCorrectUserMove" BOOLEAN NOT NULL,
  "comment" TEXT,
  "annotation" TEXT,
  "branchLabel" TEXT,
  "branchWeight" DOUBLE PRECISION,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "timesSeen" INTEGER NOT NULL DEFAULT 0,
  "correctCount" INTEGER NOT NULL DEFAULT 0,
  "incorrectCount" INTEGER NOT NULL DEFAULT 0,
  "currentStreak" INTEGER NOT NULL DEFAULT 0,
  "lastSeenAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MoveNode_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "Line"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "MoveNode_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "MoveNode"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "TrainingSession" (
  "id" SERIAL PRIMARY KEY,
  "lineId" INTEGER NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "result" TEXT NOT NULL,
  "mistakesCount" INTEGER NOT NULL DEFAULT 0,
  "totalExpectedMoves" INTEGER NOT NULL DEFAULT 0,
  "correctMoves" INTEGER NOT NULL DEFAULT 0,
  "accuracy" DOUBLE PRECISION,
  CONSTRAINT "TrainingSession_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "Line"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "TrainingAttemptMove" (
  "id" SERIAL PRIMARY KEY,
  "sessionId" INTEGER NOT NULL,
  "moveNodeId" INTEGER,
  "fenBefore" TEXT NOT NULL,
  "expectedMoveUci" TEXT,
  "playedMoveUci" TEXT,
  "wasCorrect" BOOLEAN NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TrainingAttemptMove_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TrainingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TrainingAttemptMove_moveNodeId_fkey" FOREIGN KEY ("moveNodeId") REFERENCES "MoveNode"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
