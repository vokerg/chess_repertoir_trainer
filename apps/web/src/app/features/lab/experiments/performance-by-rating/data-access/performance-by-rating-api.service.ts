import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../../../core/api/api.service';
import type {
  PerformanceByRatingQuery,
  PerformanceByRatingResponse,
} from '@chess-trainer/contracts/lab';

@Injectable()
export class PerformanceByRatingApiService {
  private readonly api = inject(ApiService);

  getPerformanceByRating(query: PerformanceByRatingQuery): Observable<PerformanceByRatingResponse> {
    const params = new URLSearchParams();
    if (query.from) params.set('from', query.from);
    if (query.to) params.set('to', query.to);
    if (query.minRating !== undefined) params.set('minRating', String(query.minRating));
    return this.api.get<PerformanceByRatingResponse>(`/lab/performance-by-rating?${params.toString()}`);
  }
}
