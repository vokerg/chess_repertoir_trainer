import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  CourseReviewLauncherApiService,
  type CourseReviewLauncherCourse,
} from '../data-access/course-review-launcher-api.service';

@Injectable()
export class CourseReviewLauncherStore {
  private readonly api = inject(CourseReviewLauncherApiService);

  readonly courses = signal<readonly CourseReviewLauncherCourse[]>([]);
  readonly courseId = signal<number | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly canOpen = computed(() => Boolean(this.courseId()) && !this.loading());

  async initialize(): Promise<void> {
    if (this.loading() || this.courses().length > 0) return;
    this.loading.set(true);
    this.error.set(null);
    try {
      const courses = await firstValueFrom(this.api.getCourses());
      this.courses.set(courses);
      this.courseId.set(courses[0]?.id ?? null);
    } catch {
      this.error.set('Could not load courses.');
    } finally {
      this.loading.set(false);
    }
  }

  setCourseId(value: number): void {
    this.courseId.set(Number.isInteger(value) && value > 0 ? value : null);
  }
}
