import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import { ImportedGameFacetsResponse } from '../game.models';
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
