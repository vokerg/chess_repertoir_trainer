import { Injectable, inject } from '@angular/core';
import type {
  CandidateDecisionRequest,
  CandidateDecisionResponse,
} from '@chess-trainer/contracts/candidate-decision';
import type {
  BuilderCourseReintegrationApplyRequest,
  BuilderCourseReintegrationApplyResponse,
  BuilderCourseReintegrationPreviewRequest,
  BuilderCourseReintegrationPreviewResponse,
  Chapter,
} from '@chess-trainer/contracts/courses';
import type {
  LichessGamesRatingGroup,
  LichessGamesRatingTarget,
  LichessGamesSpeedPreset,
  OpeningExplorerResponse,
} from '@chess-trainer/contracts/opening-explorer';
import type { Observable } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';

export interface RepertoireBuilderCourseOption {
  id: number;
  name: string;
}

export type RepertoireBuilderChapterOption = Pick<Chapter, 'id' | 'courseId' | 'name' | 'sortOrder'>;

@Injectable()
export class RepertoireBuilderApiService {
  private readonly api = inject(ApiService);

  getCandidates(request: CandidateDecisionRequest): Observable<CandidateDecisionResponse> {
    return this.api.post<CandidateDecisionResponse>('/candidate-decisions', request);
  }

  getPopulation(input: {
    fen: string;
    speedPreset: LichessGamesSpeedPreset;
    ratingTarget: LichessGamesRatingTarget;
    ratingGroup: LichessGamesRatingGroup | null;
  }): Observable<OpeningExplorerResponse> {
    const params = new URLSearchParams({
      fen: input.fen,
      speedPreset: input.speedPreset,
      ratingTarget: input.ratingTarget,
    });
    if (input.ratingTarget === 'GROUP' && input.ratingGroup !== null) {
      params.set('ratingGroup', String(input.ratingGroup));
    }
    return this.api.get<OpeningExplorerResponse>(`/lichess-games-explorer?${params.toString()}`);
  }

  listCourses(): Observable<RepertoireBuilderCourseOption[]> {
    return this.api.get<RepertoireBuilderCourseOption[]>('/courses');
  }

  listChapters(courseId: number): Observable<RepertoireBuilderChapterOption[]> {
    return this.api.get<RepertoireBuilderChapterOption[]>(`/courses/${courseId}/chapters`);
  }

  previewCourseOutput(
    chapterId: number,
    request: BuilderCourseReintegrationPreviewRequest,
  ): Observable<BuilderCourseReintegrationPreviewResponse> {
    return this.api.post<BuilderCourseReintegrationPreviewResponse>(
      `/chapters/${chapterId}/builder-course-reintegration/preview`,
      request,
    );
  }

  applyCourseOutput(
    chapterId: number,
    request: BuilderCourseReintegrationApplyRequest,
  ): Observable<BuilderCourseReintegrationApplyResponse> {
    return this.api.post<BuilderCourseReintegrationApplyResponse>(
      `/chapters/${chapterId}/builder-course-reintegration/apply`,
      request,
    );
  }
}
