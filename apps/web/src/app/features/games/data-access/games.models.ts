import type {
  ImportedGameAnalysisSummary,
  ImportedGameDetail,
  ImportedGameSearchItem,
  ImportedGamePageInfo,
  ImportedGamePly,
  ImportedGamePlyIndexSummary,
  ImportedGamePlayer,
  ImportedGameProvider,
  ImportedGameResultForUser,
  ImportedGameSearchResponse,
  ImportedGameTag,
  ImportedGameTagDefinitionsResponse,
  ImportedGameTimeControl,
  ImportedGameUserColor,
} from '@chess-trainer/contracts/imported-games';
import type { PositionAnalysisCache, PositionAnalysisLine } from '../../../shared/chess/engine/position-analysis-cache.service';
import type { AnalysisStatus, PlyIndexStatus } from '../../../shared/games/game.models';
import type { ImportedGameFacetsResponse } from '../../../shared/games/game.models';

export type {
  ImportedGameAnalysisSummary,
  ImportedGameDetail,
  ImportedGameFacetsResponse,
  ImportedGameSearchItem,
  ImportedGamePageInfo,
  ImportedGamePly,
  ImportedGamePlyIndexSummary,
  ImportedGamePlayer,
  ImportedGameSearchResponse,
  ImportedGameTag,
  ImportedGameTimeControl,
  PositionAnalysisCache,
  PositionAnalysisLine,
};

export type Provider = ImportedGameProvider;
export type ResultForUser = ImportedGameResultForUser;
export type UserColor = ImportedGameUserColor;
export type { AnalysisStatus, FacetValue, PlyIndexStatus } from '../../../shared/games/game.models';

export type GameTagDefinitionsResponse = ImportedGameTagDefinitionsResponse;

export interface ImportedGamePlyIndexResult {
  importedGameId: number;
  status: 'INDEXED' | 'ALREADY_INDEXED' | 'FAILED';
  pliesIndexed?: number | null;
  plyIndexedAt?: string | null;
  error?: string;
}

export interface ImportedGameOpeningAssignmentResult {
  importedGameId: number;
  status: 'ASSIGNED' | 'SKIPPED' | 'FAILED';
  openingEco?: string | null;
  openingName?: string | null;
  reason?: string | null;
}

export interface ImportedGameIndexWorkflowResult {
  importedGameId: number;
  eligible: boolean;
  speedCategory?: string | null;
  skippedReason?: 'UNSUPPORTED_SPEED_CATEGORY';
  plyIndex?: ImportedGamePlyIndexResult;
  openingAssignment?: ImportedGameOpeningAssignmentResult;
}

export interface BatchAnalysisConfig {
  enabled: boolean;
}

export interface BatchAnalysisAcceptedResponse {
  accepted: boolean;
  gameIds: number[];
}

export type GameMoveClassification = 'BEST' | 'GOOD' | 'INACCURACY' | 'MISTAKE' | 'BLUNDER' | 'BOOK' | 'MISS';

export interface ImportedGameAnalysisMove {
  plyNumber: number;
  moveNumber: number;
  side: UserColor;
  playedMoveUci: string;
  playedMoveSan: string | null;
  classification: GameMoveClassification | string | null;
  classificationCode: number | null;
  scoreLossCp: number | null;
  bestMoveUci: string | null;
  bestScoreCpWhite: number | null;
  playedScoreCpWhite: number | null;
  bestMateWhite: number | null;
  positionAnalysisId: number | null;
}

export interface ImportedGameAnalysisRun {
  id: number;
  importedGameId: number;
  status: AnalysisStatus;
  positionsTotal: number | null;
  positionsDone: number | null;
  accuracyVersion: string | null;
  whiteAccuracy: number | null;
  blackAccuracy: number | null;
  whiteAverageCentipawnLoss: number | null;
  blackAverageCentipawnLoss: number | null;
  whiteMovesAnalyzed: number | null;
  blackMovesAnalyzed: number | null;
  summary: Record<string, unknown> | null;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string | null;
  moves: ImportedGameAnalysisMove[];
}

export interface ImportedGameAnalysisResponse {
  run: ImportedGameAnalysisRun;
}

export interface ImportedGameTagsRefreshResponse {
  importedGameId: number;
  tagCodes: number[];
  tags: ImportedGameTag[];
}

export interface ImportedGameFullRefreshAcceptedResponse {
  accepted: true;
  importedGameId: number;
  steps: ['PLY_INDEX', 'OPENING_ASSIGNMENT', 'ANALYSIS', 'TAGS'];
}
