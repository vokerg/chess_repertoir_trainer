import {
  AnalysisStatus,
  PlyIndexStatus,
  Provider,
  ResultForUser,
} from '../../games/data-access/games.models';

export type CourseReviewColor = 'WHITE' | 'BLACK';

export interface CourseReviewExample {
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
  sideToMove: CourseReviewColor;
  playedMoveUci: string;
  playedSan: string | null;
  moveSequenceSan: string | null;
  expectedMoveUci: string | null;
  expectedMoveUcis: string[];
  expectedMoveSans: string[];
  count: number;
  results: { win: number; draw: number; loss: number; unknown: number };
  examples: CourseReviewExample[];
}

export interface CourseReviewConflict {
  normalizedFenBefore: string;
  sideToMove: CourseReviewColor;
  moves: Array<{
    moveUci: string;
    moveSan: string;
    lineRefs: Array<{
      lineId: number;
      lineName: string;
      nodeId: number;
      moveSequenceSan: string | null;
    }>;
  }>;
}

export interface CourseReviewResponse {
  course: {
    id: number;
    name: string;
    description: string | null;
    sideToTrain: CourseReviewColor | null;
    hasMixedSides: boolean;
    lineCount: number;
    moveCount: number;
  };
  filters: {
    from: string;
    to?: string;
    accountIds?: number[];
    providers?: Provider[];
    resultForUser?: ResultForUser[];
    userColor?: CourseReviewColor[];
    speedCategory?: string[];
    rated?: boolean;
    timeControl?: string;
    opponent?: string;
    openingName?: string;
    analysisStatus?: AnalysisStatus[];
    plyIndexStatus?: PlyIndexStatus[];
    minAccuracy?: number;
    maxAccuracy?: number;
    minOpponentRating?: number;
    maxOpponentRating?: number;
    limit: number;
    offset: number;
    minCoveredPlies: number;
  };
  summary: {
    gamesChecked: number;
    indexedGames: number;
    inScopeGames: number;
    outOfScopeGames: number;
    gameEndedInsideRepertoire: number;
    repertoireEnded: number;
    myDeviations: number;
    opponentUncovered: number;
    unindexedGames: number;
    courseConflicts: number;
  };
  conflicts: CourseReviewConflict[];
  myDeviations: CourseReviewGroup[];
  opponentUncovered: CourseReviewGroup[];
  pagination: { limit: number; offset: number; returnedGames: number };
}
