import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import {
  AccountRatingHistoryQuery,
  AccountRatingHistoryResponse,
  AccountRatingStatsResponse,
  DeleteAccountResponse,
  ExternalAccount,
  ImportRunSummary,
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

  createAccount(body: { provider: string; username: string; displayName?: string }): Observable<ExternalAccount> {
    return this.api.post<ExternalAccount>('/me/accounts', body);
  }

  syncAccount(accountId: number): Observable<ImportRunSummary> {
    return this.api.post<ImportRunSummary>(`/me/accounts/${accountId}/sync`, {});
  }

  resetCursor(accountId: number): Observable<ExternalAccount> {
    return this.api.post<ExternalAccount>(`/me/accounts/${accountId}/reset-cursor`, {});
  }

  setActive(accountId: number, isActive: boolean): Observable<ExternalAccount> {
    return this.api.patch<ExternalAccount>(`/me/accounts/${accountId}`, { isActive });
  }

  deleteAccount(accountId: number): Observable<DeleteAccountResponse> {
    return this.api.delete<DeleteAccountResponse>(`/me/accounts/${accountId}`);
  }
}
