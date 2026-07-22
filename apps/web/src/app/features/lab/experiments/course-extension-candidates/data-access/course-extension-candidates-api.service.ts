import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type {
  CourseExtensionCandidatesQuery,
  CourseExtensionCandidatesResponse,
} from '@chess-trainer/contracts/lab';
import { ApiService } from '../../../../../core/api/api.service';

@Injectable()
export class CourseExtensionCandidatesApiService {
  private readonly api = inject(ApiService);

  getCandidates(query: CourseExtensionCandidatesQuery): Observable<CourseExtensionCandidatesResponse> {
    const params = new URLSearchParams({
      courseId: String(query.courseId),
      minGames: String(query.minGames),
    });
    return this.api.get<CourseExtensionCandidatesResponse>(
      `/lab/course-extension-candidates?${params.toString()}`,
    );
  }
}
