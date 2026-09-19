import { computed, inject, Injectable, signal, type WritableSignal } from '@angular/core';
import type { CourseExtensionCandidatesResponse } from '@chess-trainer/contracts/lab';
import { firstValueFrom } from 'rxjs';
import { emptyImportedGameFacets, ImportedGameFacetsResponse } from '../../../shared/games/game.models';
import { defaultGameFilters, GameFilters } from '../../../shared/games/filters/game-filter.model';
import { gameFilterPeriodRange } from '../../../shared/games/filters/game-filter-period';
import { summaryGameFilters } from '../../../shared/games/filters/game-filter-summary';
import { CourseReviewApiService } from '../data-access/course-review-api.service';
import { CourseReviewResponse } from '../data-access/course-review.models';
import {
  mapCourseExtensionCandidate,
  mapCourseReviewGroup,
} from '../helpers/course-review-finding.mapper';
import type { CourseReviewMode } from '../helpers/course-review-mode';

export interface CourseReviewCourseSummary {
  id: number;
  name: string;
  description: string | null;
  sideToTrain: 'WHITE' | 'BLACK' | null;
  hasMixedSides: boolean;
  lineCount: number;
  moveCount: number | null;
}

type FindingReviewMode = Exclude<CourseReviewMode, 'COURSE_ENDINGS'>;

export function defaultCourseReviewGameFilters(): GameFilters {
  return { ...defaultGameFilters(), ...gameFilterPeriodRange('1M') };
}

@Injectable()
export class CourseReviewStore {
  private readonly api = inject(CourseReviewApiService);
  private readonly courseId = signal<number | null>(null);
  private readonly appliedGameFilters = signal(defaultCourseReviewGameFilters());
  private readonly appliedMinCoveredPlies = signal(2);
  private readonly appliedMinGames = signal(4);
  private readonly reviewRequestVersions: Record<FindingReviewMode, number> = {
    MY_DEVIATIONS: 0,
    OPPONENT_GAPS: 0,
  };
  private endingsRequestVersion = 0;
  private facetsLoaded = false;

  readonly activeMode = signal<CourseReviewMode>('MY_DEVIATIONS');
  readonly course = signal<CourseReviewCourseSummary | null>(null);
  readonly gameFilters = signal(defaultCourseReviewGameFilters());
  readonly facets = signal<ImportedGameFacetsResponse>(emptyImportedGameFacets());
  readonly filtersCollapsed = signal(true);
  readonly minCoveredPlies = signal(2);
  readonly minGames = signal(4);
  readonly myDeviationsReview = signal<CourseReviewResponse | null>(null);
  readonly opponentGapsReview = signal<CourseReviewResponse | null>(null);
  readonly endings = signal<CourseExtensionCandidatesResponse | null>(null);
  readonly myDeviationsLoading = signal(false);
  readonly opponentGapsLoading = signal(false);
  readonly endingsLoading = signal(false);
  readonly myDeviationsError = signal<string | null>(null);
  readonly opponentGapsError = signal<string | null>(null);
  readonly endingsError = signal<string | null>(null);
  private readonly reviews: Record<FindingReviewMode, WritableSignal<CourseReviewResponse | null>> = {
    MY_DEVIATIONS: this.myDeviationsReview,
    OPPONENT_GAPS: this.opponentGapsReview,
  };
  private readonly reviewLoadings: Record<FindingReviewMode, WritableSignal<boolean>> = {
    MY_DEVIATIONS: this.myDeviationsLoading,
    OPPONENT_GAPS: this.opponentGapsLoading,
  };
  private readonly reviewErrors: Record<FindingReviewMode, WritableSignal<string | null>> = {
    MY_DEVIATIONS: this.myDeviationsError,
    OPPONENT_GAPS: this.opponentGapsError,
  };

