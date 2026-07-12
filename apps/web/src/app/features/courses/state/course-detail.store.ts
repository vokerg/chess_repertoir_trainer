import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { CourseDetailApiService } from '../data-access/course-detail-api.service';
import { CourseChapter, CourseDetail, CourseStats } from '../data-access/course-detail.models';
import { AvailableSubline } from '../data-access/sublines/sublines.models';

@Injectable()
export class CourseDetailStore {
  private readonly api = inject(CourseDetailApiService);
  private readonly router = inject(Router);
  private requestVersion = 0;

  readonly courseId = signal<number | null>(null);
  readonly course = signal<CourseDetail | null>(null);
  readonly stats = signal<CourseStats | null>(null);
  readonly chapters = signal<CourseChapter[]>([]);
  readonly sublines = signal<AvailableSubline[]>([]);
  readonly sublinesLoading = signal(false);
  readonly sublinesError = signal<string | null>(null);
  readonly newChapterName = signal('');
  readonly newChapterDescription = signal<string | null>(null);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly editingCourseName = signal(false);
  readonly courseNameDraft = signal('');
  readonly savingCourseName = signal(false);
  readonly editingChapterId = signal<number | null>(null);
  readonly chapterNameDraft = signal('');
  readonly savingChapterId = signal<number | null>(null);
  readonly deletingCourse = signal(false);
  readonly deletingChapterId = signal<number | null>(null);
  readonly error = signal<string | null>(null);

  initialize(courseId: number): void {
    if (!Number.isFinite(courseId) || courseId <= 0) {
      this.error.set('Invalid course id.');
      return;
    }
    this.courseId.set(courseId);
    void this.loadCoursePage();
  }

  async loadCoursePage(): Promise<void> {
    const courseId = this.courseId();
    if (!courseId) return;
    const version = ++this.requestVersion;
    this.loading.set(true);
    this.sublinesLoading.set(true);
    this.error.set(null);
    this.sublinesError.set(null);
    const overviewResult = await Promise.allSettled([firstValueFrom(this.api.getOverview(courseId))]);
    if (version !== this.requestVersion) return;
    const result = overviewResult[0];
    if (result.status === 'fulfilled') {
      this.course.set(result.value.course);
      this.stats.set(result.value.stats);
      this.chapters.set(result.value.chapters);
      this.sublines.set(result.value.sublines);
      if (!this.editingCourseName()) this.courseNameDraft.set(result.value.course.name);
    } else {
      this.course.set(null);
      this.stats.set(null);
      this.chapters.set([]);
      this.sublines.set([]);
      this.error.set(readError(result.reason, 'Could not load course.'));
    }
    this.loading.set(false);
    this.sublinesLoading.set(false);
  }

  async createChapter(): Promise<void> {
    const courseId = this.courseId();
    const name = this.newChapterName().trim();
    if (!courseId || !name) return;
    this.saving.set(true);
    this.error.set(null);
    try {
      const chapter = await firstValueFrom(
        this.api.createChapter(courseId, { name, description: this.newChapterDescription()?.trim() || null }),
      );
      this.chapters.update((chapters) => [...chapters, chapter].sort((a, b) => a.sortOrder - b.sortOrder));
      this.newChapterName.set('');
      this.newChapterDescription.set(null);
      void this.refreshStats();
    } catch (error) {
      this.error.set(readError(error, 'Could not create chapter.'));
    } finally {
      this.saving.set(false);
    }
  }

  startCourseEdit(): void {
    const course = this.course();
    if (!course) return;
    this.editingCourseName.set(true);
    this.courseNameDraft.set(course.name);
  }

  cancelCourseEdit(): void {
    this.editingCourseName.set(false);
    this.courseNameDraft.set(this.course()?.name || '');
  }

  async saveCourseName(): Promise<void> {
    const courseId = this.courseId();
    const name = this.courseNameDraft().trim();
    if (!courseId || !name || !this.course()) return;
    this.savingCourseName.set(true);
    this.error.set(null);
    try {
      const course = await firstValueFrom(this.api.renameCourse(courseId, name));
      this.course.set(course);
      this.courseNameDraft.set(course.name);
      this.editingCourseName.set(false);
    } catch (error) {
      this.error.set(readError(error, 'Could not rename course.'));
    } finally {
      this.savingCourseName.set(false);
    }
  }

  startChapterEdit(chapter: CourseChapter): void {
    this.editingChapterId.set(chapter.id);
    this.chapterNameDraft.set(chapter.name);
  }

  cancelChapterEdit(): void {
    this.editingChapterId.set(null);
    this.chapterNameDraft.set('');
  }

  async saveChapterName(chapter: CourseChapter): Promise<void> {
    const name = this.chapterNameDraft().trim();
    if (!name) return;
    this.savingChapterId.set(chapter.id);
    this.error.set(null);
    try {
      const updated = await firstValueFrom(this.api.renameChapter(chapter.id, name));
      this.chapters.update((chapters) => chapters.map((item) => (item.id === chapter.id ? { ...item, ...updated } : item)));
      this.cancelChapterEdit();
    } catch (error) {
      this.error.set(readError(error, 'Could not rename chapter.'));
    } finally {
      this.savingChapterId.set(null);
    }
  }

  async deleteChapter(chapter: CourseChapter): Promise<void> {
    this.deletingChapterId.set(chapter.id);
    this.error.set(null);
    try {
      await firstValueFrom(this.api.deleteChapter(chapter.id));
      this.chapters.update((chapters) => chapters.filter((item) => item.id !== chapter.id));
      void this.refreshStats();
    } catch (error) {
      this.error.set(readError(error, 'Could not delete chapter.'));
    } finally {
      this.deletingChapterId.set(null);
    }
  }

  async deleteCourse(): Promise<void> {
    const courseId = this.courseId();
    if (!courseId) return;
    this.deletingCourse.set(true);
    this.error.set(null);
    try {
      await firstValueFrom(this.api.deleteCourse(courseId));
      await this.router.navigate(['/courses']);
    } catch (error) {
      this.error.set(readError(error, 'Could not delete course.'));
      this.deletingCourse.set(false);
    }
  }

  private async refreshStats(): Promise<void> {
    const courseId = this.courseId();
    if (!courseId) return;
    try {
      this.stats.set(await firstValueFrom(this.api.getStats(courseId)));
    } catch {
      this.stats.set(null);
    }
  }
}

function readError(error: unknown, fallback: string): string {
  const response = error as { error?: { message?: string; error?: string } };
  return response?.error?.message || response?.error?.error || fallback;
}
