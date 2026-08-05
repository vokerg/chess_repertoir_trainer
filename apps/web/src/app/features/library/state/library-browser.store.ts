import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { LibraryApiService } from '../data-access/library-api.service';
import type {
  LibraryChapter,
  LibraryCatalogResponse,
  LibraryCourse,
  LibraryCourseStats,
  LibraryLine,
  LibraryMarathonMode,
  LibraryTrainingScope,
} from '../data-access/library.models';

@Injectable()
export class LibraryBrowserStore {
  private readonly api = inject(LibraryApiService);
  private readonly router = inject(Router);

  readonly courses = signal<LibraryCourse[]>([]);
  private readonly catalog = signal<LibraryCatalogResponse>({ courses: [] });
  readonly chapters = signal<LibraryChapter[]>([]);
  readonly lines = signal<LibraryLine[]>([]);
  readonly selectedCourseId = signal<number | null>(null);
  readonly selectedChapterId = signal<number | null>(null);
  readonly selectedLineIds = signal<number[]>([]);
  readonly marathonMode = signal<LibraryMarathonMode>('ALL');
  readonly trainingScope = signal<LibraryTrainingScope>('COURSE');
  readonly courseLoading = signal(false);
  readonly chapterLoading = signal(false);
  readonly lineLoading = signal(false);
  readonly courseError = signal<string | null>(null);
  readonly chapterError = signal<string | null>(null);
  readonly lineError = signal<string | null>(null);
  readonly searchText = signal('');
  readonly courseStatsById = signal<Record<number, LibraryCourseStats>>({});

  readonly selectedCourse = computed(
    () => this.courses().find((course) => course.id === this.selectedCourseId()) ?? null,
  );
  readonly selectedChapter = computed(
    () => this.chapters().find((chapter) => chapter.id === this.selectedChapterId()) ?? null,
  );
  readonly selectedLines = computed(() => {
    const selectedIds = new Set(this.selectedLineIds());
    return this.lines().filter((line) => selectedIds.has(line.id));
  });
  readonly selectedCourseStats = computed(() => {
    const courseId = this.selectedCourseId();
    return courseId ? this.courseStatsById()[courseId] ?? null : null;
  });
  readonly basketLines = computed(() =>
    this.trainingScope() === 'SELECTED_LINES' ? this.selectedLines() : this.lines(),
  );
  readonly basketActiveSublineCount = computed(() =>
    this.trainingScope() === 'COURSE'
      ? this.selectedCourseStats()?.activeSublineCount ?? 0
      : this.basketLines().reduce(
          (sum, line) => sum + line.trainingStats.activeSublineCount,
          0,
        ),
  );
  readonly basketWeakSublineCount = computed(() =>
    this.trainingScope() === 'COURSE'
      ? this.selectedCourseStats()?.weakSublineCount ?? 0
      : this.basketLines().reduce(
          (sum, line) => sum + line.trainingStats.weakSublineCount,
          0,
        ),
  );
  readonly basketUntrainedSublineCount = computed(() =>
    this.trainingScope() === 'COURSE'
      ? this.selectedCourseStats()?.untrainedSublineCount ?? 0
      : this.basketLines().reduce(
          (sum, line) => sum + line.trainingStats.untrainedSublineCount,
          0,
        ),
  );
  readonly basketSourceLabel = computed(() => {
    if (this.trainingScope() === 'SELECTED_LINES') {
      const count = this.selectedLines().length;
      return `${count} selected ${count === 1 ? 'line' : 'lines'}`;
    }
    if (this.trainingScope() === 'CHAPTER' && this.selectedChapter()) {
      return `Section: ${this.selectedChapter()!.name}`;
    }
    if (this.selectedCourse()) return `Repertoire: ${this.selectedCourse()!.name}`;
    return 'Select training material';
  });
  readonly canUseCourseScope = computed(() => Boolean(this.selectedCourseId()));
  readonly canUseChapterScope = computed(() => Boolean(this.selectedChapterId()));
  readonly canUseSelectedLinesScope = computed(() => this.selectedLineIds().length > 0);
  readonly canStartBasket = computed(() => {
    switch (this.trainingScope()) {
      case 'COURSE':
        return this.canUseCourseScope();
      case 'CHAPTER':
        return this.canUseChapterScope();
      case 'SELECTED_LINES':
        return this.canUseSelectedLinesScope();
    }
  });
  readonly filteredLines = computed(() => {
    const query = this.searchText().trim().toLowerCase();
    return query
      ? this.lines().filter((line) =>
          matches(query, line.name, line.sideToTrain, line.startingFen),
        )
      : this.lines();
  });

