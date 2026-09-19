import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import { ImportedGameFacetsResponse } from '../../../shared/games/game.models';
import { GameFilters } from '../../../shared/games/filters/game-filter.model';
import { buildOpeningStrugglesQuery } from '../helpers/opening-struggles-query';
import { OpeningStrugglesCriteria, OpeningStrugglesResponse } from './opening-struggles.models';

@Injectable()
export class OpeningStrugglesApiService {
  private readonly api = inject(ApiService);

  getFacets(): Observable<ImportedGameFacetsResponse> {
    return this.api.get<ImportedGameFacetsResponse>('/imported-games/facets');
  }

  getOpeningStruggles(gameFilters: GameFilters, criteria: OpeningStrugglesCriteria): Observable<OpeningStrugglesResponse> {
    return this.api.get<OpeningStrugglesResponse>(`/opening-struggles?${buildOpeningStrugglesQuery(gameFilters, criteria)}`);
  }
}
