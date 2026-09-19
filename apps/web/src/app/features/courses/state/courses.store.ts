import { Injectable, inject, signal } from '@angular/core';
import type { CourseCoverKey, CourseSide, LibraryCatalog } from '@chess-trainer/contracts/courses';
import { firstValueFrom } from 'rxjs';
import { CourseDetailApiService } from '../data-access/course-detail-api.service';
import { defaultCourseCover } from '../helpers/course-presentation';

export type CourseCatalogItem = LibraryCatalog['courses'][number];

@Injectable()
export class CoursesStore {
  private readonly api = inject(CourseDetailApiService);
  readonly courses = signal<CourseCatalogItem[]>([]);
  readonly newCourseName = signal('');
  readonly newCourseDescription = signal<string | null>(null);
  readonly newCourseSide = signal<CourseSide>('WHITE');
  readonly newCourseCoverKey = signal<CourseCoverKey>(defaultCourseCover('WHITE'));
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly deletingId = signal<number | null>(null);
  readonly error = signal<string | null>(null);

  async loadCourses(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.courses.set((await firstValueFrom(this.api.getCatalog())).courses);
    } catch (error) {
      this.error.set(readError(error, 'Could not load courses. Is the API running and seeded?'));
    } finally {
      this.loading.set(false);
    }
  }

  async createCourse(): Promise<void> {
    const name = this.newCourseName().trim();
    if (!name) return;
    this.saving.set(true);
    this.error.set(null);
    try {
      await firstValueFrom(this.api.createCourse({
        name,
        description: this.newCourseDescription()?.trim() || null,
        side: this.newCourseSide(),
        coverKey: this.newCourseCoverKey(),
      }));
      this.newCourseName.set('');
      this.newCourseDescription.set(null);
      await this.loadCourses();
    } catch (error) {
      this.error.set(readError(error, 'Could not create course.'));
    } finally {
      this.saving.set(false);
    }
  }

  setNewCourseSide(side: CourseSide): void {
    this.newCourseSide.set(side);
    this.newCourseCoverKey.set(defaultCourseCover(side));
  }

  async deleteCourse(course: Pick<CourseCatalogItem, 'id' | 'name'>): Promise<void> {
    this.deletingId.set(course.id);
    this.error.set(null);
    try {
      await firstValueFrom(this.api.deleteCourse(course.id));
      this.courses.update((courses) => courses.filter((item) => item.id !== course.id));
    } catch (error) {
      this.error.set(readError(error, 'Could not delete course.'));
    } finally {
      this.deletingId.set(null);
    }
  }
}

function readError(error: unknown, fallback: string): string {
  const response = error as { error?: { message?: string; error?: string } };
  return response?.error?.message || response?.error?.error || fallback;
}
