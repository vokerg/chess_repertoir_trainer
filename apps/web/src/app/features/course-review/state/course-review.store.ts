import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { CourseReviewApiService } from '../data-access/course-review-api.service';
import { CourseReviewResponse } from '../data-access/course-review.models';

function localDate(daysFromToday = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

@Injectable()
export class CourseReviewStore {
  private readonly api = inject(CourseReviewApiService);
  private readonly courseId = signal<number | null>(null);
  private requestVersion = 0;

  readonly from = signal(localDate(-7));
  readonly to = signal('');
  readonly minCoveredPlies = signal(2);
  readonly review = signal<CourseReviewResponse | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly course = computed(() => this.review()?.course ?? null);
  readonly summary = computed(() => this.review()?.summary ?? null);
  readonly canReview = computed(() => {
    const from = this.from();
    const to = this.to();
    return Boolean(from) && (!to || to >= from) && !this.loading();
  });

  initialize(courseId: number): void {
    if (!Number.isInteger(courseId) || courseId <= 0) {
      this.error.set('Invalid course id.');
      return;
    }
    this.courseId.set(courseId);
    void this.loadReview();
  }

  setFrom(value: string): void {
    this.from.set(value);
  }

  setTo(value: string): void {
    this.to.set(value);
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
          from: this.from(),
          to: this.to() || undefined,
          limit: 100,
          offset: 0,
          minCoveredPlies: this.minCoveredPlies(),
        }),
      );
      if (requestVersion !== this.requestVersion) return;
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
