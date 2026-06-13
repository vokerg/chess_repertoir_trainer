import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { CourseDetailApiService } from '../../courses/data-access/course-detail-api.service';
import { CourseChapter, CourseDetail } from '../../courses/data-access/course-detail.models';
import { LinesApiService, readLinesError } from '../data-access/lines-api.service';
import { ChapterDetail, LineSummary, RepertoireColor } from '../data-access/lines.models';

@Injectable()
export class LinesPageStore {
  private readonly api = inject(LinesApiService);
  private readonly courseApi = inject(CourseDetailApiService);

  private readonly chapterId = signal<number | null>(null);
  private requestVersion = 0;
  private targetChapterRequestVersion = 0;

  readonly courseId = signal<number | null>(null);
  readonly chapter = signal<ChapterDetail | null>(null);
  readonly lines = signal<LineSummary[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly editingChapterName = signal(false);
  readonly chapterNameDraft = signal('');
  readonly savingChapterName = signal(false);
  readonly editingLineId = signal<number | null>(null);
  readonly lineNameDraft = signal('');
  readonly savingLineId = signal<number | null>(null);
  readonly deletingLineId = signal<number | null>(null);
  readonly error = signal<string | null>(null);
  readonly transferLineId = signal<number | null>(null);
  readonly transferMode = signal<'MOVE' | 'COPY' | null>(null);
  readonly targetCourses = signal<CourseDetail[]>([]);
  readonly targetChapters = signal<CourseChapter[]>([]);
  readonly targetCourseId = signal<number | null>(null);
  readonly targetChapterId = signal<number | null>(null);
  readonly loadingTransferTargets = signal(false);
  readonly transferringLineId = signal<number | null>(null);
  readonly transferMessage = signal<string | null>(null);

  readonly newLineName = signal('');
  readonly newLineSide = signal<RepertoireColor>('WHITE');
  readonly newLineStartingFen = signal('startpos');

  readonly exportLineId = signal<number | null>(null);
  readonly exportedPgn = signal('');
  readonly exporting = signal(false);
  readonly importName = signal('');
  readonly importSide = signal<RepertoireColor>('WHITE');
  readonly importStartingFen = signal('startpos');
  readonly importPgnText = signal('');
  readonly importing = signal(false);
  readonly pgnMessage = signal<string | null>(null);
  readonly pgnError = signal<string | null>(null);

  readonly totalAttempts = computed(() =>
    this.lines().reduce((sum, line) => sum + line.totalAttempts, 0),
  );
  readonly totalPassed = computed(() =>
    this.lines().reduce((sum, line) => sum + line.passedCount, 0),
  );
  readonly totalFailed = computed(() =>
    this.lines().reduce((sum, line) => sum + line.failedCount, 0),
  );

  initialize(chapterId: number): void {
    if (!Number.isFinite(chapterId) || chapterId <= 0) {
      this.error.set('Invalid chapter id.');
      return;
    }
    this.chapterId.set(chapterId);
    void this.loadPage();
  }

  async loadPage(): Promise<void> {
    const chapterId = this.chapterId();
    if (!chapterId) return;

    const requestVersion = ++this.requestVersion;
    this.loading.set(true);
    this.error.set(null);

    try {
      const [chapter, lines] = await Promise.all([
        firstValueFrom(this.api.getChapter(chapterId)),
        firstValueFrom(this.api.getChapterLines(chapterId)),
      ]);
      if (requestVersion !== this.requestVersion) return;
      this.chapter.set(chapter);
      this.courseId.set(chapter.courseId);
      this.lines.set(lines);
      if (!this.editingChapterName()) this.chapterNameDraft.set(chapter.name);
      this.loading.set(false);
    } catch (error) {
      if (requestVersion !== this.requestVersion) return;
      this.error.set(readLinesError(error, 'Could not load lines.'));
      this.loading.set(false);
    }
  }

  setNewLineName(value: string): void {
    this.newLineName.set(value);
  }

  setNewLineSide(value: RepertoireColor): void {
    this.newLineSide.set(value);
  }

  setNewLineStartingFen(value: string): void {
    this.newLineStartingFen.set(value);
  }

  setChapterNameDraft(value: string): void {
    this.chapterNameDraft.set(value);
  }

  setLineNameDraft(value: string): void {
    this.lineNameDraft.set(value);
  }

  setExportLineId(value: number | null): void {
    this.exportLineId.set(value);
  }

  setImportName(value: string): void {
    this.importName.set(value);
  }

  setImportSide(value: RepertoireColor): void {
    this.importSide.set(value);
  }

  setImportStartingFen(value: string): void {
    this.importStartingFen.set(value);
  }

  setImportPgnText(value: string): void {
    this.importPgnText.set(value);
  }

  setTargetCourseId(value: number | null): void {
    this.targetCourseId.set(value);
    this.targetChapterId.set(null);
    this.targetChapters.set([]);
    if (value) void this.loadTargetChapters(value);
  }

  setTargetChapterId(value: number | null): void {
    this.targetChapterId.set(value);
  }

  async createLine(): Promise<void> {
    const chapterId = this.chapterId();
    if (!chapterId) return;

    this.saving.set(true);
    this.error.set(null);

    try {
      const line = await firstValueFrom(
        this.api.createLine(chapterId, {
          name: this.newLineName(),
          sideToTrain: this.newLineSide(),
          startingFen: this.newLineStartingFen(),
        }),
      );
      this.lines.update((lines) => [...lines, line]);
      this.newLineName.set('');
      this.newLineStartingFen.set('startpos');
    } catch (error) {
      this.error.set(readLinesError(error, 'Could not create line.'));
    } finally {
      this.saving.set(false);
    }
  }

  async deleteLine(line: LineSummary): Promise<void> {
    this.deletingLineId.set(line.id);
    this.error.set(null);

    try {
      await firstValueFrom(this.api.deleteLine(line.id));
      this.lines.update((lines) => lines.filter((item) => item.id !== line.id));
      if (this.exportLineId() === line.id) {
        this.exportLineId.set(null);
        this.exportedPgn.set('');
      }
    } catch (error) {
      this.error.set(readLinesError(error, 'Could not delete line.'));
    } finally {
      this.deletingLineId.set(null);
    }
  }

  startChapterEdit(): void {
    if (!this.chapter()) return;
    this.editingChapterName.set(true);
    this.chapterNameDraft.set(this.chapter()!.name);
  }

  cancelChapterEdit(): void {
    this.editingChapterName.set(false);
    this.chapterNameDraft.set(this.chapter()?.name || '');
  }

  async saveChapterName(): Promise<void> {
    const chapter = this.chapter();
    const name = this.chapterNameDraft().trim();
    if (!chapter || !name) return;

    this.savingChapterName.set(true);
    this.error.set(null);

    try {
      const updated = await firstValueFrom(this.api.updateChapter(chapter.id, { name }));
      this.chapter.set(updated);
      this.chapterNameDraft.set(updated.name);
      this.editingChapterName.set(false);
    } catch (error) {
      this.error.set(readLinesError(error, 'Could not rename chapter.'));
    } finally {
      this.savingChapterName.set(false);
    }
  }

  startLineEdit(line: LineSummary): void {
    this.editingLineId.set(line.id);
    this.lineNameDraft.set(line.name);
  }

  cancelLineEdit(): void {
    this.editingLineId.set(null);
    this.lineNameDraft.set('');
  }

  async saveLineName(line: LineSummary): Promise<void> {
    const name = this.lineNameDraft().trim();
    if (!name) return;

    this.savingLineId.set(line.id);
    this.error.set(null);

    try {
      const updated = await firstValueFrom(this.api.updateLine(line.id, { name }));
      this.lines.update((lines) =>
        lines.map((item) => (item.id === line.id ? { ...item, ...updated } : item)),
      );
      this.editingLineId.set(null);
      this.lineNameDraft.set('');
    } catch (error) {
      this.error.set(readLinesError(error, 'Could not rename line.'));
    } finally {
      this.savingLineId.set(null);
    }
  }

  async openLineTransfer(line: LineSummary, mode: 'MOVE' | 'COPY'): Promise<void> {
    const courseId = this.courseId();
    const chapterId = this.chapterId();
    if (!courseId || !chapterId) return;

    this.transferLineId.set(line.id);
    this.transferMode.set(mode);
    this.targetCourseId.set(courseId);
    this.targetChapterId.set(chapterId);
    this.transferMessage.set(null);
    this.error.set(null);
    this.loadingTransferTargets.set(true);

    const requestVersion = ++this.targetChapterRequestVersion;
    try {
      const [courses, chapters] = await Promise.all([
        firstValueFrom(this.courseApi.getCourses()),
        firstValueFrom(this.courseApi.getChapters(courseId)),
      ]);
      if (requestVersion !== this.targetChapterRequestVersion) return;
      this.targetCourses.set(courses);
      this.targetChapters.set(chapters);
    } catch (error) {
      if (requestVersion !== this.targetChapterRequestVersion) return;
      this.error.set(readLinesError(error, 'Could not load target chapters.'));
    } finally {
      if (requestVersion === this.targetChapterRequestVersion) {
        this.loadingTransferTargets.set(false);
      }
    }
  }

  closeLineTransfer(): void {
    this.targetChapterRequestVersion += 1;
    this.transferLineId.set(null);
    this.transferMode.set(null);
    this.targetCourseId.set(null);
    this.targetChapterId.set(null);
    this.targetChapters.set([]);
    this.loadingTransferTargets.set(false);
  }

  async moveLine(line: LineSummary, targetChapterId: number): Promise<void> {
    const currentChapterId = this.chapterId();
    if (!currentChapterId || targetChapterId === currentChapterId) return;

    this.transferringLineId.set(line.id);
    this.error.set(null);
    this.transferMessage.set(null);
    try {
      await firstValueFrom(this.api.updateLine(line.id, { chapterId: targetChapterId }));
      this.lines.update((lines) => lines.filter((item) => item.id !== line.id));
      if (this.exportLineId() === line.id) {
        this.exportLineId.set(null);
        this.exportedPgn.set('');
      }
      this.transferMessage.set(`Moved "${line.name}" to the selected chapter.`);
      this.closeLineTransfer();
    } catch (error) {
      this.error.set(readLinesError(error, 'Could not move line.'));
    } finally {
      this.transferringLineId.set(null);
    }
  }

  async copyLine(line: LineSummary, targetChapterId: number): Promise<void> {
    const currentChapterId = this.chapterId();
    if (!currentChapterId) return;

    this.transferringLineId.set(line.id);
    this.error.set(null);
    this.transferMessage.set(null);
    try {
      const copied = await firstValueFrom(
        this.api.copyLine(line.id, { targetChapterId }),
      );
      if (targetChapterId === currentChapterId) {
        this.lines.update((lines) => [...lines, copied]);
      }
      this.transferMessage.set(`Copied "${line.name}" to the selected chapter.`);
      this.closeLineTransfer();
    } catch (error) {
      this.error.set(readLinesError(error, 'Could not copy line.'));
    } finally {
      this.transferringLineId.set(null);
    }
  }

  private async loadTargetChapters(courseId: number): Promise<void> {
    const requestVersion = ++this.targetChapterRequestVersion;
    this.loadingTransferTargets.set(true);
    this.error.set(null);
    try {
      const chapters = await firstValueFrom(this.courseApi.getChapters(courseId));
      if (requestVersion !== this.targetChapterRequestVersion) return;
      this.targetChapters.set(chapters);
      this.targetChapterId.set(chapters[0]?.id ?? null);
    } catch (error) {
      if (requestVersion !== this.targetChapterRequestVersion) return;
      this.error.set(readLinesError(error, 'Could not load target chapters.'));
    } finally {
      if (requestVersion === this.targetChapterRequestVersion) {
        this.loadingTransferTargets.set(false);
      }
    }
  }

  async exportPgn(): Promise<void> {
    const lineId = this.exportLineId();
    if (!lineId) return;

    this.exporting.set(true);
    this.pgnMessage.set(null);
    this.pgnError.set(null);

    try {
      const response = await firstValueFrom(this.api.exportLinePgn(lineId));
      this.exportedPgn.set(response.pgn);
      this.pgnMessage.set('PGN exported below.');
    } catch (error) {
      this.pgnError.set(readLinesError(error, 'Could not export PGN.'));
    } finally {
      this.exporting.set(false);
    }
  }

  async importPgn(): Promise<void> {
    const chapterId = this.chapterId();
    if (!chapterId) return;

    this.importing.set(true);
    this.pgnMessage.set(null);
    this.pgnError.set(null);

    try {
      const line = await firstValueFrom(
        this.api.importLinePgn(chapterId, {
          name: this.importName(),
          sideToTrain: this.importSide(),
          startingFen: this.importStartingFen() || 'startpos',
          pgn: this.importPgnText(),
        }),
      );
      this.lines.update((lines) => [...lines, line]);
      this.importName.set('');
      this.importPgnText.set('');
      this.pgnMessage.set('PGN imported as a new line.');
    } catch (error) {
      this.pgnError.set(readLinesError(error, 'Could not import PGN.'));
    } finally {
      this.importing.set(false);
    }
  }
}
