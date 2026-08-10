import type {
  AccountImportMode,
  AccountImportScope,
  AccountImportSource,
  AccountImportStatus,
  DurableAccountImportMode,
  DurableAccountImportSource,
} from '@chess-trainer/contracts';

export interface CreateAccountImportRunInput {
  userId: number;
  accountId: number;
  mode: DurableAccountImportMode;
  source: DurableAccountImportSource;
  scope: AccountImportScope;
  requestedFrom: Date;
  requestedTo: Date;
  priority: number;
  windowsTotal?: number | null;
  retryOfImportRunId?: number | null;
}

export interface StoredAccountImportRun {
  id: number;
  userId: number;
  accountId: number;
  provider: string;
  mode: AccountImportMode;
  source: AccountImportSource;
  status: AccountImportStatus;
  scopeVersion: number | null;
  scopeHash: string | null;
  scope: AccountImportScope | null;
  requestedFrom: Date | null;
  requestedTo: Date | null;
  retryOfImportRunId: number | null;
  priority: number;
  checkpointJson: unknown | null;
  windowsTotal: number | null;
  windowsCompleted: number;
  gamesSeen: number;
  gamesMatchedScope: number;
  gamesImported: number;
  gamesDuplicate: number;
  gamesUpdated: number;
  gamesSkipped: number;
  gamesSkippedOutOfScope: number;
  gamesFailed: number;
  providerRequestCount: number;
  providerRequestDurationMs: number;
  parseDurationMs: number;
  persistenceBatchCount: number;
  persistenceDurationMs: number;
  checkpointCount: number;
  checkpointDurationMs: number;
  lastProgressAt: Date | null;
  workKey: string | null;
  claimedAt: Date | null;
  heartbeatAt: Date | null;
  pauseRequestedAt: Date | null;
  cancelRequestedAt: Date | null;
  retryAt: Date | null;
  rateLimitUntil: Date | null;
  startedAt: Date;
  completedAt: Date | null;
  errorCode: string | null;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface StoredAccountImportCoverage {
  id: number;
  accountId: number;
  scopeVersion: number;
  scopeHash: string;
  scope: AccountImportScope;
  coveredFrom: Date | null;
  coveredThrough: Date | null;
  lastCompletedImportRunId: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExtendAccountImportCoverageInput {
  userId: number;
  importRunId: number;
  coveredFrom: Date;
  coveredThrough: Date;
}

export interface NormalizedAccountImportGame {
  providerGameId: string;
  providerUrl?: string | null;
  pgn?: string | null;
  rated?: boolean | null;
  variant?: string | null;
  speedCategory?: string | null;
  timeControlRaw?: string | null;
  timeControlInitial?: number | null;
  timeControlIncrement?: number | null;
  startedAt?: Date | null;
  endedAt?: Date | null;
  whiteUsername?: string | null;
  blackUsername?: string | null;
  whiteRating?: number | null;
  blackRating?: number | null;
  userColor?: string | null;
  opponentUsername?: string | null;
  result?: string | null;
  resultForUser?: string | null;
  status?: string | null;
  openingName?: string | null;
  openingEco?: string | null;
}

export interface PersistAccountImportGamesInput {
  userId: number;
  importRunId: number;
  workKey?: string | null;
  games: NormalizedAccountImportGame[];
}

export interface PersistAccountImportGamesResult {
  attempted: number;
  inserted: number;
  duplicate: number;
}
