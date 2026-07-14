import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../../../core/api/api.service';
import {
  PerformanceByRatingQuery,
  PerformanceByRatingResponse,
} from './performance-by-rating.models';

@Injectable()
export class PerformanceByRatingApiService {
  private readonly api = inject(ApiService);

  getPerformanceByRating(query: PerformanceByRatingQuery): Observable<PerformanceByRatingResponse> {
    const params = new URLSearchParams({ from: query.from, to: query.to });
    return this.api.get<PerformanceByRatingResponse>(`/lab/performance-by-rating?${params.toString()}`);
  }
}
