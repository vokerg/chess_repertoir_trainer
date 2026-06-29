import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { LinesApiService, readLinesError } from '../data-access/lines-api.service';
import {
  ChapterDetail,
  ActiveTrainingStats,
  LineSummary,
  LineTransferTargetChapter,
  LineTransferTargetCourse,
  MarathonMode,
  RepertoireColor,
  SublineTrainingStatus,
} from '../data-access/lines.models';

@Injectable()
export class LinesPageStore {
  private readonly api = inject(LinesApiService);
  private readonly router = inject(Router);

  private readonly chapterId = signal<number | null>(null);
  private requestVersion = 0;
  private targetChapterRequestVersion = 0;

  readonly courseId = signal<number | null>(null);
  readonly chapter = signal<ChapterDetail | null>(null);
  readonly chapterStats = signal<ActiveTrainingStats | null>(null);
  readonly lines = signal<LineSummary[]>([]);
  readonly selectedLineIds = signal<number[]>([]);
  readonly expandedLineId = signal<number | null>(null);
  readonly lineSublineStatusByLineId = signal<Record<number, SublineTrainingStatus[]>>({});
  readonly loadingSublineStatusLineId = signal<number | null>(null);
  readonly sublineStatusError = signal<string | null>(null);
  readonly selectedSublineHashesByLineId = signal<Record<number, string[]>>({});
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
  readonly targetCourses = signal<LineTransferTargetCourse[]>([]);
  readonly targetChapters = signal<LineTransferTargetChapter[]>([]);
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
    this.chapterStats()?.totalAttempts ?? 0,
  );
  readonly totalPassed = computed(() =>
    this.chapterStats()?.passedCount ?? 0,
  );
  readonly totalFailed = computed(() =>
    this.chapterStats()?.failedCount ?? 0,
  );
  readonly activeSublineCount = computed(() => this.chapterStats()?.activeSublineCount ?? 0);
  readonly selectedLines = computed(() => {
    const selectedIds = new Set(this.selectedLineIds());
    return this.lines().filter((line) => selectedIds.has(line.id));
  });
  readonly selectedLineCount = computed(() => this.selectedLines().length);
  readonly selectedActiveSublineCount = computed(() =>
    this.selectedLines().reduce((sum, line) => sum + line.trainingStats.activeSublineCount, 0),
  );
  readonly canStartSelectedMarathon = computed(() => this.selectedLineCount() > 0);
  readonly editingLine = computed(() => this.lines().find((line) => line.id === this.editingLineId()) ?? null);
  readonly transferLine = computed(() => this.lines().find((line) => line.id === this.transferLineId()) ?? null);

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
      const [chapter, lines, stats] = await Promise.all([
        firstValueFrom(this.api.getChapter(chapterId)),
        firstValueFrom(this.api.getChapterLines(chapterId)),
        firstValueFrom(this.api.getChapterStats(chapterId)),
      ]);
      if (requestVersion !== this.requestVersion) return;
      this.chapter.set(chapter);
      this.courseId.set(chapter.courseId);
      this.lines.set(lines);
      this.selectedLineIds.update((ids) => ids.filter((id) => lines.some((line) => line.id === id)));
      this.chapterStats.set(stats);
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

  toggleLineSelection(lineId: number): void {
    this.selectedLineIds.update((ids) =>
      ids.includes(lineId) ? ids.filter((id) => id !== lineId) : [...ids, lineId],
    );
  }

  selectAllLines(): void {
    this.selectedLineIds.set(this.lines().map((line) => line.id));
  }

  clearLineSelection(): void {
    this.selectedLineIds.set([]);
  }

  toggleLineExpanded(lineId: number): void {
    if (this.expandedLineId() === lineId) {
      this.expandedLineId.set(null);
      return;
    }
    this.expandedLineId.set(lineId);
    void this.loadLineSublineStatus(lineId);
  }

  async loadLineSublineStatus(lineId: number): Promise<void> {
    if (this.lineSublineStatusByLineId()[lineId]) return;
    this.loadingSublineStatusLineId.set(lineId);
    this.sublineStatusError.set(null);
    try {
      const statuses = await firstValueFrom(this.api.getLineSublineStatus(lineId));
      this.lineSublineStatusByLineId.update((all) => ({ ...all, [lineId]: statuses }));
    } catch (error) {
      this.sublineStatusError.set(readLinesError(error, 'Could not load subline status.'));
    } finally {
      this.loadingSublineStatusLineId.set(null);
    }
  }

  toggleSublineSelection(lineId: number, hash: string): void {
    this.selectedSublineHashesByLineId.update((all) => {
      const current = all[lineId] ?? [];
      const next = current.includes(hash) ? current.filter((item) => item !== hash) : [...current, hash];
      return { ...all, [lineId]: next };
    });
  }

  startSelectedLinesMarathon(mode: MarathonMode = 'ALL'): void {
    const lineIds = this.selectedLineIds();
    if (lineIds.length === 0) return;
    void this.router.navigate(['/library/marathon'], {
      queryParams: { lineIds: lineIds.join(','), mode },
    });
  }

  drillSelectedSublines(lineId: number): void {
    const hashes = this.selectedSublineHashesByLineId()[lineId] ?? [];
    if (hashes.length > 0) {
      void this.router.navigate(['/library/marathon'], {
        queryParams: { sublineHashes: hashes.join(','), mode: 'ALL' },
      });
      return;
    }
    void this.router.navigate(['/library/marathon'], {
      queryParams: { lineIds: String(lineId), mode: 'WEAK_SUBLINES' },
    });
  }

  trainSingleLine(line: LineSummary): void {
    void this.router.navigate(['/library/marathon'], {
      queryParams: { lineIds: String(line.id), mode: 'ALL' },
    });
  }

  editLineTree(line: LineSummary): void {
    void this.router.navigate(['/lines', line.id, 'edit']);
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
      this.removeLineFromPageState(line.id);
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
    this.targetChapterId.set(mode === 'MOVE' ? null : chapterId);
    this.transferMessage.set(null);
    this.error.set(null);
    this.loadingTransferTargets.set(true);

    const requestVersion = ++this.targetChapterRequestVersion;
    try {
      const [courses, chapters] = await Promise.all([
        firstValueFrom(this.api.getTransferTargetCourses()),
        firstValueFrom(this.api.getTransferTargetChapters(courseId)),
      ]);
      if (requestVersion !== this.targetChapterRequestVersion) return;
      this.targetCourses.set(courses);
      this.targetChapters.set(chapters);
      this.targetChapterId.set(this.defaultTransferChapterId(chapters, mode, chapterId));
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
      this.removeLineFromPageState(line.id);
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
      const chapters = await firstValueFrom(this.api.getTransferTargetChapters(courseId));
      if (requestVersion !== this.targetChapterRequestVersion) return;
      this.targetChapters.set(chapters);
      this.targetChapterId.set(this.defaultTransferChapterId(chapters, this.transferMode(), this.chapterId()));
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

  private defaultTransferChapterId(
    chapters: readonly LineTransferTargetChapter[],
    mode: 'MOVE' | 'COPY' | null,
    currentChapterId: number | null,
  ): number | null {
    if (mode === 'MOVE' && currentChapterId) {
      return chapters.find((chapter) => chapter.id !== currentChapterId)?.id ?? null;
    }
    return chapters[0]?.id ?? null;
  }

  private removeLineFromPageState(lineId: number): void {
    this.lines.update((lines) => lines.filter((item) => item.id !== lineId));
    this.selectedLineIds.update((ids) => ids.filter((id) => id !== lineId));
    if (this.expandedLineId() === lineId) this.expandedLineId.set(null);
    this.lineSublineStatusByLineId.update((statuses) => {
      const remaining = { ...statuses };
      delete remaining[lineId];
      return remaining;
    });
    this.selectedSublineHashesByLineId.update((hashes) => {
      const remaining = { ...hashes };
      delete remaining[lineId];
      return remaining;
    });
    if (this.exportLineId() === lineId) {
      this.exportLineId.set(null);
      this.exportedPgn.set('');
    }
  }
}
