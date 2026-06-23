import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import { CoursePositionSuggestionsResponse } from './course-position-suggestions.models';

@Injectable({ providedIn: 'root' })
export class CoursePositionSuggestionsApiService {
  private readonly api = inject(ApiService);

  listForFen(fen: string): Observable<CoursePositionSuggestionsResponse> {
    return this.api.get<CoursePositionSuggestionsResponse>(
      `/courses/position-suggestions?fen=${encodeURIComponent(fen)}`,
    );
  }
}
