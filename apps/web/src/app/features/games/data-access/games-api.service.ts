import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import {
  BatchAnalysisAcceptedResponse,
  BatchAnalysisConfig,
  GameTagDefinitionsResponse,
  ImportedGameAnalysisSummary,
  ImportedGameAnalysisResponse,
  ImportedGameDetail,
  ImportedGameFacetsResponse,
  ImportedGameFullRefreshAcceptedResponse,
  ImportedGamePlyIndexResult,
  ImportedGameSearchResponse,
  ImportedGameTagsRefreshResponse,
} from './games.models';
import { GameFilters } from '../../../shared/games/filters/game-filter.model';
import { mapGameFiltersToQueryString } from '../../../shared/games/filters/game-filter-query.mapper';

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

  getGameTagDefinitions(): Observable<GameTagDefinitionsResponse> {
    return this.api.get<GameTagDefinitionsResponse>('/imported-games/tag-definitions');
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

  refreshGameTags(gameId: number): Observable<ImportedGameTagsRefreshResponse> {
    return this.api.post<ImportedGameTagsRefreshResponse>(`/imported-games/${gameId}/tags/refresh`, {});
  }

  fullRefreshGame(gameId: number): Observable<ImportedGameFullRefreshAcceptedResponse> {
    return this.api.post<ImportedGameFullRefreshAcceptedResponse>(
      `/imported-games/${gameId}/full-refresh-runs`,
      {},
    );
  }
}
