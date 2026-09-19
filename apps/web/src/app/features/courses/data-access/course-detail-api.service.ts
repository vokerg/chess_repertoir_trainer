import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type { CreateCourseInput, LibraryCatalog, UpdateCourse } from '@chess-trainer/contracts/courses';
import { ApiService } from '../../../core/api/api.service';
import { CourseChapter, CourseDetail, CourseOverview, CourseStats } from './course-detail.models';

@Injectable()
export class CourseDetailApiService {
  private readonly api = inject(ApiService);

  getCourses(): Observable<CourseDetail[]> {
    return this.api.get<CourseDetail[]>('/courses');
  }

  getCatalog(): Observable<LibraryCatalog> {
    return this.api.get<LibraryCatalog>('/library/catalog');
  }

  createCourse(body: CreateCourseInput): Observable<CourseDetail> {
    return this.api.post<CourseDetail>('/courses', body);
  }

  getCourse(courseId: number): Observable<CourseDetail> {
    return this.api.get<CourseDetail>(`/courses/${courseId}`);
  }

  getOverview(courseId: number): Observable<CourseOverview> {
    return this.api.get<CourseOverview>(`/courses/${courseId}/overview`);
  }

  getStats(courseId: number): Observable<CourseStats> {
    return this.api.get<CourseStats>(`/courses/${courseId}/stats`);
  }

  getChapters(courseId: number): Observable<CourseChapter[]> {
    return this.api.get<CourseChapter[]>(`/courses/${courseId}/chapters`);
  }

  createChapter(courseId: number, body: { name: string; description: string | null }): Observable<CourseChapter> {
    return this.api.post<CourseChapter>(`/courses/${courseId}/chapters`, body);
  }

  updateCourse(courseId: number, body: UpdateCourse): Observable<CourseDetail> {
    return this.api.patch<CourseDetail>(`/courses/${courseId}`, body);
  }

  renameChapter(chapterId: number, name: string): Observable<CourseChapter> {
    return this.api.patch<CourseChapter>(`/chapters/${chapterId}`, { name });
  }

  deleteChapter(chapterId: number): Observable<void> {
    return this.api.delete<void>(`/chapters/${chapterId}`);
  }

  deleteCourse(courseId: number): Observable<void> {
    return this.api.delete<void>(`/courses/${courseId}`);
  }
}
