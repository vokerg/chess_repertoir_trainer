import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import { ImportedGameFacetsResponse } from '../game.models';
import {
  OpeningAnalysisPerformanceResponse,
  OpeningAnalysisResponse,
  OpeningAnalysisTopGamesResponse,
} from './position-game-moves.models';

@Injectable({ providedIn: 'root' })
export class PositionGameMovesApiService {
  private readonly api = inject(ApiService);

  getFacets(): Observable<ImportedGameFacetsResponse> {
    return this.api.get<ImportedGameFacetsResponse>('/imported-games/facets');
  }

  getAnalysis(query: string): Observable<OpeningAnalysisResponse> {
    return this.api.get<OpeningAnalysisResponse>(`/opening-analysis${query}`);
  }

  getPerformance(query: string): Observable<OpeningAnalysisPerformanceResponse> {
    return this.api.get<OpeningAnalysisPerformanceResponse>(`/opening-analysis/performance${query}`);
  }

  getTopGames(query: string, limit = 10): Observable<OpeningAnalysisTopGamesResponse> {
    const params = new URLSearchParams(query.startsWith('?') ? query.slice(1) : query);
    params.set('limit', String(limit));
    return this.api.get<OpeningAnalysisTopGamesResponse>(`/opening-analysis/top-games?${params.toString()}`);
  }
}