  async loadCourses(): Promise<void> {
    this.courseLoading.set(true);
    this.courseError.set(null);
    try {
      const catalog = await firstValueFrom(this.api.getCatalog());
      this.catalog.set(catalog);
      const courses = catalog.courses.map(({ id, name, description }) => ({
        id,
        name,
        description,
      }));
      this.courses.set(courses);
      this.courseStatsById.set(
        Object.fromEntries(catalog.courses.map((course) => [course.id, course.stats])),
      );
      if (!courses.length) {
        this.clearCourseSelection();
        return;
      }
      const selectedId = courses.some((course) => course.id === this.selectedCourseId())
        ? this.selectedCourseId()!
        : courses[0].id;
      await this.selectCourse(selectedId, true);
    } catch (error) {
      this.courseError.set(readError(error, 'Could not load repertoires.'));
    } finally {
      this.courseLoading.set(false);
    }
  }

  async selectCourse(courseId: number, force = false): Promise<void> {
    if (!force && this.selectedCourseId() === courseId) return;
    this.selectedCourseId.set(courseId);
    this.selectedChapterId.set(null);
    this.selectedLineIds.set([]);
    this.trainingScope.set('COURSE');
    this.chapters.set([]);
    this.lines.set([]);
    this.searchText.set('');
    await this.loadChapters(courseId);
  }

  async selectChapter(
    chapterId: number,
    force = false,
    preserveTrainingScope = false,
  ): Promise<void> {
    if (!force && this.selectedChapterId() === chapterId) return;
    this.selectedChapterId.set(chapterId);
    this.selectedLineIds.set([]);
    if (!preserveTrainingScope) this.trainingScope.set('CHAPTER');
    this.lines.set([]);
    this.searchText.set('');
    await this.loadLines(chapterId);
  }

  toggleLineSelection(lineId: number): void {
    const currentIds = this.selectedLineIds();
    const nextIds = currentIds.includes(lineId)
      ? currentIds.filter((id) => id !== lineId)
      : [...currentIds, lineId];
    this.selectedLineIds.set(nextIds);
    this.trainingScope.set(nextIds.length > 0 ? 'SELECTED_LINES' : this.fallbackScope());
  }

  selectAllVisibleLines(): void {
    this.selectedLineIds.set(this.filteredLines().map((line) => line.id));
    if (this.selectedLineIds().length > 0) this.trainingScope.set('SELECTED_LINES');
  }

  clearLineSelection(): void {
    this.selectedLineIds.set([]);
    if (this.trainingScope() === 'SELECTED_LINES') {
      this.trainingScope.set(this.fallbackScope());
    }
  }

  setMarathonMode(mode: LibraryMarathonMode): void {
    this.marathonMode.set(mode);
  }

  setTrainingScope(scope: LibraryTrainingScope): void {
    this.trainingScope.set(scope);
  }

