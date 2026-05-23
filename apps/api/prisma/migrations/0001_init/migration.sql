-- Migration to create initial schema for the chess repertoire trainer

PRAGMA foreign_keys=OFF;

CREATE TABLE "Course" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Chapter" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "courseId" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE
);

CREATE TABLE "Line" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "chapterId" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "sideToTrain" TEXT NOT NULL,
  "startingFen" TEXT NOT NULL,
  "tags" TEXT,
  "notes" TEXT,
  "passedCount" INTEGER NOT NULL DEFAULT 0,
  "failedCount" INTEGER NOT NULL DEFAULT 0,
  "totalAttempts" INTEGER NOT NULL DEFAULT 0,
  "lastTrainedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE CASCADE
);

CREATE TABLE "MoveNode" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
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
  "branchWeight" REAL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "timesSeen" INTEGER NOT NULL DEFAULT 0,
  "correctCount" INTEGER NOT NULL DEFAULT 0,
  "incorrectCount" INTEGER NOT NULL DEFAULT 0,
  "currentStreak" INTEGER NOT NULL DEFAULT 0,
  "lastSeenAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("lineId") REFERENCES "Line"("id") ON DELETE CASCADE,
  FOREIGN KEY ("parentId") REFERENCES "MoveNode"("id") ON DELETE CASCADE
);

CREATE TABLE "TrainingSession" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "lineId" INTEGER NOT NULL,
  "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" DATETIME,
  "result" TEXT NOT NULL,
  "mistakesCount" INTEGER NOT NULL DEFAULT 0,
  "totalExpectedMoves" INTEGER NOT NULL DEFAULT 0,
  "correctMoves" INTEGER NOT NULL DEFAULT 0,
  "accuracy" REAL,
  FOREIGN KEY ("lineId") REFERENCES "Line"("id") ON DELETE CASCADE
);

CREATE TABLE "TrainingAttemptMove" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "sessionId" INTEGER NOT NULL,
  "moveNodeId" INTEGER,
  "fenBefore" TEXT NOT NULL,
  "expectedMoveUci" TEXT,
  "playedMoveUci" TEXT,
  "wasCorrect" BOOLEAN NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("sessionId") REFERENCES "TrainingSession"("id") ON DELETE CASCADE,
  FOREIGN KEY ("moveNodeId") REFERENCES "MoveNode"("id") ON DELETE CASCADE
);

PRAGMA foreign_keys=ON;