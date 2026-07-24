import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';

export interface CourseReviewLauncherCourse {
  id: number;
  name: string;
}

@Injectable()
export class CourseReviewLauncherApiService {
  private readonly api = inject(ApiService);

  getCourses(): Observable<readonly CourseReviewLauncherCourse[]> {
    return this.api.get<readonly CourseReviewLauncherCourse[]>('/courses');
  }
}
