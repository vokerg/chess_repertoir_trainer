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
