import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { LibraryApiService } from '../data-access/library-api.service';
import {
  LibraryChapter,
  LibraryCatalogResponse,
  LibraryCourse,
  LibraryCourseStats,
  LibraryLine,
  LibraryMarathonMode,
  LibraryTrainingScope,
} from '../data-access/library.models';
import { coverageLabel, lineStatus, masteryLabel, statusLabel } from '../helpers/library-line.helpers';

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
  readonly selectedLineId = signal<number | null>(null);
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
  readonly reviewOnly = signal(false);
  readonly courseStatsById = signal<Record<number, LibraryCourseStats>>({});
  readonly exportedPgn = signal('');
  readonly pgnExportLineId = signal<number | null>(null);
  readonly pgnExporting = signal(false);
  readonly pgnExportError = signal<string | null>(null);

  readonly selectedCourse = computed(() => this.courses().find((course) => course.id === this.selectedCourseId()) ?? null);
  readonly selectedChapter = computed(() => this.chapters().find((chapter) => chapter.id === this.selectedChapterId()) ?? null);
  readonly selectedLine = computed(() => this.lines().find((line) => line.id === this.selectedLineId()) ?? null);
  readonly selectedLines = computed(() => {
    const selectedIds = new Set(this.selectedLineIds());
    return this.lines().filter((line) => selectedIds.has(line.id));
  });
  readonly selectedCourseStats = computed(() => {
    const courseId = this.selectedCourseId();
    return courseId ? this.courseStatsById()[courseId] ?? null : null;
  });
  readonly basketLines = computed(() => this.trainingScope() === 'SELECTED_LINES' ? this.selectedLines() : this.lines());
  readonly basketLineCountLabel = computed(() => this.trainingScope() === 'COURSE' ? 'Sections' : 'Lines');
  readonly basketLineCount = computed(() => this.trainingScope() === 'COURSE' ? this.chapters().length : this.basketLines().length);
  readonly basketActiveSublineCount = computed(() =>
    this.trainingScope() === 'COURSE'
      ? this.selectedCourseStats()?.activeSublineCount ?? 0
      : this.basketLines().reduce((sum, line) => sum + line.trainingStats.activeSublineCount, 0),
  );
  readonly basketRecentAttempts = computed(() =>
    this.trainingScope() === 'COURSE'
      ? this.selectedCourseStats()?.totalAttempts ?? 0
      : this.basketLines().reduce((sum, line) => sum + line.trainingStats.totalAttempts, 0),
  );
  readonly basketWeakSublineCount = computed(() =>
    this.trainingScope() === 'COURSE'
      ? this.selectedCourseStats()?.weakSublineCount ?? 0
      : this.basketLines().reduce((sum, line) => sum + line.trainingStats.weakSublineCount, 0),
  );
  readonly basketUntrainedSublineCount = computed(() =>
    this.trainingScope() === 'COURSE'
      ? this.selectedCourseStats()?.untrainedSublineCount ?? 0
      : this.basketLines().reduce((sum, line) => sum + line.trainingStats.untrainedSublineCount, 0),
  );
  readonly basketCoverageLabel = computed(() => {
    if (this.trainingScope() === 'COURSE') {
      const stats = this.selectedCourseStats();
      return stats ? coverageLabel(stats.trainedSublineCount, stats.activeSublineCount) : 'Stats loading';
    }
    const trained = this.basketLines().reduce((sum, line) => sum + line.trainingStats.trainedSublineCount, 0);
    return coverageLabel(trained, this.basketActiveSublineCount());
  });
  readonly basketMasteryLabel = computed(() => {
    if (this.trainingScope() === 'COURSE') {
      const stats = this.selectedCourseStats();
      return stats ? masteryLabel(stats.passRate) : 'Stats loading';
    }
    const active = this.basketActiveSublineCount();
    if (active === 0) return 'No attempts';
    const weighted = this.basketLines().reduce((sum, line) => sum + (line.trainingStats.passRate * line.trainingStats.activeSublineCount), 0);
    return masteryLabel(weighted / active);
  });
  readonly basketCoverageSourceLabel = computed(() => {
    if (this.trainingScope() === 'SELECTED_LINES') return `${this.selectedLines().length} selected lines`;
    if (this.trainingScope() === 'CHAPTER' && this.selectedChapter()) return `Section: ${this.selectedChapter()!.name}`;
    if (this.selectedCourse()) return `Repertoire: ${this.selectedCourse()!.name}`;
    return 'Select training scope';
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
  readonly filteredCourses = computed(() => {
    const query = this.normalizedSearch();
    return query ? this.courses().filter((course) => matches(query, course.name, course.description)) : this.courses();
  });
  readonly filteredChapters = computed(() => {
    const query = this.normalizedSearch();
    return query ? this.chapters().filter((chapter) => matches(query, chapter.name, chapter.description)) : this.chapters();
  });
  readonly filteredLines = computed(() => {
    const query = this.normalizedSearch();
    return this.lines().filter((line) => {
      const status = lineStatus(line);
      const matchesSearch = !query || matches(query, line.name, line.sideToTrain, line.startingFen, statusLabel(status));
      return matchesSearch && (!this.reviewOnly() || status === 'WEAK' || status === 'REVIEW');
    });
  });

  async loadCourses(): Promise<void> {
    this.courseLoading.set(true);
    this.courseError.set(null);
    try {
      const catalog = await firstValueFrom(this.api.getCatalog());
      this.catalog.set(catalog);
      const courses = catalog.courses.map(({ id, name, description }) => ({ id, name, description }));
      this.courses.set(courses);
      this.courseStatsById.set(Object.fromEntries(catalog.courses.map((course) => [course.id, course.stats])));
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
    this.selectedLineId.set(null);
    this.selectedLineIds.set([]);
    this.trainingScope.set('COURSE');
    this.chapters.set([]);
    this.lines.set([]);
    this.clearExport();
    await this.loadChapters(courseId);
  }

  async selectChapter(chapterId: number, force = false): Promise<void> {
    if (!force && this.selectedChapterId() === chapterId) return;
    this.selectedChapterId.set(chapterId);
    this.selectedLineId.set(null);
    this.selectedLineIds.set([]);
    this.trainingScope.set('COURSE');
    this.lines.set([]);
    this.clearExport();
    await this.loadLines(chapterId);
  }

  selectLine(lineId: number): void {
    this.selectedLineId.set(lineId);
    this.clearExport();
  }

  toggleLineSelection(lineId: number): void {
    const currentIds = this.selectedLineIds();
    const nextIds = currentIds.includes(lineId) ? currentIds.filter((id) => id !== lineId) : [...currentIds, lineId];
    this.selectedLineIds.set(nextIds);
    if (nextIds.length > 0 && nextIds.length > currentIds.length) {
      this.trainingScope.set('SELECTED_LINES');
    }
    if (nextIds.length === 0 && this.trainingScope() === 'SELECTED_LINES') {
      this.trainingScope.set('COURSE');
    }
  }

  selectAllVisibleLines(): void {
    this.selectedLineIds.set(this.filteredLines().map((line) => line.id));
    if (this.selectedLineIds().length > 0) this.trainingScope.set('SELECTED_LINES');
  }

  clearLineSelection(): void {
    this.selectedLineIds.set([]);
    if (this.trainingScope() === 'SELECTED_LINES') this.trainingScope.set('COURSE');
  }

  setMarathonMode(mode: LibraryMarathonMode): void {
    this.marathonMode.set(mode);
  }

  setTrainingScope(scope: LibraryTrainingScope): void {
    this.trainingScope.set(scope);
  }

  startSelectedMarathon(mode: LibraryMarathonMode = this.marathonMode(), scope: LibraryTrainingScope = this.trainingScope()): void {
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
      void this.router.navigate(['/chapters', this.selectedChapterId(), 'marathon'], { queryParams });
      return;
    }
    if (scope === 'COURSE' && this.selectedCourseId()) {
      void this.router.navigate(['/courses', this.selectedCourseId(), 'marathon'], { queryParams });
    }
  }

  startSingleLineMarathon(lineId: number, mode: LibraryMarathonMode): void {
    this.selectedLineId.set(lineId);
    this.selectedLineIds.set([lineId]);
    this.marathonMode.set(mode);
    this.trainingScope.set('SELECTED_LINES');
    this.clearExport();
    void this.router.navigate(['/library/marathon'], {
      queryParams: { mode, lineIds: String(lineId) },
    });
  }

  toggleReviewOnly(): void {
    this.reviewOnly.update((value) => !value);
  }

  async exportPgn(line: LibraryLine): Promise<void> {
    this.pgnExporting.set(true);
    this.pgnExportLineId.set(line.id);
    this.pgnExportError.set(null);
    this.exportedPgn.set('');
    try {
      this.exportedPgn.set((await firstValueFrom(this.api.exportLinePgn(line.id))).pgn);
    } catch (error) {
      this.pgnExportError.set(readError(error, 'Could not export PGN.'));
    } finally {
      this.pgnExporting.set(false);
    }
  }

  courseMeta(course: LibraryCourse): string {
    const stats = this.courseStatsById()[course.id];
    const sections = course.id === this.selectedCourseId() ? `${this.chapters().length} sections` : 'Open for sections';
    return `${sections} · ${stats ? `${stats.activeSublineCount} active sublines` : 'Stats loading'}`;
  }

  chapterLineMeta(chapter: LibraryChapter): string {
    return chapter.id === this.selectedChapterId() ? `${this.lines().length} lines loaded` : 'Select to load lines';
  }

  private async loadChapters(courseId: number): Promise<void> {
    this.chapterLoading.set(true);
    this.chapterError.set(null);
    try {
      const chapters = (this.catalog().courses.find((course) => course.id === courseId)?.chapters ?? [])
        .map(({ id, name, description, sortOrder }) => ({ id, name, description, sortOrder }));
      if (this.selectedCourseId() !== courseId) return;
      this.chapters.set(chapters);
      if (!chapters.length) {
        this.selectedChapterId.set(null);
        this.selectedLineId.set(null);
        this.lines.set([]);
        return;
      }
      const selectedId = chapters.some((chapter) => chapter.id === this.selectedChapterId())
        ? this.selectedChapterId()!
        : chapters[0].id;
      await this.selectChapter(selectedId, true);
    } catch (error) {
      if (this.selectedCourseId() === courseId) this.chapterError.set(readError(error, 'Could not load sections.'));
    } finally {
      if (this.selectedCourseId() === courseId) this.chapterLoading.set(false);
    }
  }

  private async loadLines(chapterId: number): Promise<void> {
    this.lineLoading.set(true);
    this.lineError.set(null);
    try {
      const lines = this.catalog().courses.flatMap((course) => course.chapters)
        .find((chapter) => chapter.id === chapterId)?.lines ?? [];
      if (this.selectedChapterId() !== chapterId) return;
      this.lines.set(lines);
      this.selectedLineIds.update((ids) => ids.filter((id) => lines.some((line) => line.id === id)));
      if (this.selectedLineIds().length === 0 && this.trainingScope() === 'SELECTED_LINES') {
        this.trainingScope.set('COURSE');
      }
      this.selectedLineId.set(
        lines.some((line) => line.id === this.selectedLineId()) ? this.selectedLineId() : lines[0]?.id ?? null,
      );
    } catch (error) {
      if (this.selectedChapterId() === chapterId) this.lineError.set(readError(error, 'Could not load lines.'));
    } finally {
      if (this.selectedChapterId() === chapterId) this.lineLoading.set(false);
    }
  }

  private clearCourseSelection(): void {
    this.selectedCourseId.set(null);
    this.selectedChapterId.set(null);
    this.selectedLineId.set(null);
    this.selectedLineIds.set([]);
    this.trainingScope.set('COURSE');
    this.chapters.set([]);
    this.lines.set([]);
  }

  private clearExport(): void {
    this.exportedPgn.set('');
    this.pgnExportLineId.set(null);
    this.pgnExportError.set(null);
  }

  private normalizedSearch(): string {
    return this.searchText().trim().toLowerCase();
  }
}

function matches(query: string, ...values: Array<string | number | null | undefined>): boolean {
  return values.some((value) => String(value ?? '').toLowerCase().includes(query));
}

function readError(error: unknown, fallback: string): string {
  const response = error as { error?: { message?: string; error?: string } };
  return response?.error?.message || response?.error?.error || fallback;
}
