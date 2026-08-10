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
  windowsTotal: number | null;
  windowsCompleted: number;
  gamesSeen: number;
  gamesMatchedScope: number;
  gamesImported: number;
  gamesDuplicate: number;
  gamesSkippedOutOfScope: number;
  gamesFailed: number;
  lastProgressAt: Date | null;
  workKey: string | null;
  claimedAt: Date | null;
  heartbeatAt: Date | null;
  retryAt: Date | null;
  rateLimitUntil: Date | null;
  startedAt: Date | null;
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
