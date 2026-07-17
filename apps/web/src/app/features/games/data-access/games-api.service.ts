import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import { GameFilters } from '../../../shared/games/filters/game-filter.model';
import { mapGameFiltersToQueryString } from '../../../shared/games/filters/game-filter-query.mapper';
import {
  GameTagDefinitionsResponse,
  ImportedGameAnalysisResponse,
  ImportedGameDetail,
  ImportedGameFacetsResponse,
  ImportedGameSearchResponse,
} from './games.models';

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
    return this.api.get<ImportedGameSearchResponse>(
      `/imported-games${mapGameFiltersToQueryString(filters, cursor)}`,
    );
  }
}
