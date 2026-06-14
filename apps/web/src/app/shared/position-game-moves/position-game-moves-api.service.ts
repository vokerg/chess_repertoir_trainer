import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ImportedGameFacetsResponse } from '../../features/games/data-access/games.models';
import { ApiService } from '../../services/api.service';
import { OpeningAnalysisResponse } from './position-game-moves.models';

@Injectable({ providedIn: 'root' })
export class PositionGameMovesApiService {
  private readonly api = inject(ApiService);

  getFacets(): Observable<ImportedGameFacetsResponse> {
    return this.api.get<ImportedGameFacetsResponse>('/imported-games/facets');
  }

  getAnalysis(query: string): Observable<OpeningAnalysisResponse> {
    return this.api.get<OpeningAnalysisResponse>(`/opening-analysis${query}`);
  }
}
