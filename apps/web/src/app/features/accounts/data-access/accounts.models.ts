export type AccountProvider = 'LICHESS' | 'CHESS_COM';

export interface ExternalAccount {
  id: number;
  provider: AccountProvider;
  username: string;
  displayName?: string | null;
  isActive: boolean;
  lastSyncAt?: string | null;
  syncCursorTime?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface ImportRunSummary {
  importRunId: number;
  status: string;
  gamesSeen: number;
  gamesImported: number;
  gamesUpdated: number;
  gamesSkipped?: number;
  gamesFailed: number;
  syncSince?: string | null;
  syncUntil?: string | null;
  archivesFetched?: number | null;
}

export interface DeleteAccountResponse {
  deleted: true;
  account: ExternalAccount;
}

export interface AccountForm {
  provider: AccountProvider;
  username: string;
  displayName: string;
}

export type RatingSpeed = 'bullet' | 'blitz' | 'rapid';
export type RatingSpeedFilter = 'all' | RatingSpeed;
export type RatingRangeKey = '1M' | '3M' | '6M' | 'YTD' | '1Y' | '3Y' | '5Y' | 'ALL';

export interface RatingHistoryPoint {
  date: string;
  rating: number;
  gameCount: number;
  ratingAt: string;
}

export interface RatingHistorySeries {
  key: RatingSpeed;
  label: 'Bullet' | 'Blitz' | 'Rapid';
  points: RatingHistoryPoint[];
}

export interface AccountRatingHistoryResponse {
  account: {
    id: number;
    provider: AccountProvider;
    username: string;
    displayName?: string | null;
  };
  bucket: 'day';
  aggregation: 'max';
  ratingSource: 'gameRecordedRating';
  series: RatingHistorySeries[];
  yDomain: {
    min: number;
    max: number;
  } | null;
}

export interface AccountRatingHistoryQuery {
  from?: string;
  to?: string;
  speeds?: RatingSpeed[];
}

export interface AccountRatingStatsPeak {
  rating: number;
  ratingAt: string;
  gameId: number;
}

export interface AccountRatingStatsYearlyPeak extends AccountRatingStatsPeak {
  year: number;
}

export interface AccountRatingStatsMilestone {
  rating: number;
  reachedAt: string;
  actualRating: number;
  gameId: number;
}

export interface AccountRatingStatsSpeedProjection {
  key: RatingSpeed;
  label: 'Bullet' | 'Blitz' | 'Rapid';
  gamesCount: number;
  current: AccountRatingStatsPeak | null;
  highest: AccountRatingStatsPeak | null;
  yearlyHighs: AccountRatingStatsYearlyPeak[];
  milestones: AccountRatingStatsMilestone[];
}

export interface AccountRatingStatsProjection {
  version: 3;
  ratingSource: 'gameRecordedRating';
  speeds: AccountRatingStatsSpeedProjection[];
}

export interface AccountRatingStatsResponse {
  account: {
    id: number;
    provider: AccountProvider;
    username: string;
    displayName?: string | null;
  };
  computedAt: string;
  gamesCount: number;
  data: AccountRatingStatsProjection;
}

export interface AccountPerformanceGameHighlight {
  gameId: number;
  endedAt: string;
  speed: RatingSpeed;
  userRating: number | null;
  opponentRating: number | null;
  opponentUsername: string | null;
  providerUrl: string | null;
}

export interface AccountPerformanceStatsResponse {
  account: {
    id: number;
    provider: AccountProvider;
    username: string;
    displayName?: string | null;
  };
  range: {
    from?: string;
    to?: string;
  };
  speeds: RatingSpeed[];
  gamesCount: number;
  wdl: {
    wins: number;
    draws: number;
    losses: number;
  };
  averageOpponentRating: {
    wins: number | null;
    draws: number | null;
    losses: number | null;
  };
  bestVictory: AccountPerformanceGameHighlight | null;
  mostEmbarrassingDefeat: AccountPerformanceGameHighlight | null;
}

export type DashboardPeriodKey = RatingRangeKey;
