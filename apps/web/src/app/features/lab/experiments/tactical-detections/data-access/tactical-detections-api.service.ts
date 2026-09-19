import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../../../core/api/api.service';
import { appendGameFilterParams } from '../../../../../shared/games/filters/game-filter-query.mapper';
import type { GameFilters } from '../../../../../shared/games/filters/game-filter.model';
import type { ImportedGameFacetsResponse } from '../../../../../shared/games/game.models';
import {
  TacticalDetectionItem,
  TacticalDetectionKind,
  TacticalDetectionListResponse,
  TacticalDetectionRunRequest,
  TacticalDetectionRunResponse,
} from './tactical-detections.models';

@Injectable()
export class TacticalDetectionsApiService {
  private readonly api = inject(ApiService);

  runDetection(request: TacticalDetectionRunRequest): Observable<TacticalDetectionRunResponse> {
    return this.api.post<TacticalDetectionRunResponse>('/lab/tactical-detections/run', request);
  }

  getDetections(
    gameFilters: GameFilters,
    options: { kind?: TacticalDetectionKind; limit: number; gameId?: number },
  ): Observable<TacticalDetectionListResponse> {
    const params = new URLSearchParams();
    appendGameFilterParams(params, gameFilters);
    if (options.kind) params.set('kind', options.kind);
    if (options.gameId) params.set('gameId', String(options.gameId));
    params.set('limit', String(options.limit));
    return this.api.get<TacticalDetectionListResponse>(`/lab/tactical-detections?${params.toString()}`);
  }

  getGameDetections(gameId: number): Observable<TacticalDetectionItem[]> {
    return new Observable<TacticalDetectionItem[]>((subscriber) => {
      const filters: GameFilters = {
        accountId: '', provider: 'ALL', resultForUser: '', userColor: '', speedCategory: '', rated: '',
        timeControl: '', opponent: '', openingNameExact: '', openingName: '', analysisStatus: '',
        plyIndexStatus: '', tagFilter: '', tagCodes: [], minAccuracy: '', maxAccuracy: '',
        minOpponentRating: '', maxOpponentRating: '', from: '', to: '',
      };
      const subscription = this.getDetections(filters, { gameId, limit: 200 }).subscribe({
        next: (response) => subscriber.next(response.items),
        error: (error) => subscriber.error(error),
        complete: () => subscriber.complete(),
      });
      return () => subscription.unsubscribe();
    });
  }

  getFacets(): Observable<ImportedGameFacetsResponse> {
    return this.api.get<ImportedGameFacetsResponse>('/imported-games/facets');
  }
}
