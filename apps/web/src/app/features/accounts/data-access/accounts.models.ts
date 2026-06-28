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
