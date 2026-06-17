import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { CourseReviewApiService } from '../data-access/course-review-api.service';
import { CourseReviewResponse } from '../data-access/course-review.models';
import { ImportedGameFacetsResponse } from '../../../shared/games/game.models';
import { defaultGameFilters, GameFilters } from '../../../shared/games/filters/game-filter.model';
import { summaryGameFilters } from '../../../shared/games/filters/game-filter-summary';

function localDate(daysFromToday = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

export function defaultCourseReviewGameFilters(): GameFilters {
  return { ...defaultGameFilters(), from: localDate(-7) };
}

@Injectable()
export class CourseReviewStore {
  private readonly api = inject(CourseReviewApiService);
  private readonly courseId = signal<number | null>(null);
  private requestVersion = 0;

  readonly gameFilters = signal(defaultCourseReviewGameFilters());
  readonly facets = signal<ImportedGameFacetsResponse>({});
  readonly filtersCollapsed = signal(true);
  readonly minCoveredPlies = signal(2);
  readonly review = signal<CourseReviewResponse | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly course = computed(() => this.review()?.course ?? null);
  readonly summary = computed(() => this.review()?.summary ?? null);
  readonly filterSummary = computed(() => summaryGameFilters(this.gameFilters()));
  readonly lockedUserColor = computed(() => {
    const course = this.course();
    return course && !course.hasMixedSides ? course.sideToTrain : null;
  });
  readonly canReview = computed(() => {
    const { from, to } = this.gameFilters();
    return Boolean(from) && (!to || to >= from) && !this.loading();
  });

  initialize(courseId: number): void {
    if (!Number.isInteger(courseId) || courseId <= 0) {
      this.error.set('Invalid course id.');
      return;
    }
    if (this.courseId() !== courseId) {
      this.review.set(null);
      this.gameFilters.set(defaultCourseReviewGameFilters());
      this.minCoveredPlies.set(2);
      this.filtersCollapsed.set(true);
    }
    this.courseId.set(courseId);
    this.loadFacets();
    void this.loadReview();
  }

  setGameFilters(filters: GameFilters): void {
    const lockedUserColor = this.lockedUserColor();
    this.gameFilters.set(lockedUserColor ? { ...filters, userColor: lockedUserColor } : filters);
  }

  resetGameFilters(): void {
    const filters = defaultCourseReviewGameFilters();
    const lockedUserColor = this.lockedUserColor();
    this.gameFilters.set(lockedUserColor ? { ...filters, userColor: lockedUserColor } : filters);
    void this.loadReview();
  }

  toggleFilters(): void {
    this.filtersCollapsed.update((collapsed) => !collapsed);
  }

  loadFacets(): void {
    this.api.getFacets().subscribe({
      next: (facets) => this.facets.set(facets || {}),
    });
  }

  setMinCoveredPlies(value: string | number): void {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return;
    this.minCoveredPlies.set(Math.max(0, Math.min(20, Math.trunc(parsed))));
  }

  async loadReview(): Promise<void> {
    const courseId = this.courseId();
    if (!courseId || !this.canReview()) return;

    const requestVersion = ++this.requestVersion;
    this.loading.set(true);
    this.error.set(null);

    try {
      const review = await firstValueFrom(
        this.api.getCourseReview(courseId, {
          gameFilters: this.gameFilters(),
          limit: 100,
          offset: 0,
          minCoveredPlies: this.minCoveredPlies(),
        }),
      );
      if (requestVersion !== this.requestVersion) return;
      if (review.course.sideToTrain && !review.course.hasMixedSides) {
        this.gameFilters.update((filters) => ({
          ...filters,
          userColor: review.course.sideToTrain!,
        }));
      }
      this.review.set(review);
    } catch (error) {
      if (requestVersion !== this.requestVersion) return;
      this.error.set(readCourseReviewError(error));
    } finally {
      if (requestVersion === this.requestVersion) this.loading.set(false);
    }
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
