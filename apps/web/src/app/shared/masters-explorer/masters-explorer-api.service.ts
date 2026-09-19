import { Injectable, inject } from '@angular/core';
import type { OpeningExplorerResponse } from '@chess-trainer/contracts/opening-explorer';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/api/api.service';

@Injectable({ providedIn: 'root' })
export class MastersExplorerApiService {
  private readonly api = inject(ApiService);

  getPosition(fen: string): Observable<OpeningExplorerResponse> {
    const params = new URLSearchParams({ fen });
    return this.api.get<OpeningExplorerResponse>(
      `/masters-explorer?${params.toString()}`,
    );
  }
}
