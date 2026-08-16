import type { Chapter } from '@chess-trainer/contracts/courses';
import type {
  ActiveTrainingStatsDto,
  LineTrainingSessionDto,
  PlayedTrainingMoveDto,
  SublineTrainingStatusDto,
  TrainingMarathonModeDto,
  TrainingMarathonNextResponseDto,
  TrainingMarathonScopeDto,
  TrainingMoveResponseDto,
  TrainingReviewItemDto,
  TrainingReviewResponseDto,
  TrainingSessionResponseDto,
  TrainingStatusValue,
} from '@chess-trainer/contracts/training';

export type RepertoireColor = 'WHITE' | 'BLACK';

export type ChapterDetail = Pick<Chapter, 'id' | 'courseId' | 'name' | 'description'>;

export interface LineTransferTargetCourse {
  id: number;
  name: string;
  description?: string | null;
}

export type LineTransferTargetChapter = Pick<Chapter, 'id' | 'name' | 'description' | 'sortOrder'>;

export type ActiveTrainingStats = ActiveTrainingStatsDto;

export interface LineRowTrainingStats {
  totalAttempts: number;
  passedCount: number;
  failedCount: number;
  passRate: number;
  activeSublineCount: number;
  trainedSublineCount: number;
  untrainedSublineCount: number;
  weakSublineCount: number;
  status: LineTrainingStatusValue;
}

export interface LineSummary {
  id: number;
  chapterId: number;
  name: string;
  sideToTrain: RepertoireColor;
  startingFen: string;
  trainingStats: LineRowTrainingStats;
}

export interface LineDetail {
  id: number;
  chapterId: number;
  name: string;
  sideToTrain: RepertoireColor;
  startingFen: string;
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

export type LineTrainingSession = LineTrainingSessionDto;
export type PlayedTrainingMove = PlayedTrainingMoveDto;
export type TrainingMoveResult = TrainingMoveResponseDto;
export type TrainingSessionResult = TrainingSessionResponseDto;
export type TrainingReviewItem = TrainingReviewItemDto;
export type TrainingReview = TrainingReviewResponseDto;

export interface MoveLinePayload {
  chapterId: number;
}

export interface CopyLinePayload {
  targetChapterId: number;
  name?: string;
}

export type MarathonScopeType = TrainingMarathonScopeDto['type'];
export type MarathonMode = TrainingMarathonModeDto;

export type LineTrainingStatusValue = TrainingStatusValue;

export interface MarathonNextRequest {
  scope?: { type: MarathonScopeType; id: number };
  mode?: MarathonMode;
  lineIds?: number[];
  sublineHashes?: string[];
  recentSublineHashes?: string[];
}
export interface MarathonRunResponse { runId: string }

export type SublineTrainingStatus = SublineTrainingStatusDto;
export type MarathonNextResponse = TrainingMarathonNextResponseDto;
