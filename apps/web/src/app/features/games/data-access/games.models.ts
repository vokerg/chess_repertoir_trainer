import type {
  ImportedGameAnalysisMove,
  ImportedGameAnalysisResponse,
  ImportedGameAnalysisRun,
} from '@chess-trainer/contracts/analysis';
import type {
  ImportedGameAnalysisSummary,
  ImportedGameDetail,
  ImportedGameIndexWorkflowResult,
  ImportedGameOpeningAssignmentResult,
  ImportedGameSearchItem,
  ImportedGamePageInfo,
  ImportedGamePly,
  ImportedGamePlyIndexResult,
  ImportedGamePlyIndexSummary,
  ImportedGamePlayer,
  ImportedGameProvider,
  ImportedGameResultForUser,
  ImportedGameSearchResponse,
  ImportedGameTag,
  ImportedGameTagDefinitionsResponse,
  ImportedGameTagsRefreshResponse,
  ImportedGameTimeControl,
  ImportedGameUserColor,
} from '@chess-trainer/contracts/imported-games';
import type { PositionAnalysisCache, PositionAnalysisLine } from '../../../shared/chess/engine/position-analysis-cache.service';
import type { AnalysisStatus, PlyIndexStatus } from '../../../shared/games/game.models';
import type { ImportedGameFacetsResponse } from '../../../shared/games/game.models';

export type {
  ImportedGameAnalysisMove,
  ImportedGameAnalysisResponse,
  ImportedGameAnalysisRun,
  ImportedGameAnalysisSummary,
  ImportedGameDetail,
  ImportedGameFacetsResponse,
  ImportedGameIndexWorkflowResult,
  ImportedGameOpeningAssignmentResult,
  ImportedGameSearchItem,
  ImportedGamePageInfo,
  ImportedGamePly,
  ImportedGamePlyIndexResult,
  ImportedGamePlyIndexSummary,
  ImportedGamePlayer,
  ImportedGameSearchResponse,
  ImportedGameTag,
  ImportedGameTagsRefreshResponse,
  ImportedGameTimeControl,
  PositionAnalysisCache,
  PositionAnalysisLine,
};

export type Provider = ImportedGameProvider;
export type ResultForUser = ImportedGameResultForUser;
export type UserColor = ImportedGameUserColor;
export type { AnalysisStatus, FacetValue, PlyIndexStatus } from '../../../shared/games/game.models';

export type GameTagDefinitionsResponse = ImportedGameTagDefinitionsResponse;

export interface BatchAnalysisConfig {
  enabled: boolean;
}

export interface BatchAnalysisAcceptedResponse {
  accepted: boolean;
  gameIds: number[];
}

export interface ImportedGameFullRefreshAcceptedResponse {
  accepted: true;
  importedGameId: number;
  steps: ['PLY_INDEX', 'OPENING_ASSIGNMENT', 'ANALYSIS', 'TAGS'];
}