  startSelectedMarathon(
    mode: LibraryMarathonMode = this.marathonMode(),
    scope: LibraryTrainingScope = this.trainingScope(),
  ): void {
    this.marathonMode.set(mode);
    this.trainingScope.set(scope);

    const queryParams = { mode };
    const selectedLineIds = this.selectedLineIds();
    if (scope === 'SELECTED_LINES' && selectedLineIds.length > 0) {
      void this.router.navigate(['/library/marathon'], {
        queryParams: { ...queryParams, lineIds: selectedLineIds.join(',') },
      });
      return;
    }
    if (scope === 'CHAPTER' && this.selectedChapterId()) {
      void this.router.navigate(['/chapters', this.selectedChapterId(), 'marathon'], {
        queryParams,
      });
      return;
    }
    if (scope === 'COURSE' && this.selectedCourseId()) {
      void this.router.navigate(['/courses', this.selectedCourseId(), 'marathon'], {
        queryParams,
      });
    }
  }

  courseMeta(course: LibraryCourse): string {
    const stats = this.courseStatsById()[course.id];
    const sections =
      course.id === this.selectedCourseId()
        ? `${this.chapters().length} sections`
        : 'Open repertoire';
    return `${sections} · ${stats ? `${stats.activeSublineCount} active sublines` : 'Stats loading'}`;
  }

  chapterLineMeta(chapter: LibraryChapter): string {
    return chapter.id === this.selectedChapterId()
      ? `${this.lines().length} lines loaded`
      : 'Select section';
  }

  private async loadChapters(courseId: number): Promise<void> {
    this.chapterLoading.set(true);
    this.chapterError.set(null);
    try {
      const chapters = (
        this.catalog().courses.find((course) => course.id === courseId)?.chapters ?? []
      ).map(({ id, name, description, sortOrder }) => ({
        id,
        name,
        description,
        sortOrder,
      }));
      if (this.selectedCourseId() !== courseId) return;
      this.chapters.set(chapters);
      if (!chapters.length) {
        this.selectedChapterId.set(null);
        this.lines.set([]);
        return;
      }
      const selectedId = chapters.some(
        (chapter) => chapter.id === this.selectedChapterId(),
      )
        ? this.selectedChapterId()!
        : chapters[0].id;
      await this.selectChapter(selectedId, true, true);
    } catch (error) {
      if (this.selectedCourseId() === courseId) {
        this.chapterError.set(readError(error, 'Could not load sections.'));
      }
    } finally {
      if (this.selectedCourseId() === courseId) this.chapterLoading.set(false);
    }
  }

  private async loadLines(chapterId: number): Promise<void> {
    this.lineLoading.set(true);
    this.lineError.set(null);
    try {
      const lines =
        this.catalog()
          .courses.flatMap((course) => course.chapters)
          .find((chapter) => chapter.id === chapterId)?.lines ?? [];
      if (this.selectedChapterId() !== chapterId) return;
      this.lines.set(lines);
      this.selectedLineIds.update((ids) =>
        ids.filter((id) => lines.some((line) => line.id === id)),
      );
      if (
        this.selectedLineIds().length === 0 &&
        this.trainingScope() === 'SELECTED_LINES'
      ) {
        this.trainingScope.set(this.fallbackScope());
      }
    } catch (error) {
      if (this.selectedChapterId() === chapterId) {
        this.lineError.set(readError(error, 'Could not load lines.'));
      }
    } finally {
      if (this.selectedChapterId() === chapterId) this.lineLoading.set(false);
    }
  }

  private fallbackScope(): LibraryTrainingScope {
    return this.selectedChapterId() ? 'CHAPTER' : 'COURSE';
  }

  private clearCourseSelection(): void {
    this.selectedCourseId.set(null);
    this.selectedChapterId.set(null);
    this.selectedLineIds.set([]);
    this.trainingScope.set('COURSE');
    this.chapters.set([]);
    this.lines.set([]);
  }
}

function matches(
  query: string,
  ...values: Array<string | number | null | undefined>
): boolean {
  return values.some((value) => String(value ?? '').toLowerCase().includes(query));
}

function readError(error: unknown, fallback: string): string {
  const response = error as { error?: { message?: string; error?: string } };
  return response?.error?.message || response?.error?.error || fallback;
}
