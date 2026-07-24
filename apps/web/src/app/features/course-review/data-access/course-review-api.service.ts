import { inject, Injectable } from '@angular/core';
import type { CourseExtensionCandidatesResponse } from '@chess-trainer/contracts/lab';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import { appendGameFilterParams } from '../../../shared/games/filters/game-filter-query.mapper';
import { GameFilters } from '../../../shared/games/filters/game-filter.model';
import { ImportedGameFacetsResponse } from '../../../shared/games/game.models';
import { CourseReviewResponse } from './course-review.models';

@Injectable({ providedIn: 'root' })
export class CourseReviewApiService {
  private readonly api = inject(ApiService);

  getCourseReview(
    courseId: number,
    params: {
      gameFilters: GameFilters;
      limit?: number;
      offset?: number;
      minCoveredPlies?: number;
    },
  ): Observable<CourseReviewResponse> {
    const query = new URLSearchParams();
    appendGameFilterParams(query, params.gameFilters);
    if (params.limit !== undefined) query.set('limit', String(params.limit));
    if (params.offset !== undefined) query.set('offset', String(params.offset));
    if (params.minCoveredPlies !== undefined) {
      query.set('minCoveredPlies', String(params.minCoveredPlies));
    }
    return this.api.get<CourseReviewResponse>(`/courses/${courseId}/review?${query.toString()}`);
  }

  getCourseEndings(
    courseId: number,
    minGames: number,
    gameFilters: GameFilters,
  ): Observable<CourseExtensionCandidatesResponse> {
    const query = new URLSearchParams({
      courseId: String(courseId),
      minGames: String(minGames),
    });
    appendGameFilterParams(query, gameFilters);
    return this.api.get<CourseExtensionCandidatesResponse>(
      `/lab/course-extension-candidates?${query.toString()}`,
    );
  }

  getFacets(): Observable<ImportedGameFacetsResponse> {
    return this.api.get<ImportedGameFacetsResponse>('/imported-games/facets');
  }
}
