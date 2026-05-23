// Domain types for the chess repertoire trainer. These types mirror the
// database schema but are kept free of Prisma-specific annotations. They
// describe courses, chapters, lines, move nodes, and training sessions.

export type Color = 'WHITE' | 'BLACK';

export interface Course {
  id: number;
  name: string;
  description?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Chapter {
  id: number;
  courseId: number;
  name: string;
  description?: string | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Line {
  id: number;
  chapterId: number;
  name: string;
  sideToTrain: Color;
  startingFen: string;
  tags?: string[];
  notes?: string | null;
  passedCount: number;
  failedCount: number;
  totalAttempts: number;
  lastTrainedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MoveNode {
  id: number;
  lineId: number;
  parentId?: number | null;
  plyNumber: number;
  fenBefore: string;
  fenAfter: string;
  moveUci: string;
  moveSan: string;
  moveNumber: number;
  colorToMoveBefore: Color;
  side: Color;
  isUserMove: boolean;
  isCorrectUserMove: boolean;
  comment?: string | null;
  annotation?: string | null;
  branchLabel?: string | null;
  branchWeight?: number | null;
  sortOrder: number;
  timesSeen: number;
  correctCount: number;
  incorrectCount: number;
  currentStreak: number;
  lastSeenAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TrainingSession {
  id: number;
  lineId: number;
  startedAt: Date;
  completedAt?: Date | null;
  result: 'PASSED' | 'FAILED' | 'ABANDONED';
  mistakesCount: number;
  totalExpectedMoves: number;
  correctMoves: number;
  accuracy?: number | null;
}

export interface TrainingAttemptMove {
  id: number;
  sessionId: number;
  moveNodeId?: number | null;
  fenBefore: string;
  expectedMoveUci?: string | null;
  playedMoveUci?: string | null;
  wasCorrect: boolean;
  createdAt: Date;
}

// A simplified in-memory representation of a move tree for a single line.
export interface MoveTreeNode {
  node: MoveNode;
  children: MoveTreeNode[];
}

export interface MoveTree {
  root: MoveTreeNode;
}