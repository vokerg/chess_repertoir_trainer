import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../services/api.service';
import { CourseReviewResponse } from './course-review.models';

@Injectable({ providedIn: 'root' })
export class CourseReviewApiService {
  private readonly api = inject(ApiService);

  getCourseReview(
    courseId: number,
    params: {
      from: string;
      to?: string;
      limit?: number;
      offset?: number;
      minCoveredPlies?: number;
    },
  ): Observable<CourseReviewResponse> {
    const query = new URLSearchParams();
    query.set('from', params.from);
    if (params.to) query.set('to', params.to);
    if (params.limit !== undefined) query.set('limit', String(params.limit));
    if (params.offset !== undefined) query.set('offset', String(params.offset));
    if (params.minCoveredPlies !== undefined) {
      query.set('minCoveredPlies', String(params.minCoveredPlies));
    }
    return this.api.get<CourseReviewResponse>(`/courses/${courseId}/review?${query.toString()}`);
  }
}
