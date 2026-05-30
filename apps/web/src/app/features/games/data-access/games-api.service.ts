import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../services/api.service';
import {
  ImportedGameAnalysisSummary,
  ImportedGameFacetsResponse,
  ImportedGamePlyIndexResult,
  ImportedGameSearchResponse,
  StartImportedGameAnalysisResponse,
} from './games.models';
import { GameFilters } from '../filters/game-filter.model';
import { mapGameFiltersToQueryString } from '../filters/game-filter-query.mapper';

@Injectable({ providedIn: 'root' })
export class GamesApiService {
  private readonly api = inject(ApiService);

  getFacets(): Observable<ImportedGameFacetsResponse> {
    return this.api.get<ImportedGameFacetsResponse>('/imported-games/facets');
  }

  searchGames(filters: GameFilters, cursor?: string | null): Observable<ImportedGameSearchResponse> {
    return this.api.get<ImportedGameSearchResponse>(`/imported-games${mapGameFiltersToQueryString(filters, cursor)}`);
  }

  startAnalysis(gameId: number, force = false): Observable<StartImportedGameAnalysisResponse> {
    return this.api.post<StartImportedGameAnalysisResponse>(`/imported-games/${gameId}/analysis-runs`, force ? { force: true } : {});
  }

  indexPlies(gameId: number, force = false): Observable<ImportedGamePlyIndexResult> {
    return this.api.post<ImportedGamePlyIndexResult>(`/imported-games/${gameId}/ply-index`, force ? { force: true } : {});
  }
}
