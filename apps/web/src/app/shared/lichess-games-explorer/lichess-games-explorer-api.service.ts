import { Injectable, inject } from '@angular/core';
import type { OpeningExplorerResponse } from '@chess-trainer/contracts/opening-explorer';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/api/api.service';
import type { LichessGamesExplorerFilters } from './lichess-games-explorer.models';

@Injectable({ providedIn: 'root' })
export class LichessGamesExplorerApiService {
  private readonly api = inject(ApiService);

  getPosition(
    fen: string,
    filters: LichessGamesExplorerFilters,
  ): Observable<OpeningExplorerResponse> {
    const params = new URLSearchParams({
      fen,
      speedPreset: filters.speedPreset,
      ratingTarget: filters.ratingTarget,
    });
    if (filters.ratingTarget === 'GROUP' && filters.ratingGroup !== null) {
      params.set('ratingGroup', String(filters.ratingGroup));
    }
    return this.api.get<OpeningExplorerResponse>(
      `/lichess-games-explorer?${params.toString()}`,
    );
  }
}