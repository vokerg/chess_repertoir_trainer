export type RepertoireColor = 'WHITE' | 'BLACK';

export type CourseReviewGameStatus =
  | 'MY_DEVIATION'
  | 'OPPONENT_UNCOVERED'
  | 'REPERTOIRE_ENDED'
  | 'GAME_ENDED_INSIDE_REPERTOIRE'
  | 'OUT_OF_SCOPE'
  | 'UNINDEXED_GAME'
  | 'COURSE_CONFLICT';

export interface CourseReviewLineRef {
  lineId: number;
  lineName: string;
  nodeId?: number | null;
}

export interface CourseGraphMove {
  moveUci: string;
  moveSan: string;
  fenAfter: string;
  normalizedFenAfter: string;
  lineRefs: Array<CourseReviewLineRef & { nodeId: number }>;
}

export interface CourseGraphPosition {
  normalizedFen: string;
  sideToMove: RepertoireColor;
  lineRefs: CourseReviewLineRef[];
  userMoves: Map<string, CourseGraphMove>;
  opponentMoves: Map<string, CourseGraphMove>;
}

export interface CourseRepertoireGraph {
  startPositions: Set<string>;
  positions: Map<string, CourseGraphPosition>;
}

export interface CourseReviewPly {
  plyNumber: number;
  moveUci: string;
  normalizedFenBefore: string;
}

export interface CourseReviewGameMetadata {
  gameId: number;
  provider: string;
  providerGameId: string | null;
  providerUrl: string | null;
  endedAt: Date | null;
  userColor: RepertoireColor | null;
  opponentUsername: string | null;
  resultForUser: 'WIN' | 'DRAW' | 'LOSS' | null;
}

export interface CourseReviewGameResult {
  gameId: number;
  provider: string;
  providerGameId: string | null;
  providerUrl: string | null;
  endedAt: string | null;
  userColor: RepertoireColor | null;
  opponentUsername: string | null;
  resultForUser: 'WIN' | 'DRAW' | 'LOSS' | null;
  status: CourseReviewGameStatus;
  plyNumber: number | null;
  normalizedFenBefore: string | null;
  sideToMove: RepertoireColor | null;
  expectedMoveUci: string | null;
  expectedMoveUcis: string[];
  expectedMoveSans: string[];
  playedMoveUci: string | null;
  playedSan: string | null;
}

export interface CourseReviewConflict {
  normalizedFenBefore: string;
  sideToMove: RepertoireColor;
  moves: Array<{
    moveUci: string;
    moveSan: string;
    lineRefs: Array<CourseReviewLineRef & { nodeId: number }>;
  }>;
}

export interface CourseReviewGameExample {
  gameId: number;
  provider: string;
  providerGameId: string | null;
  providerUrl: string | null;
  endedAt: string | null;
  opponentUsername: string | null;
  resultForUser: 'WIN' | 'DRAW' | 'LOSS' | null;
  plyNumber: number | null;
}

export interface CourseReviewGroup {
  key: string;
  status: 'MY_DEVIATION' | 'OPPONENT_UNCOVERED';
  normalizedFenBefore: string;
  sideToMove: RepertoireColor;
  playedMoveUci: string;
  playedSan: string | null;
  expectedMoveUci: string | null;
  expectedMoveUcis: string[];
  expectedMoveSans: string[];
  count: number;
  results: { win: number; draw: number; loss: number; unknown: number };
  examples: CourseReviewGameExample[];
}
