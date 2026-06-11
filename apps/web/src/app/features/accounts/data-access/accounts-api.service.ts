import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../services/api.service';
import { DeleteAccountResponse, ExternalAccount, ImportRunSummary } from './accounts.models';

@Injectable()
export class AccountsApiService {
  private readonly api = inject(ApiService);

  getAccounts(): Observable<ExternalAccount[]> {
    return this.api.get<ExternalAccount[]>('/me/accounts');
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
