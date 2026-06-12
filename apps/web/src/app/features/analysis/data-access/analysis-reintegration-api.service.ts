import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../services/api.service';
import { AnalysisReintegrationApplyRequest, AnalysisReintegrationApplyResponse,
  AnalysisReintegrationPreviewRequest, AnalysisReintegrationPreviewResponse,
  ChapterOption, CourseOption } from './analysis-reintegration.models';

@Injectable()
export class AnalysisReintegrationApiService {
  private readonly api = inject(ApiService);
  getCourses(): Observable<CourseOption[]> { return this.api.get('/courses'); }
  getChapters(courseId: number): Observable<ChapterOption[]> { return this.api.get(`/courses/${courseId}/chapters`); }
  preview(chapterId: number, body: AnalysisReintegrationPreviewRequest): Observable<AnalysisReintegrationPreviewResponse> {
    return this.api.post(`/chapters/${chapterId}/analysis-reintegration/preview`, body);
  }
  apply(chapterId: number, body: AnalysisReintegrationApplyRequest): Observable<AnalysisReintegrationApplyResponse> {
    return this.api.post(`/chapters/${chapterId}/analysis-reintegration/apply`, body);
  }
}
