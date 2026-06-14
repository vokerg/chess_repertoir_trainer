import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ImportedGameFacetsResponse } from '../../../../games/data-access/games.models';
import { GameFilters } from '../../../../../shared/game-filters/game-filter.model';
import { ApiService } from '../../../../../services/api.service';
import { buildOpeningStrugglesQuery } from '../helpers/opening-struggles-query';
import { OpeningStrugglesCriteria, OpeningStrugglesResponse } from './opening-struggles.models';

@Injectable()
export class OpeningStrugglesApiService {
  private readonly api = inject(ApiService);

  getFacets(): Observable<ImportedGameFacetsResponse> {
    return this.api.get<ImportedGameFacetsResponse>('/imported-games/facets');
  }

  getOpeningStruggles(gameFilters: GameFilters, criteria: OpeningStrugglesCriteria): Observable<OpeningStrugglesResponse> {
    return this.api.get<OpeningStrugglesResponse>(`/lab/opening-struggles?${buildOpeningStrugglesQuery(gameFilters, criteria)}`);
  }
}
