export type { LichessConnectionStatus } from '@chess-trainer/contracts/lichess';
export type {
  AccountImportRun,
  AccountImportRunListResponse,
  AccountImportRunResponse,
  AccountImportStatus,
  CreateAccountImportRunResponse,
} from '@chess-trainer/contracts';
export type {
  AccountPerformanceGameHighlight,
  AccountPerformanceRecentGame,
  AccountPerformanceStatsResponse,
  AccountPerformanceTimeControlWdl,
  AccountRatingHistoryPoint,
  AccountRatingHistoryResponse,
  AccountRatingHistorySeries,
  AccountRatingStatsMilestone,
  AccountRatingStatsPeak,
  AccountRatingStatsProjection,
  AccountRatingStatsResponse,
  AccountRatingStatsSpeedProjection,
  AccountRatingStatsYearlyPeak,
  ExternalAccountWorkflowSummaryResponse,
} from '@chess-trainer/contracts/external-accounts';

import type {
  AccountRatingHistoryPoint as SharedAccountRatingHistoryPoint,
  AccountRatingHistorySeries as SharedAccountRatingHistorySeries,
  DefaultProgressAccountResponse as SharedDefaultProgressAccountResponse,
  ExternalAccountDeleteResponse,
  ExternalAccountResponse,
} from '@chess-trainer/contracts/external-accounts';

export type AccountProvider = ExternalAccountResponse['provider'];
export type ExternalAccount = ExternalAccountResponse;
export type DeleteAccountResponse = ExternalAccountDeleteResponse;
export type DefaultProgressAccountResponse = SharedDefaultProgressAccountResponse;

export interface ImportedGameIndexWorkflowResult {
  importedGameId: number;
  eligible: boolean;
  speedCategory?: string | null;
  skippedReason?: 'UNSUPPORTED_SPEED_CATEGORY';
  plyIndex?: {
    importedGameId: number;
    status: 'INDEXED' | 'ALREADY_INDEXED' | 'FAILED';
    pliesIndexed?: number | null;
    plyIndexedAt?: string | null;
    error?: string | null;
  };
  openingAssignment?: {
    importedGameId: number;
    status: 'ASSIGNED' | 'SKIPPED' | 'FAILED';
    openingEco?: string | null;
    openingName?: string | null;
    reason?: string | null;
  };
}

export interface BatchAnalysisAcceptedResponse {
  accepted: boolean;
  gameIds: number[];
}

export interface AccountForm {
  provider: AccountProvider;
  username: string;
  displayName: string;
}

export type RatingSpeed = SharedAccountRatingHistorySeries['key'];
export type RatingSpeedFilter = 'all' | RatingSpeed;
export type RatingRangeKey = '1M' | '3M' | '6M' | 'YTD' | '1Y' | '3Y' | '5Y' | 'ALL';

export type RatingHistoryPoint = SharedAccountRatingHistoryPoint;
export type RatingHistorySeries = SharedAccountRatingHistorySeries;

export interface AccountRatingHistoryQuery {
  from?: string;
  to?: string;
  speeds?: RatingSpeed[];
}

export type DashboardPeriodKey = RatingRangeKey;
