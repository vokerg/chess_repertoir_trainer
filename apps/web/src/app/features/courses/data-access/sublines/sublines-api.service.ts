import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../../core/api/api.service';
import { AvailableSubline } from './sublines.models';

@Injectable({ providedIn: 'root' })
export class SublinesApiService {
  private readonly api = inject(ApiService);

  getCourseSublines(courseId: number): Observable<AvailableSubline[]> {
    return this.api.get<AvailableSubline[]>(`/courses/${courseId}/sublines`);
  }
}
