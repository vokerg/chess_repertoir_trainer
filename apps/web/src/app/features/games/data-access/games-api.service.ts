import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import {
  BatchAnalysisAcceptedResponse,
  BatchAnalysisConfig,
  GameTagDefinitionsResponse,
  ImportedGameAnalysisResponse,
  ImportedGameDetail,
  ImportedGameFacetsResponse,
  ImportedGameFullRefreshAcceptedResponse,
  ImportedGameIndexWorkflowResult,
  ImportedGameSearchResponse,
  ImportedGameTagsRefreshResponse,
} from './games.models';
import {
  serializeImportedGameSearchQuery,
  type ImportedGameSearchCriteria,
} from '../../../shared/games/filters/imported-game-search-query.codec';

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

  searchGames(
    criteria: ImportedGameSearchCriteria,
    cursor?: string | null,
  ): Observable<ImportedGameSearchResponse> {
    const params = serializeImportedGameSearchQuery(criteria, { cursor });
    return this.api.get<ImportedGameSearchResponse>(`/imported-games?${params.toString()}`);
  }

  getBatchAnalysisConfig(): Observable<BatchAnalysisConfig> {
    return this.api.get<BatchAnalysisConfig>('/imported-games/batch-analysis/config');
  }

  startBatchAnalysis(gameIds: number[]): Observable<BatchAnalysisAcceptedResponse> {
    return this.api.post<BatchAnalysisAcceptedResponse>('/imported-games/batch-analysis-runs', { gameIds });
  }

  runIndexWorkflow(gameId: number, force = false): Observable<ImportedGameIndexWorkflowResult> {
    return this.api.post<ImportedGameIndexWorkflowResult>(`/imported-games/${gameId}/ply-index`, force ? { force: true } : {});
  }

  indexPlies(gameId: number, force = false): Observable<ImportedGameIndexWorkflowResult> {
    return this.runIndexWorkflow(gameId, force);
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
