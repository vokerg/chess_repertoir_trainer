import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { LibraryApiService } from '../data-access/library-api.service';
import { LibraryChapter, LibraryCourse, LibraryCourseStats, LibraryLine } from '../data-access/library.models';
import { lineStatus, statusLabel } from '../helpers/library-line.helpers';

@Injectable()
export class LibraryBrowserStore {
  private readonly api = inject(LibraryApiService);

  readonly courses = signal<LibraryCourse[]>([]);
  readonly chapters = signal<LibraryChapter[]>([]);
  readonly lines = signal<LibraryLine[]>([]);
  readonly selectedCourseId = signal<number | null>(null);
  readonly selectedChapterId = signal<number | null>(null);
  readonly selectedLineId = signal<number | null>(null);
  readonly courseLoading = signal(false);
  readonly chapterLoading = signal(false);
  readonly lineLoading = signal(false);
  readonly courseError = signal<string | null>(null);
  readonly chapterError = signal<string | null>(null);
  readonly lineError = signal<string | null>(null);
  readonly searchText = signal('');
  readonly reviewOnly = signal(false);
  readonly courseStatsById = signal<Record<number, LibraryCourseStats>>({});
  readonly deletingLineId = signal<number | null>(null);
  readonly exportedPgn = signal('');
  readonly pgnExportLineId = signal<number | null>(null);
  readonly pgnExporting = signal(false);
  readonly pgnExportError = signal<string | null>(null);

  readonly selectedCourse = computed(() => this.courses().find((course) => course.id === this.selectedCourseId()) ?? null);
  readonly selectedChapter = computed(() => this.chapters().find((chapter) => chapter.id === this.selectedChapterId()) ?? null);
  readonly selectedLine = computed(() => this.lines().find((line) => line.id === this.selectedLineId()) ?? null);
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
      const courses = await firstValueFrom(this.api.getCourses());
      this.courses.set(courses);
      void Promise.all(courses.map((course) => this.loadCourseStats(course.id)));
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
    this.chapters.set([]);
    this.lines.set([]);
    this.clearExport();
    await this.loadChapters(courseId);
  }

  async selectChapter(chapterId: number, force = false): Promise<void> {
    if (!force && this.selectedChapterId() === chapterId) return;
    this.selectedChapterId.set(chapterId);
    this.selectedLineId.set(null);
    this.lines.set([]);
    this.clearExport();
    await this.loadLines(chapterId);
  }

  selectLine(lineId: number): void {
    this.selectedLineId.set(lineId);
    this.clearExport();
  }

  toggleReviewOnly(): void {
    this.reviewOnly.update((value) => !value);
  }

  async createLineInSelectedChapter(): Promise<void> {
    const chapterId = this.selectedChapterId();
    if (!chapterId) return;
    const name = window.prompt('Line name', 'New repertoire line')?.trim();
    if (!name) return;
    const sideInput = window.prompt('Side to train: WHITE or BLACK', 'WHITE')?.trim().toUpperCase();
    const sideToTrain = sideInput === 'BLACK' ? 'BLACK' : 'WHITE';
    const startingFen = window.prompt('Starting position: use startpos or paste a FEN', 'startpos')?.trim() || 'startpos';
    this.lineLoading.set(true);
    this.lineError.set(null);
    try {
      const line = await firstValueFrom(this.api.createLine(chapterId, { name, sideToTrain, startingFen }));
      this.selectedLineId.set(line.id);
      await this.loadLines(chapterId);
    } catch (error) {
      this.lineError.set(readError(error, 'Could not create line.'));
      this.lineLoading.set(false);
    }
  }

  async deleteLine(line: LibraryLine): Promise<void> {
    if (!window.confirm(`Delete line "${line.name}" and its full move tree? This cannot be undone.`)) return;
    this.deletingLineId.set(line.id);
    this.lineError.set(null);
    try {
      await firstValueFrom(this.api.deleteLine(line.id));
      this.lines.update((lines) => lines.filter((item) => item.id !== line.id));
      if (this.selectedLineId() === line.id) this.selectedLineId.set(this.lines()[0]?.id ?? null);
      this.clearExport();
    } catch (error) {
      this.lineError.set(readError(error, 'Could not delete line.'));
    } finally {
      this.deletingLineId.set(null);
    }
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
    return `${sections} · ${stats ? `${stats.totalLines} lines` : 'Lines loading'}`;
  }

  chapterLineMeta(chapter: LibraryChapter): string {
    return chapter.id === this.selectedChapterId() ? `${this.lines().length} lines loaded` : 'Select to load lines';
  }

  private async loadChapters(courseId: number): Promise<void> {
    this.chapterLoading.set(true);
    this.chapterError.set(null);
    try {
      const chapters = await firstValueFrom(this.api.getChapters(courseId));
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
      const lines = await firstValueFrom(this.api.getLines(chapterId));
      if (this.selectedChapterId() !== chapterId) return;
      this.lines.set(lines);
      this.selectedLineId.set(
        lines.some((line) => line.id === this.selectedLineId()) ? this.selectedLineId() : lines[0]?.id ?? null,
      );
    } catch (error) {
      if (this.selectedChapterId() === chapterId) this.lineError.set(readError(error, 'Could not load lines.'));
    } finally {
      if (this.selectedChapterId() === chapterId) this.lineLoading.set(false);
    }
  }

  private async loadCourseStats(courseId: number): Promise<void> {
    try {
      const stats = await firstValueFrom(this.api.getCourseStats(courseId));
      this.courseStatsById.update((allStats) => ({ ...allStats, [courseId]: stats }));
    } catch {
      // Statistics are supplementary; the library remains usable without them.
    }
  }

  private clearCourseSelection(): void {
    this.selectedCourseId.set(null);
    this.selectedChapterId.set(null);
    this.selectedLineId.set(null);
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
