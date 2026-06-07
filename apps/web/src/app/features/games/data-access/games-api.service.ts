import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../services/api.service';
import {
  BatchAnalysisAcceptedResponse,
  BatchAnalysisConfig,
  ImportedGameAnalysisSummary,
  ImportedGameAnalysisResponse,
  ImportedGameDetail,
  ImportedGameFacetsResponse,
  ImportedGamePlyIndexResult,
  ImportedGameSearchResponse,
} from './games.models';
import { GameFilters } from '../../../shared/game-filters/game-filter.model';
import { mapGameFiltersToQueryString } from '../../../shared/game-filters/game-filter-query.mapper';

@Injectable({ providedIn: 'root' })
export class GamesApiService {
  private readonly api = inject(ApiService);

  getGame(gameId: number): Observable<ImportedGameDetail> {
    return this.api.get<ImportedGameDetail>(`/imported-games/${gameId}`);
  }

  getAnalysis(gameId: number): Observable<ImportedGameAnalysisResponse> {
    return this.api.get<ImportedGameAnalysisResponse>(`/imported-games/${gameId}/analysis`);
  }

  getFacets(): Observable<ImportedGameFacetsResponse> {
    return this.api.get<ImportedGameFacetsResponse>('/imported-games/facets');
  }

  searchGames(filters: GameFilters, cursor?: string | null): Observable<ImportedGameSearchResponse> {
    return this.api.get<ImportedGameSearchResponse>(`/imported-games${mapGameFiltersToQueryString(filters, cursor)}`);
  }

  getBatchAnalysisConfig(): Observable<BatchAnalysisConfig> {
    return this.api.get<BatchAnalysisConfig>('/imported-games/batch-analysis/config');
  }

  startBatchAnalysis(gameIds: number[]): Observable<BatchAnalysisAcceptedResponse> {
    return this.api.post<BatchAnalysisAcceptedResponse>('/imported-games/batch-analysis-runs', { gameIds });
  }

  startAnalysis(gameId: number, force = false): Observable<ImportedGameAnalysisSummary> {
    return this.api.post<ImportedGameAnalysisSummary>(`/imported-games/${gameId}/analysis-runs`, force ? { force: true } : {});
  }

  indexPlies(gameId: number, force = false): Observable<ImportedGamePlyIndexResult> {
    return this.api.post<ImportedGamePlyIndexResult>(`/imported-games/${gameId}/ply-index`, force ? { force: true } : {});
  }
}
