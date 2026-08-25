import type {
  Chapter,
  CourseSide,
  Line as CourseLine,
  LineListItem,
  LineMoveNode,
  LineMoveTree as CourseLineMoveTree,
} from '@chess-trainer/contracts/courses';
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

export type RepertoireColor = CourseSide;

export type ChapterDetail = Pick<Chapter, 'id' | 'courseId' | 'name' | 'description'>;

export interface LineTransferTargetCourse {
  id: number;
  name: string;
  description?: string | null;
}

export type LineTransferTargetChapter = Pick<Chapter, 'id' | 'name' | 'description' | 'sortOrder'>;

export type ActiveTrainingStats = ActiveTrainingStatsDto;

export type LineResource = CourseLine;
export type LineListResource = LineListItem;
export type LineTreeResource = CourseLineMoveTree;

export type LineRowTrainingStats = LineListResource['trainingStats'];

export type LineSummary = Pick<
  LineListResource,
  'id' | 'chapterId' | 'name' | 'sideToTrain' | 'startingFen' | 'trainingStats'
>;

export type LineDetail = Pick<
  LineResource,
  'id' | 'chapterId' | 'name' | 'sideToTrain' | 'startingFen'
>;

export type LineTreeNodeData = Pick<
  LineMoveNode,
  | 'id'
  | 'lineId'
  | 'parentId'
  | 'plyNumber'
  | 'fenBefore'
  | 'fenAfter'
  | 'moveUci'
  | 'moveSan'
  | 'moveNumber'
  | 'colorToMoveBefore'
  | 'side'
  | 'isUserMove'
  | 'isCorrectUserMove'
  | 'sortOrder'
  | 'branchLabel'
  | 'branchWeight'
  | 'comment'
  | 'annotation'
> & Partial<Pick<LineMoveNode, 'createdAt' | 'updatedAt'>>;

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
