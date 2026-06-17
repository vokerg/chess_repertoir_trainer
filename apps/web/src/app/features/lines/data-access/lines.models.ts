export type RepertoireColor = 'WHITE' | 'BLACK';

export interface ChapterDetail {
  id: number;
  courseId: number;
  name: string;
  description?: string | null;
}

export interface LineTransferTargetCourse {
  id: number;
  name: string;
  description?: string | null;
}

export interface LineTransferTargetChapter {
  id: number;
  name: string;
  description?: string | null;
  sortOrder: number;
}

export interface LineSummary {
  id: number;
  chapterId: number;
  name: string;
  sideToTrain: RepertoireColor;
  startingFen: string;
  passedCount: number;
  failedCount: number;
  totalAttempts: number;
}

export interface LineDetail {
  id: number;
  chapterId: number;
  name: string;
  sideToTrain: RepertoireColor;
  startingFen: string;
  passedCount: number;
  failedCount: number;
  totalAttempts: number;
}

export interface LineTreeNodeData {
  id: number;
  lineId: number;
  parentId: number | null;
  plyNumber: number;
  fenBefore: string;
  fenAfter: string;
  moveUci: string;
  moveSan: string;
  moveNumber: number;
  colorToMoveBefore: RepertoireColor;
  side: RepertoireColor;
  isUserMove: boolean;
  isCorrectUserMove: boolean;
  sortOrder: number;
  timesSeen: number;
  correctCount: number;
  incorrectCount: number;
  currentStreak: number;
  branchLabel?: string | null;
  branchWeight?: number | null;
  comment?: string | null;
  annotation?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface LineTreeNode {
  node: LineTreeNodeData;
  children: LineTreeNode[];
}

export interface LineTree {
  root: LineTreeNode;
}

export interface CreateLinePayload {
  name: string;
  sideToTrain: RepertoireColor;
  startingFen: string;
}

export interface ImportLinePgnPayload extends CreateLinePayload {
  pgn: string;
}

export interface CreateLineNodePayload {
  parentId: number | null;
  moveUci: string;
}

export interface UpdateLineNodePayload {
  branchLabel?: string | null;
  comment?: string | null;
  annotation?: string | null;
}

export interface LineTrainingSession {
  sessionId: number;
  fen: string;
  expectedMove?: string | null;
  completed: boolean;
}

export interface PlayedTrainingMove {
  moveUci: string;
  moveSan: string;
  isUserMove: boolean;
}

export interface TrainingMoveResult {
  correct: boolean;
  expectedMove: string | null;
  playedMoves: PlayedTrainingMove[];
  fen: string;
  nextExpectedMove: string | null;
  completed: boolean;
  result: 'PASSED' | 'FAILED' | null;
  accuracy: number | null;
  mistakesCount: number;
  correctMoves: number;
  totalExpectedMoves: number;
}

export interface TrainingSessionResult {
  id: number;
  lineId: number;
  result: 'IN_PROGRESS' | 'PASSED' | 'FAILED' | 'ABANDONED';
  mistakesCount: number;
  correctMoves: number;
  totalExpectedMoves: number;
  accuracy: number | null;
  completedAt?: string | null;
}

export interface TrainingReviewItem {
  id: number;
  moveNodeId: number | null;
  fenBefore: string;
  expectedMoveUci: string | null;
  playedMoveUci: string | null;
  moveSan: string | null;
  comment: string | null;
  annotation: string | null;
  branchLabel: string | null;
  createdAt: string;
}

export interface TrainingReview {
  mistakes: TrainingReviewItem[];
}

export interface MoveLinePayload {
  chapterId: number;
}

export interface CopyLinePayload {
  targetChapterId: number;
  name?: string;
}

export type MarathonScopeType = 'CHAPTER' | 'COURSE';

export interface MarathonNextResponse {
  line: {
    id: number;
    name: string;
    sideToTrain: RepertoireColor;
    startingFen: string;
    chapterId: number;
    chapterName: string;
    courseId: number;
  };
  session: LineTrainingSession;
}
