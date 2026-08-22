import { Injectable, inject } from '@angular/core';
import type {
  LichessConnectionStatus,
  LichessDisconnectResponse,
} from '@chess-trainer/contracts/lichess';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import type {
  AccountImportRunListResponse,
  AccountImportRunResponse,
  AccountPerformanceStatsResponse,
  AccountRatingHistoryQuery,
  AccountRatingHistoryResponse,
  AccountRatingStatsResponse,
  CreateAccountImportRunResponse,
  DefaultProgressAccountResponse,
  ExternalAccount,
  ExternalAccountWorkflowSummaryResponse,
} from './accounts.models';

@Injectable()
export class AccountsApiService {
  private readonly api = inject(ApiService);

  getAccounts(): Observable<ExternalAccount[]> {
    return this.api.get<ExternalAccount[]>('/me/accounts');
  }

  getAccount(accountId: number): Observable<ExternalAccount> {
    return this.api.get<ExternalAccount>(`/me/accounts/${accountId}`);
  }

  getRatingHistory(
    accountId: number,
    query: AccountRatingHistoryQuery = {},
  ): Observable<AccountRatingHistoryResponse> {
    const params = new URLSearchParams();
    if (query.from) params.set('from', query.from);
    if (query.to) params.set('to', query.to);
    if (query.speeds?.length) params.set('speeds', query.speeds.join(','));

    const search = params.toString();
    return this.api.get<AccountRatingHistoryResponse>(
      `/me/accounts/${accountId}/rating-history${search ? `?${search}` : ''}`,
    );
  }

  getRatingStats(accountId: number): Observable<AccountRatingStatsResponse> {
    return this.api.get<AccountRatingStatsResponse>(`/me/accounts/${accountId}/rating-stats`);
  }

  getPerformanceStats(
    accountId: number,
    query: AccountRatingHistoryQuery = {},
  ): Observable<AccountPerformanceStatsResponse> {
    const params = new URLSearchParams();
    if (query.from) params.set('from', query.from);
    if (query.to) params.set('to', query.to);
    if (query.speeds?.length) params.set('speeds', query.speeds.join(','));

    const search = params.toString();
    return this.api.get<AccountPerformanceStatsResponse>(
      `/me/accounts/${accountId}/performance-stats${search ? `?${search}` : ''}`,
    );
  }

  createAccount(body: {
    provider: string;
    username: string;
    displayName?: string;
  }): Observable<ExternalAccount> {
    return this.api.post<ExternalAccount>('/me/accounts', body);
  }

  syncAccount(accountId: number): Observable<CreateAccountImportRunResponse> {
    return this.api.post<CreateAccountImportRunResponse>(`/me/accounts/${accountId}/sync`, {});
  }

  backfillAccount(accountId: number): Observable<CreateAccountImportRunResponse> {
    return this.api.post<CreateAccountImportRunResponse>(`/me/accounts/${accountId}/backfill`, {});
  }

  getAccountImports(limit = 100): Observable<AccountImportRunListResponse> {
    return this.api.get<AccountImportRunListResponse>(`/me/account-imports?limit=${limit}`);
  }

  getActiveAccountImports(limit = 100): Observable<AccountImportRunListResponse> {
    return this.api.get<AccountImportRunListResponse>(
      `/me/account-imports?active=true&limit=${limit}`,
    );
  }

  pauseImport(importRunId: number): Observable<AccountImportRunResponse> {
    return this.api.post<AccountImportRunResponse>(`/me/account-imports/${importRunId}/pause`, {});
  }

  resumeImport(importRunId: number): Observable<AccountImportRunResponse> {
    return this.api.post<AccountImportRunResponse>(`/me/account-imports/${importRunId}/resume`, {});
  }

  cancelImport(importRunId: number): Observable<AccountImportRunResponse> {
    return this.api.post<AccountImportRunResponse>(`/me/account-imports/${importRunId}/cancel`, {});
  }

  retryImport(importRunId: number): Observable<CreateAccountImportRunResponse> {
    return this.api.post<CreateAccountImportRunResponse>(`/me/account-imports/${importRunId}/retry`, {});
  }

  getWorkflowSummary(accountId: number): Observable<ExternalAccountWorkflowSummaryResponse> {
    return this.api.get<ExternalAccountWorkflowSummaryResponse>(
      `/me/accounts/${accountId}/imported-game-workflow-candidates`,
    );
  }

  setActive(accountId: number, isActive: boolean): Observable<ExternalAccount> {
    return this.api.patch<ExternalAccount>(`/me/accounts/${accountId}`, { isActive });
  }

  setDefaultProgressAccount(accountId: number | null): Observable<DefaultProgressAccountResponse> {
    return this.api.patch<DefaultProgressAccountResponse>('/me/default-progress-account', {
      accountId,
    });
  }

  getLichessConnection(): Observable<LichessConnectionStatus> {
    return this.api.get<LichessConnectionStatus>('/me/lichess-connection');
  }

  startLichessConnection(): Observable<{ url: string }> {
    return this.api.post<{ url: string }>('/me/lichess-connection/start', {});
  }

  disconnectLichess(): Observable<LichessDisconnectResponse> {
    return this.api.delete<LichessDisconnectResponse>('/me/lichess-connection');
  }
}
