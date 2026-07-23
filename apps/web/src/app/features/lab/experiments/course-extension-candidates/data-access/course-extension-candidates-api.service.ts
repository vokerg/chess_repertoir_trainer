import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type {
  CourseExtensionCandidatesQuery,
  CourseExtensionCandidatesResponse,
} from '@chess-trainer/contracts/lab';
import { ApiService } from '../../../../../core/api/api.service';
import { appendGameFilterParams } from '../../../../../shared/games/filters/game-filter-query.mapper';
import type { GameFilters } from '../../../../../shared/games/filters/game-filter.model';
import type { ImportedGameFacetsResponse } from '../../../../../shared/games/game.models';

@Injectable()
export class CourseExtensionCandidatesApiService {
  private readonly api = inject(ApiService);

  getCandidates(
    query: Pick<CourseExtensionCandidatesQuery, 'courseId' | 'minGames'>,
    gameFilters: GameFilters,
  ): Observable<CourseExtensionCandidatesResponse> {
    const params = new URLSearchParams({
      courseId: String(query.courseId),
      minGames: String(query.minGames),
    });
    appendGameFilterParams(params, gameFilters);
    return this.api.get<CourseExtensionCandidatesResponse>(
      `/lab/course-extension-candidates?${params.toString()}`,
    );
  }

  getFacets(): Observable<ImportedGameFacetsResponse> {
    return this.api.get<ImportedGameFacetsResponse>('/imported-games/facets');
  }
}
