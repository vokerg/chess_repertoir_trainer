import type { PositionAnalysisCache, PositionAnalysisLine } from '../../../shared/chess/engine/position-analysis-cache.service';
import type {
  AnalysisStatus,
  ImportedGameFacetsResponse,
  PlyIndexStatus,
  Provider,
  ResultForUser,
  UserColor,
} from '../../../shared/games/game.models';

export type {
  AnalysisStatus,
  FacetValue,
  ImportedGameFacetsResponse,
  PlyIndexStatus,
  Provider,
  ResultForUser,
  UserColor,
} from '../../../shared/games/game.models';
export type { PositionAnalysisCache, PositionAnalysisLine } from '../../../shared/chess/engine/position-analysis-cache.service';

export interface ImportedGamePlayer {
  username?: string | null;
  rating?: number | null;
}

export interface ImportedGameAnalysisSummary {
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

export interface ImportedGamePlyIndexSummary {
  status: PlyIndexStatus;
  indexedAt?: string | null;
  error?: string | null;
}

export interface ImportedGamePlyIndexResult {
  importedGameId: number;
  status: 'INDEXED' | 'ALREADY_INDEXED' | 'FAILED';
  pliesIndexed?: number | null;
  plyIndexedAt?: string | null;
  error?: string;
}

export interface BatchAnalysisConfig {
  enabled: boolean;
}

export interface BatchAnalysisAcceptedResponse {
  accepted: boolean;
  gameIds: number[];
}

export interface ImportedGameTimeControl {
  raw?: string | null;
  initial?: number | null;
  increment?: number | null;
}

export interface ImportedGameOpening {
  eco?: string | null;
  name?: string | null;
}

export interface ImportedGameTag {
  code: number;
  name: string;
}

export interface ImportedGamePly {
  plyNumber: number;
  moveUci: string;
  normalizedFen: string;
  scoreLossCp?: number | null;
  classificationCode?: number | null;
  classification?: string | null;
  positionAnalysis?: PositionAnalysisCache | null;
}

export interface ImportedGameListItem {
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
  timeControl: ImportedGameTimeControl;
  white?: ImportedGamePlayer | null;
  black?: ImportedGamePlayer | null;
  userColor?: UserColor | null;
  opponentUsername?: string | null;
  result?: string | null;
  resultForUser?: ResultForUser | null;
  status?: string | null;
  opening?: ImportedGameOpening | null;
  tagCodes: number[];
  tags?: ImportedGameTag[];
  plyIndex: ImportedGamePlyIndexSummary;
  analysis: ImportedGameAnalysisSummary;
}

export interface ImportedGameDetail extends ImportedGameListItem {
  pgn?: string | null;
  plies: ImportedGamePly[];
  createdAt?: string | null;
  updatedAt?: string | null;
}

export type GameMoveClassification = 'BEST' | 'GOOD' | 'INACCURACY' | 'MISTAKE' | 'BLUNDER' | 'BOOK' | 'MISS';

export interface ImportedGameAnalysisMove {
  id: number;
  plyNumber: number;
  moveNumber: number;
  side: UserColor;
  playedMoveUci: string;
  playedMoveSan: string | null;
  classification: GameMoveClassification | string | null;
  scoreLossCp: number | null;
  bestMoveUci: string | null;
  bestScoreCpWhite: number | null;
  playedScoreCpWhite: number | null;
  positionAnalysisId: number;
}

export interface ImportedGameAnalysisRun {
  id: number;
  importedGameId: number;
  status: AnalysisStatus;
  depth: number;
  multipv: number;
  engineName: string;
  engineVersion?: string | null;
  whiteAccuracy?: number | null;
  blackAccuracy?: number | null;
  whiteAverageCentipawnLoss?: number | null;
  blackAverageCentipawnLoss?: number | null;
  whiteMovesAnalyzed?: number | null;
  blackMovesAnalyzed?: number | null;
  summary?: Record<string, unknown> | null;
  error?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  moves: ImportedGameAnalysisMove[];
  criticalMoves: ImportedGameAnalysisMove[];
}

export interface ImportedGameAnalysisResponse {
  run: ImportedGameAnalysisRun;
}

export interface GameTagDefinitionsResponse {
  items: ImportedGameTag[];
}

export interface ImportedGameTagsRefreshResponse {
  importedGameId: number;
  tagCodes: number[];
  tags: ImportedGameTag[];
}

export interface ImportedGameFullRefreshAcceptedResponse {
  accepted: true;
  importedGameId: number;
  steps: ['PLY_INDEX', 'ANALYSIS', 'TAGS'];
}

export interface ImportedGameSearchResponse {
  items: ImportedGameListItem[];
  pageInfo: ImportedGamePageInfo;
  appliedFilters: Record<string, unknown>;
}

export interface ImportedGamePageInfo {
  nextCursor?: string | null;
  hasMore: boolean;
}