  readonly filterSummary = computed(() => summaryGameFilters(this.gameFilters()));
  readonly lockedUserColor = computed(() => {
    const course = this.course();
    return course && !course.hasMixedSides ? course.sideToTrain : null;
  });
  readonly filtersValid = computed(() => {
    const { from, to } = this.gameFilters();
    return Boolean(from) && (!to || to >= from);
  });
  readonly review = computed(() => {
    const mode = this.activeMode();
    return mode === 'COURSE_ENDINGS' ? null : this.reviews[mode]();
  });
  readonly reviewLoading = computed(() => {
    const mode = this.activeMode();
    return mode === 'COURSE_ENDINGS' ? false : this.reviewLoadings[mode]();
  });
  readonly loading = computed(() => {
    const mode = this.activeMode();
    return mode === 'COURSE_ENDINGS' ? this.endingsLoading() : this.reviewLoadings[mode]();
  });
  readonly error = computed(() => {
    const mode = this.activeMode();
    return mode === 'COURSE_ENDINGS' ? this.endingsError() : this.reviewErrors[mode]();
  });
  readonly canLoad = computed(() => Boolean(this.courseId()) && this.filtersValid() && !this.loading());
  readonly myDeviationFindings = computed(() =>
    (this.myDeviationsReview()?.myDeviations ?? []).map((group) =>
      mapCourseReviewGroup(group, 'MY_DEVIATION'),
    ),
  );
  readonly opponentGapFindings = computed(() =>
    (this.opponentGapsReview()?.opponentUncovered ?? []).map((group) =>
      mapCourseReviewGroup(group, 'OPPONENT_GAP'),
    ),
  );
  readonly courseEndingFindings = computed(() =>
    (this.endings()?.items ?? []).map(mapCourseExtensionCandidate),
  );
  readonly activeFindings = computed(() => {
    switch (this.activeMode()) {
      case 'MY_DEVIATIONS':
        return this.myDeviationFindings();
      case 'OPPONENT_GAPS':
        return this.opponentGapFindings();
      case 'COURSE_ENDINGS':
        return this.courseEndingFindings();
    }
  });

  initialize(courseId: number, mode: CourseReviewMode): void {
    this.activeMode.set(mode);
    if (!Number.isInteger(courseId) || courseId <= 0) {
      if (mode === 'COURSE_ENDINGS') this.endingsError.set('Invalid course id.');
      else this.reviewErrors[mode].set('Invalid course id.');
      return;
    }

    if (this.courseId() !== courseId) {
      this.resetForCourse();
      this.courseId.set(courseId);
    }

    this.loadFacets();
    void this.ensureActiveLoaded();
  }

  setGameFilters(filters: GameFilters): void {
    const lockedUserColor = this.lockedUserColor();
    this.gameFilters.set(lockedUserColor ? { ...filters, userColor: lockedUserColor } : filters);
  }

  resetFilters(): void {
    const filters = defaultCourseReviewGameFilters();
    const lockedUserColor = this.lockedUserColor();
    this.gameFilters.set(lockedUserColor ? { ...filters, userColor: lockedUserColor } : filters);
    this.minCoveredPlies.set(2);
    this.minGames.set(4);
    this.applyFilters();
  }

  toggleFilters(): void {
    this.filtersCollapsed.update((collapsed) => !collapsed);
  }

  setMinCoveredPlies(value: string | number): void {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return;
    this.minCoveredPlies.set(Math.max(0, Math.min(20, Math.trunc(parsed))));
  }

  setMinGames(value: string | number): void {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return;
    this.minGames.set(Math.max(1, Math.min(1000, Math.trunc(parsed))));
  }

  applyFilters(): void {
    this.appliedGameFilters.set(this.gameFilters());
    this.appliedMinCoveredPlies.set(this.minCoveredPlies());
    this.appliedMinGames.set(this.minGames());
    this.invalidateReview();
    this.invalidateEndings();
    void this.ensureActiveLoaded();
  }

  private async ensureActiveLoaded(): Promise<void> {
    if (this.activeMode() === 'COURSE_ENDINGS') {
      if (!this.endings()) await this.loadEndings();
      return;
    }
    const mode = this.activeMode();
    if (mode !== 'COURSE_ENDINGS' && !this.reviews[mode]()) await this.loadReview(mode);
  }

  private loadFacets(): void {
    if (this.facetsLoaded) return;
    this.facetsLoaded = true;
    this.api.getFacets().subscribe({
      next: (facets) => this.facets.set(facets),
      error: () => {
        this.facetsLoaded = false;
      },
    });
  }

