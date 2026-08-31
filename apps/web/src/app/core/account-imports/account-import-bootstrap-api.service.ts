import { Injectable, inject } from '@angular/core';
import type { AutomaticAccountRefreshResponse } from '@chess-trainer/contracts';
import { Observable } from 'rxjs';
import { ApiService } from '../api/api.service';

@Injectable({ providedIn: 'root' })
export class AccountImportBootstrapApiService {
  private readonly api = inject(ApiService);

  refreshStaleAccounts(): Observable<AutomaticAccountRefreshResponse> {
    return this.api.post<AutomaticAccountRefreshResponse>(
      '/me/account-imports/automatic-refresh',
      {},
    );
  }
}