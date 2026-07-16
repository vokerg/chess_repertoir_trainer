import { Injectable, inject } from '@angular/core';
import type { MastersExplorerResponse } from '@chess-trainer/contracts/masters-explorer';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/api/api.service';

@Injectable({ providedIn: 'root' })
export class MastersExplorerApiService {
  private readonly api = inject(ApiService);

  getPosition(fen: string): Observable<MastersExplorerResponse> {
    const params = new URLSearchParams({ fen });
    return this.api.get<MastersExplorerResponse>(
      `/masters-explorer?${params.toString()}`,
    );
  }
}
