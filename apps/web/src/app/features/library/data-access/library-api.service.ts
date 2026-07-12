import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import { LibraryCatalogResponse, LibraryChapter, LibraryCourse, LibraryCourseStats, LibraryLine } from './library.models';

@Injectable()
export class LibraryApiService {
  private readonly api = inject(ApiService);

  getCatalog(): Observable<LibraryCatalogResponse> {
    return this.api.get<LibraryCatalogResponse>('/library/catalog');
  }

  getCourses(): Observable<LibraryCourse[]> {
    return this.api.get<LibraryCourse[]>('/courses');
  }

  getCourseStats(courseId: number): Observable<LibraryCourseStats> {
    return this.api.get<LibraryCourseStats>(`/courses/${courseId}/stats`);
  }

  getChapters(courseId: number): Observable<LibraryChapter[]> {
    return this.api.get<LibraryChapter[]>(`/courses/${courseId}/chapters`);
  }

  getLines(chapterId: number): Observable<LibraryLine[]> {
    return this.api.get<LibraryLine[]>(`/chapters/${chapterId}/lines`);
  }

  createLine(
    chapterId: number,
    body: { name: string; sideToTrain: 'WHITE' | 'BLACK'; startingFen: string },
  ): Observable<LibraryLine> {
    return this.api.post<LibraryLine>(`/chapters/${chapterId}/lines`, body);
  }

  deleteLine(lineId: number): Observable<void> {
    return this.api.delete<void>(`/lines/${lineId}`);
  }

  exportLinePgn(lineId: number): Observable<{ pgn: string }> {
    return this.api.get<{ pgn: string }>(`/lines/${lineId}/export-pgn`);
  }
}
