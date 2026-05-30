export type Provider = 'LICHESS' | 'CHESS_COM';
export type UserColor = 'WHITE' | 'BLACK';
export type ResultForUser = 'WIN' | 'DRAW' | 'LOSS';
export type AnalysisStatus = 'NOT_ANALYZED' | 'RUNNING' | 'COMPLETED' | 'FAILED';
export type PlyIndexStatus = 'NOT_INDEXED' | 'INDEXED' | 'FAILED';

export interface CourseDto {
  id: number;
  name: string;
  description?: string | null;
}

export interface CourseStatsDto {
  courseId: number;
  totalLines: number;
  totalAttempts: number;
  passedCount: number;
  failedCount: number;
  passRate: number;
  failureRate: number;
}

export interface ChapterDto {
  id: number;
  name: string;
  description?: string | null;
  sortOrder?: number | null;
}

export interface LineDto {
  id: number;
  chapterId?: number;
  name: string;
  sideToTrain: UserColor;
  startingFen: string;
  passedCount?: number;
  failedCount?: number;
  totalAttempts?: number;
}

export interface MoveNodeDto {
  id: number;
  lineId?: number;
  parentId?: number | null;
  moveUci?: string | null;
  moveSan?: string | null;
  fenBefore?: string | null;
  fenAfter: string;
  isUserMove?: boolean;
  isCorrectUserMove?: boolean;
  branchLabel?: string | null;
  comment?: string | null;
  annotation?: string | null;
}

export interface MoveTreeNodeDto {
  node: MoveNodeDto;
  children: MoveTreeNodeDto[];
}

export interface MoveTreeDto {
  root: MoveTreeNodeDto;
}

export interface TrainingSessionDto {
  id: number;
  lineId: number;
  status?: string;
  fen: string;
  expectedMoveUci?: string | null;
  totalMoves?: number;
  correctMoves?: number;
  mistakes?: number;
}

export interface TrainingMoveResultDto {
  correct: boolean;
  completed?: boolean;
  fen: string;
  expectedMoveUci?: string | null;
  playedMoves?: Array<{ moveUci: string; moveSan?: string | null }>;
  message?: string;
  session?: TrainingSessionDto;
}

export interface TrainingReviewDto {
  sessionId: number;
  mistakes?: Array<{
    fen: string;
    expectedMoveUci?: string | null;
    playedMoveUci?: string | null;
  }>;
  accuracy?: number | null;
}

export interface StatsSummaryDto {
  totalCourses: number;
  totalLines: number;
  totalSessions: number;
  weakLines: Array<LineDto & { failureRate?: number | null; priority?: number | null }>;
}

export interface ImportedGamePlayerDto {
  username?: string | null;
  rating?: number | null;
}

export interface ImportedGameAnalysisSummaryDto {
  status: AnalysisStatus;
  runId?: number | null;
  depth?: number | null;
  completedAt?: string | null;
  createdAt?: string | null;
  whiteAccuracy?: number | null;
  blackAccuracy?: number | null;
  userAccuracy?: number | null;
  summary?: Record<string, unknown> | null;
  criticalMoveCount?: number | null;
}

export interface ImportedGamePlyIndexSummaryDto {
  status: PlyIndexStatus;
  indexedAt?: string | null;
  error?: string | null;
}

export interface ImportedGamePlyIndexResultDto {
  importedGameId: number;
  status: 'INDEXED' | 'ALREADY_INDEXED' | 'FAILED';
  pliesIndexed?: number | null;
  plyIndexedAt?: string | null;
  error?: string;
}

export interface ImportedGameTimeControlDto {
  raw?: string | null;
  initial?: number | null;
  increment?: number | null;
}

export interface ImportedGameOpeningDto {
  eco?: string | null;
  name?: string | null;
}

export interface ImportedGameListItemDto {
  id: number;
  accountId: number;
  provider: Provider;
  providerGameId: string;
  providerUrl?: string | null;
  endedAt?: string | null;
  startedAt?: string | null;
  speedCategory?: string | null;
  rated?: boolean | null;
  variant?: string | null;
  timeControl: ImportedGameTimeControlDto;
  white?: ImportedGamePlayerDto | null;
  black?: ImportedGamePlayerDto | null;
  userColor?: UserColor | null;
  opponentUsername?: string | null;
  result?: string | null;
  resultForUser?: ResultForUser | null;
  status?: string | null;
  opening?: ImportedGameOpeningDto | null;
  plyIndex: ImportedGamePlyIndexSummaryDto;
  analysis: ImportedGameAnalysisSummaryDto;
}

export interface ImportedGamePageInfoDto {
  nextCursor?: string | null;
  hasMore: boolean;
}

export interface ImportedGameSearchResponseDto {
  items: ImportedGameListItemDto[];
  pageInfo: ImportedGamePageInfoDto;
  appliedFilters: Record<string, unknown>;
}

export interface ImportedGameDetailDto extends ImportedGameListItemDto {
  pgn?: string | null;
}

export interface ImportedGameAnalysisDto {
  status?: AnalysisStatus;
  depth?: number | null;
  engineName?: string | null;
  whiteAccuracy?: number | null;
  blackAccuracy?: number | null;
  moves?: Array<Record<string, unknown>>;
  criticalMoves?: Array<Record<string, unknown>>;
}

export interface FacetValueDto {
  value?: string | number | boolean | null;
  label?: string | null;
  count?: number | null;
  id?: number | string | null;
  name?: string | null;
  provider?: Provider | null;
  username?: string | null;
}

export interface ImportedGameFacetsResponseDto {
  accounts?: FacetValueDto[];
  providers?: FacetValueDto[];
  speeds?: FacetValueDto[];
  variants?: FacetValueDto[];
  results?: FacetValueDto[];
  colors?: FacetValueDto[];
  openings?: FacetValueDto[];
  analysisStatuses?: FacetValueDto[];
}

export interface OpeningWdlDto {
  wins: number;
  draws: number;
  losses: number;
  scorePct: number | null;
}

export interface OpeningAnalysisResponseDto {
  fen: string;
  normalizedFen: string;
  sideToMove: UserColor;
  fullMoveNumber: number;
  ratedOnly: boolean;
  occurrences: number;
  games: OpeningWdlDto & { total: number };
  nextMoves: Array<{
    moveUci: string;
    moveSan?: string | null;
    fenAfter: string;
    side: UserColor;
    moveNumber: number;
    occurrences: number;
    games: OpeningWdlDto;
  }>;
  topGames: ImportedGameListItemDto[];
  appliedFilters: Record<string, unknown>;
}

export interface PositionAnalysisResponseDto {
  position: {
    fen: string;
    depth?: number | null;
    fromCache?: boolean | null;
    lines?: Array<{
      multipv?: number | null;
      bestMove?: string | null;
      pv?: string[] | null;
      scoreCp?: number | null;
      mate?: number | null;
    }>;
  };
}
