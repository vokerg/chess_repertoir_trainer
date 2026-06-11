import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { CourseDetailApiService } from '../data-access/course-detail-api.service';
import { CourseDetail } from '../data-access/course-detail.models';

@Injectable()
export class CoursesStore {
  private readonly api = inject(CourseDetailApiService);
  readonly courses = signal<CourseDetail[]>([]);
  readonly newCourseName = signal('');
  readonly newCourseDescription = signal<string | null>(null);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly deletingId = signal<number | null>(null);
  readonly error = signal<string | null>(null);

  async loadCourses(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.courses.set(await firstValueFrom(this.api.getCourses()));
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
      const course = await firstValueFrom(
        this.api.createCourse({ name, description: this.newCourseDescription()?.trim() || null }),
      );
      this.courses.update((courses) => [...courses, course]);
      this.newCourseName.set('');
      this.newCourseDescription.set(null);
    } catch (error) {
      this.error.set(readError(error, 'Could not create course.'));
    } finally {
      this.saving.set(false);
    }
  }

  async deleteCourse(course: CourseDetail): Promise<void> {
    if (!window.confirm(`Delete "${course.name}" and all of its chapters and lines? This cannot be undone.`)) return;
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