  private async loadReview(mode: FindingReviewMode): Promise<void> {
    const courseId = this.courseId();
    const loading = this.reviewLoadings[mode];
    const error = this.reviewErrors[mode];
    const report = this.reviews[mode];
    if (!courseId || !this.filtersValid() || loading()) return;

    const requestVersion = ++this.reviewRequestVersions[mode];
    loading.set(true);
    error.set(null);

    try {
      const review = await firstValueFrom(
        this.api.getCourseReview(courseId, {
          gameFilters: this.appliedGameFilters(),
          limit: 100,
          offset: 0,
          minCoveredPlies: this.appliedMinCoveredPlies(),
          findingType: mode,
        }),
      );
      if (requestVersion !== this.reviewRequestVersions[mode]) return;

      this.course.set({
        id: review.course.id,
        name: review.course.name,
        description: review.course.description,
        sideToTrain: review.course.sideToTrain,
        hasMixedSides: review.course.hasMixedSides,
        lineCount: review.course.lineCount,
        moveCount: review.course.moveCount,
      });

      if (review.course.sideToTrain && !review.course.hasMixedSides) {
        const sideToTrain = review.course.sideToTrain;
        if (this.gameFilters().userColor !== sideToTrain) {
          this.gameFilters.update((filters) => ({ ...filters, userColor: sideToTrain }));
        }
        if (this.appliedGameFilters().userColor !== sideToTrain) {
          this.appliedGameFilters.update((filters) => ({ ...filters, userColor: sideToTrain }));
        }
      }

      report.set(review);
    } catch (requestError) {
      if (requestVersion !== this.reviewRequestVersions[mode]) return;
      error.set(readCourseReviewError(requestError));
    } finally {
      if (requestVersion === this.reviewRequestVersions[mode]) loading.set(false);
    }
  }

  private async loadEndings(): Promise<void> {
    const courseId = this.courseId();
    if (!courseId || !this.filtersValid() || this.endingsLoading()) return;

    const requestVersion = ++this.endingsRequestVersion;
    this.endingsLoading.set(true);
    this.endingsError.set(null);

    try {
      const report = await firstValueFrom(
        this.api.getCourseEndings(courseId, this.appliedMinGames(), this.appliedGameFilters()),
      );
      if (requestVersion !== this.endingsRequestVersion) return;

      const existingCourse = this.course();
      this.course.set({
        id: report.course.id,
        name: report.course.name,
        description: report.course.description,
        sideToTrain: existingCourse?.id === report.course.id ? existingCourse.sideToTrain : null,
        hasMixedSides: existingCourse?.id === report.course.id ? existingCourse.hasMixedSides : false,
        lineCount: report.course.lineCount,
        moveCount: existingCourse?.id === report.course.id ? existingCourse.moveCount : null,
      });
      this.endings.set(report);
    } catch (error) {
      if (requestVersion !== this.endingsRequestVersion) return;
      this.endingsError.set(readCourseReviewError(error));
    } finally {
      if (requestVersion === this.endingsRequestVersion) this.endingsLoading.set(false);
    }
  }

  private invalidateReview(): void {
    for (const mode of ['MY_DEVIATIONS', 'OPPONENT_GAPS'] as const) {
      this.reviewRequestVersions[mode] += 1;
      this.reviews[mode].set(null);
      this.reviewErrors[mode].set(null);
      this.reviewLoadings[mode].set(false);
    }
  }

  private invalidateEndings(): void {
    this.endingsRequestVersion += 1;
    this.endings.set(null);
    this.endingsError.set(null);
    this.endingsLoading.set(false);
  }

  private resetForCourse(): void {
    const filters = defaultCourseReviewGameFilters();
    this.reviewRequestVersions.MY_DEVIATIONS += 1;
    this.reviewRequestVersions.OPPONENT_GAPS += 1;
    this.endingsRequestVersion += 1;
    this.course.set(null);
    this.myDeviationsReview.set(null);
    this.opponentGapsReview.set(null);
    this.endings.set(null);
    this.gameFilters.set(filters);
    this.appliedGameFilters.set(filters);
    this.minCoveredPlies.set(2);
    this.appliedMinCoveredPlies.set(2);
    this.minGames.set(4);
    this.appliedMinGames.set(4);
    this.filtersCollapsed.set(true);
    this.myDeviationsLoading.set(false);
    this.opponentGapsLoading.set(false);
    this.endingsLoading.set(false);
    this.myDeviationsError.set(null);
    this.opponentGapsError.set(null);
    this.endingsError.set(null);
  }
}

function readCourseReviewError(error: unknown): string {
  if (typeof error === 'object' && error !== null) {
    const response = error as { error?: { message?: string; error?: string }; message?: string };
    return (
      response.error?.message ||
      response.error?.error ||
      response.message ||
      'Could not load course review.'
    );
  }
  return 'Could not load course review.';
}
