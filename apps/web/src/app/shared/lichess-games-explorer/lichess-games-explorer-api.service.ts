import { Injectable, inject } from '@angular/core';
import type { OpeningExplorerResponse } from '@chess-trainer/contracts/opening-explorer';
import { Observable } from 'rxjs';
import { ApiService } from '../../core/api/api.service';
import {
  lichessRatingOptions,
  lichessSpeedOptions,
  type LichessGamesExplorerFilters,
} from './lichess-games-explorer.models';

@Injectable({ providedIn: 'root' })
export class LichessGamesExplorerApiService {
  private readonly api = inject(ApiService);

  getPosition(
    fen: string,
    filters: LichessGamesExplorerFilters,
  ): Observable<OpeningExplorerResponse> {
    const params = new URLSearchParams({ fen });
    if (filters.since) params.set('since', filters.since);
    if (filters.until) params.set('until', filters.until);
    if (filters.ratings.length !== lichessRatingOptions.length) {
      params.set('ratings', filters.ratings.join(','));
    }
    if (filters.speeds.length !== lichessSpeedOptions.length) {
      params.set('speeds', filters.speeds.join(','));
    }
    return this.api.get<OpeningExplorerResponse>(
      `/lichess-games-explorer?${params.toString()}`,
    );
  }
}
