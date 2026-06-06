import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ApiService } from '../services/api.service';

interface Course {
  id: number;
  name: string;
  description?: string | null;
}

interface CourseStats {
  courseId: number;
  totalLines: number;
  totalAttempts: number;
  passedCount: number;
  failedCount: number;
  passRate: number;
  failureRate: number;
}

interface Chapter {
  id: number;
  name: string;
  description?: string | null;
  sortOrder?: number | null;
}

interface Line {
  id: number;
  name: string;
  sideToTrain: 'WHITE' | 'BLACK';
  startingFen: string;
  passedCount: number;
  failedCount: number;
  totalAttempts: number;
}

type LineStatus = 'NEW' | 'WEAK' | 'CLEAN' | 'REVIEW';

@Component({
  selector: 'app-library-browser-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <section class="stack">
      <section class="section-card stack">
        <span class="eyebrow">Study library</span>
        <h2 class="page-heading page-heading-library">Choose what to study</h2>
        <p class="page-subtitle">
          Browse repertoires, sections, and trainable lines in one workspace. Pick a line, then jump straight into focused training or the tree editor.
        </p>
      </section>

      <section class="library-browser">
        <div class="library-toolbar">
          <input
            class="library-search"
            [(ngModel)]="searchText"
            placeholder="Search repertoires, sections, lines..."
          />

          <div class="library-actions library-toolbar-actions">
            <button type="button" class="secondary" (click)="reviewOnly = !reviewOnly" [class.library-filter-active]="reviewOnly">
              {{ reviewOnly ? 'Review filter on' : 'Filters' }}
            </button>
            <button type="button" (click)="createLineInSelectedChapter()" [disabled]="!selectedChapterId || lineLoading">
              New line
            </button>
          </div>
        </div>

        <div class="library-columns">
          <aside class="library-column">
            <div class="library-column-header">Repertoires</div>

            <p *ngIf="courseLoading" class="status-note">Loading repertoires...</p>
            <p *ngIf="courseError" class="status-error">{{ courseError }}</p>

            <div *ngIf="!courseLoading && !courseError && filteredCourses().length === 0" class="empty-state">
              No repertoires match this search.
            </div>

            <div class="library-list" *ngIf="filteredCourses().length > 0">
              <article
                class="library-row library-line-row"
                *ngFor="let course of filteredCourses()"
                [class.library-row-active]="course.id === selectedCourseId"
                role="button"
                tabindex="0"
                (click)="selectCourse(course.id)"
                (keydown.enter)="selectCourse(course.id)"
              >
                <p class="library-row-title">{{ course.name }}</p>
                <p class="library-row-meta">{{ course.description || 'Personal repertoire' }}</p>
                <p class="library-row-meta library-row-counts">{{ courseMeta(course) }}</p>
                <div class="library-row-actions">
                  <a class="library-button-link" [routerLink]="['/courses', course.id, 'marathon']" (click)="$event.stopPropagation()">
                    Marathon
                  </a>
                </div>
              </article>
            </div>
          </aside>

          <aside class="library-column">
            <div class="library-column-header">Sections</div>

            <p *ngIf="chapterLoading" class="status-note">Loading sections...</p>
            <p *ngIf="chapterError" class="status-error">{{ chapterError }}</p>

            <div *ngIf="!selectedCourseId && !chapterLoading" class="empty-state">
              Select a repertoire to see sections.
            </div>

            <div *ngIf="selectedCourseId && !chapterLoading && !chapterError && filteredChapters().length === 0" class="empty-state">
              No sections match this search.
            </div>

            <div class="library-list" *ngIf="filteredChapters().length > 0">
              <button
                type="button"
                class="library-row"
                *ngFor="let chapter of filteredChapters()"
                [class.library-row-active]="chapter.id === selectedChapterId"
                (click)="selectChapter(chapter.id)"
              >
                <p class="library-row-title">{{ chapter.name }}</p>
                <p class="library-row-meta">{{ chapter.description || 'Opening section' }}</p>
                <p class="library-row-meta library-row-counts">
                  {{ chapterLineMeta(chapter) }}
                  <span *ngIf="chapter.sortOrder !== null && chapter.sortOrder !== undefined"> · Order {{ chapter.sortOrder }}</span>
                </p>
              </button>
            </div>
          </aside>

          <main class="library-column">
            <div class="library-column-header">Lines</div>

            <p *ngIf="lineLoading" class="status-note">Loading lines...</p>
            <p *ngIf="lineError" class="status-error">{{ lineError }}</p>

            <div *ngIf="!selectedChapterId && !lineLoading" class="empty-state">
              Select a section to see trainable lines.
            </div>

            <div *ngIf="selectedChapterId && !lineLoading && !lineError && filteredLines().length === 0" class="empty-state">
              No lines match this search or filter.
            </div>

            <div class="library-list" *ngIf="filteredLines().length > 0">
              <article
                class="library-row library-line-row"
                *ngFor="let line of filteredLines()"
                [class.library-row-active]="line.id === selectedLineId"
                role="button"
                tabindex="0"
                (click)="selectLine(line.id)"
                (keydown.enter)="selectLine(line.id)"
              >
                <div class="library-row-main">
                  <p class="library-row-title">{{ line.name }}</p>
                  <span class="library-status-pill" [ngClass]="statusClass(lineStatus(line))">
                    {{ statusLabel(lineStatus(line)) }}
                  </span>
                </div>

                <p class="library-row-meta">
                  Train as {{ sideLabel(line.sideToTrain) }} · {{ startingPositionLabel(line) }}
                </p>
                <p class="library-row-meta library-row-counts">
                  {{ line.totalAttempts }} attempts · {{ line.passedCount }} passed · {{ line.failedCount }} failed
                </p>

                <div class="library-row-actions">
                  <a class="library-button-link" [routerLink]="['/lines', line.id, 'train']" (click)="$event.stopPropagation()">Train</a>
                  <a class="library-button-link secondary" [routerLink]="['/lines', line.id, 'edit']" (click)="$event.stopPropagation()">Edit tree</a>
                </div>
              </article>
            </div>
          </main>

          <aside class="library-column library-detail">
            <ng-container *ngIf="selectedLine() as line; else noLineSelected">
              <div class="library-detail-heading">
                <span class="library-status-pill" [ngClass]="statusClass(lineStatus(line))">
                  {{ statusLabel(lineStatus(line)) }}
                </span>

                <h3 class="library-detail-title">{{ line.name }}</h3>

                <p class="library-row-meta">
                  {{ selectedCourse()?.name || 'Repertoire' }} · {{ selectedChapter()?.name || 'Section' }}
                </p>
                <p class="library-row-meta">Train as {{ sideLabel(line.sideToTrain) }}</p>
              </div>

              <div class="library-stat-grid">
                <div class="library-mini-stat">
                  <p class="library-mini-stat-label">Attempts</p>
                  <p class="library-mini-stat-value">{{ line.totalAttempts }}</p>
                </div>

                <div class="library-mini-stat">
                  <p class="library-mini-stat-label">Passed</p>
                  <p class="library-mini-stat-value">{{ line.passedCount }}</p>
                </div>

                <div class="library-mini-stat">
                  <p class="library-mini-stat-label">Failed</p>
                  <p class="library-mini-stat-value">{{ line.failedCount }}</p>
                </div>

                <div class="library-mini-stat">
                  <p class="library-mini-stat-label">Failure</p>
                  <p class="library-mini-stat-value">{{ failureRate(line) * 100 | number:'1.0-0' }}%</p>
                </div>
              </div>

              <section class="library-info-card">
                <p class="library-mini-stat-label">Starting position</p>
                <p class="library-row-meta">{{ startingPositionLabel(line) }}</p>
                <code class="library-fen">{{ line.startingFen || 'startpos' }}</code>
              </section>

              <div class="library-actions">
                <a class="library-button-link" [routerLink]="['/lines', line.id, 'train']">Train</a>
                <a class="library-button-link secondary" [routerLink]="['/lines', line.id, 'edit']">Edit tree</a>
                <button type="button" class="secondary" (click)="exportPgn(line)" [disabled]="pgnExporting && pgnExportLineId === line.id">
                  {{ pgnExporting && pgnExportLineId === line.id ? 'Exporting...' : 'Export PGN' }}
                </button>
                <button type="button" class="secondary danger-text" (click)="deleteLine(line)" [disabled]="deletingLineId === line.id">
                  {{ deletingLineId === line.id ? 'Deleting...' : 'Delete' }}
                </button>
              </div>

              <p *ngIf="pgnExportError" class="status-error">{{ pgnExportError }}</p>
              <textarea
                *ngIf="pgnExportLineId === line.id && exportedPgn"
                class="library-pgn-output"
                [(ngModel)]="exportedPgn"
                rows="8"
                aria-label="Exported PGN"
              ></textarea>
            </ng-container>

            <ng-template #noLineSelected>
              <div class="empty-state">
                Select a line to train or edit. Use the columns from left to right: repertoire, section, line, then action.
              </div>
            </ng-template>
          </aside>
        </div>
      </section>
    </section>
  `,
})
export class LibraryBrowserPageComponent implements OnInit {
  courses: Course[] = [];
  chapters: Chapter[] = [];
  lines: Line[] = [];

  selectedCourseId: number | null = null;
  selectedChapterId: number | null = null;
  selectedLineId: number | null = null;

  courseLoading = false;
  chapterLoading = false;
  lineLoading = false;

  courseError: string | null = null;
  chapterError: string | null = null;
  lineError: string | null = null;

  searchText = '';
  reviewOnly = false;

  courseStatsById: Record<number, CourseStats> = {};
  deletingLineId: number | null = null;
  exportedPgn = '';
  pgnExportLineId: number | null = null;
  pgnExporting = false;
  pgnExportError: string | null = null;

  constructor(private api: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.loadCourses();
  }

  loadCourses() {
    this.courseLoading = true;
    this.courseError = null;
    this.api.get<Course[]>('/courses').subscribe({
      next: (data) => {
        this.courses = data;
        this.courseLoading = false;
        this.cdr.detectChanges();

        for (const course of data) this.loadCourseStats(course.id);

        if (data.length === 0) {
          this.selectedCourseId = null;
          this.selectedChapterId = null;
          this.selectedLineId = null;
          this.chapters = [];
          this.lines = [];
          return;
        }

        const selectedStillExists = data.some((course) => course.id === this.selectedCourseId);
        this.selectCourse(selectedStillExists ? this.selectedCourseId! : data[0].id, true);
      },
      error: (err) => {
        this.courseError = err?.error?.message || err?.error?.error || 'Could not load repertoires.';
        this.courseLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  selectCourse(courseId: number, force = false) {
    if (!force && this.selectedCourseId === courseId) return;
    this.selectedCourseId = courseId;
    this.selectedChapterId = null;
    this.selectedLineId = null;
    this.chapters = [];
    this.lines = [];
    this.exportedPgn = '';
    this.pgnExportLineId = null;
    this.loadChapters(courseId);
  }

  loadChapters(courseId = this.selectedCourseId) {
    if (!courseId) return;
    this.chapterLoading = true;
    this.chapterError = null;
    this.api.get<Chapter[]>(`/courses/${courseId}/chapters`).subscribe({
      next: (data) => {
        if (this.selectedCourseId !== courseId) return;
        this.chapters = data;
        this.chapterLoading = false;
        this.cdr.detectChanges();

        if (data.length === 0) {
          this.selectedChapterId = null;
          this.selectedLineId = null;
          this.lines = [];
          return;
        }

        const selectedStillExists = data.some((chapter) => chapter.id === this.selectedChapterId);
        this.selectChapter(selectedStillExists ? this.selectedChapterId! : data[0].id, true);
      },
      error: (err) => {
        if (this.selectedCourseId !== courseId) return;
        this.chapterError = err?.error?.message || err?.error?.error || 'Could not load sections.';
        this.chapterLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  selectChapter(chapterId: number, force = false) {
    if (!force && this.selectedChapterId === chapterId) return;
    this.selectedChapterId = chapterId;
    this.selectedLineId = null;
    this.lines = [];
    this.exportedPgn = '';
    this.pgnExportLineId = null;
    this.loadLines(chapterId);
  }

  loadLines(chapterId = this.selectedChapterId) {
    if (!chapterId) return;
    this.lineLoading = true;
    this.lineError = null;
    this.api.get<Line[]>(`/chapters/${chapterId}/lines`).subscribe({
      next: (data) => {
        if (this.selectedChapterId !== chapterId) return;
        this.lines = data;
        this.lineLoading = false;
        this.cdr.detectChanges();

        if (data.length === 0) {
          this.selectedLineId = null;
          return;
        }

        const selectedStillExists = data.some((line) => line.id === this.selectedLineId);
        this.selectedLineId = selectedStillExists ? this.selectedLineId : data[0].id;
        this.cdr.detectChanges();
      },
      error: (err) => {
        if (this.selectedChapterId !== chapterId) return;
        this.lineError = err?.error?.message || err?.error?.error || 'Could not load lines.';
        this.lineLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  selectLine(lineId: number) {
    this.selectedLineId = lineId;
    this.exportedPgn = '';
    this.pgnExportLineId = null;
  }

  createLineInSelectedChapter() {
    if (!this.selectedChapterId) return;

    const name = window.prompt('Line name', 'New repertoire line')?.trim();
    if (!name) return;

    const sideInput = window.prompt('Side to train: WHITE or BLACK', 'WHITE')?.trim().toUpperCase();
    const sideToTrain: 'WHITE' | 'BLACK' = sideInput === 'BLACK' ? 'BLACK' : 'WHITE';
    const startingFen = window.prompt('Starting position: use startpos or paste a FEN', 'startpos')?.trim() || 'startpos';

    this.lineLoading = true;
    this.lineError = null;
    this.api.post<Line>(`/chapters/${this.selectedChapterId}/lines`, { name, sideToTrain, startingFen }).subscribe({
      next: (line) => {
        this.selectedLineId = line.id;
        this.loadLines(this.selectedChapterId);
      },
      error: (err) => {
        this.lineError = err?.error?.message || err?.error?.error || 'Could not create line.';
        this.lineLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  deleteLine(line: Line) {
    const confirmed = window.confirm(`Delete line "${line.name}" and its full move tree? This cannot be undone.`);
    if (!confirmed) return;

    this.deletingLineId = line.id;
    this.lineError = null;
    this.api.delete<void>(`/lines/${line.id}`).subscribe({
      next: () => {
        this.deletingLineId = null;
        this.selectedLineId = null;
        this.exportedPgn = '';
        this.pgnExportLineId = null;
        this.loadLines(this.selectedChapterId);
      },
      error: (err) => {
        this.lineError = err?.error?.message || err?.error?.error || 'Could not delete line.';
        this.deletingLineId = null;
        this.cdr.detectChanges();
      },
    });
  }

  exportPgn(line: Line) {
    this.pgnExporting = true;
    this.pgnExportLineId = line.id;
    this.pgnExportError = null;
    this.exportedPgn = '';
    this.api.get<{ pgn: string }>(`/lines/${line.id}/export-pgn`).subscribe({
      next: (res) => {
        this.exportedPgn = res.pgn;
        this.pgnExporting = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.pgnExportError = err?.error?.message || err?.error?.error || 'Could not export PGN.';
        this.pgnExporting = false;
        this.cdr.detectChanges();
      },
    });
  }

  selectedCourse() {
    return this.courses.find((course) => course.id === this.selectedCourseId) || null;
  }

  selectedChapter() {
    return this.chapters.find((chapter) => chapter.id === this.selectedChapterId) || null;
  }

  selectedLine() {
    return this.lines.find((line) => line.id === this.selectedLineId) || null;
  }

  filteredCourses() {
    const query = this.normalizedSearch();
    if (!query) return this.courses;
    return this.courses.filter((course) => this.matches(query, course.name, course.description));
  }

  filteredChapters() {
    const query = this.normalizedSearch();
    if (!query) return this.chapters;
    return this.chapters.filter((chapter) => this.matches(query, chapter.name, chapter.description));
  }

  filteredLines() {
    const query = this.normalizedSearch();
    return this.lines.filter((line) => {
      const matchesSearch = !query || this.matches(query, line.name, line.sideToTrain, line.startingFen, this.statusLabel(this.lineStatus(line)));
      const matchesReviewFilter = !this.reviewOnly || ['WEAK', 'REVIEW'].includes(this.lineStatus(line));
      return matchesSearch && matchesReviewFilter;
    });
  }

  lineStatus(line: Line): LineStatus {
    if (line.totalAttempts === 0) return 'NEW';
    if (line.failedCount > line.passedCount) return 'WEAK';
    if (line.passedCount > 0 && line.failedCount === 0) return 'CLEAN';
    return 'REVIEW';
  }

  failureRate(line: Line): number {
    if (!line.totalAttempts) return 0;
    return line.failedCount / line.totalAttempts;
  }

  statusLabel(status: LineStatus) {
    return status.charAt(0) + status.slice(1).toLowerCase();
  }

  statusClass(status: LineStatus) {
    return status.toLowerCase();
  }

  sideLabel(side: 'WHITE' | 'BLACK') {
    return side === 'WHITE' ? 'White' : 'Black';
  }

  startingPositionLabel(line: Line) {
    return line.startingFen === 'startpos' ? 'Start position' : 'Custom FEN';
  }

  courseMeta(course: Course) {
    const stats = this.courseStatsById[course.id];
    const sections = course.id === this.selectedCourseId ? `${this.chapters.length} sections` : 'Open for sections';
    const lines = stats ? `${stats.totalLines} lines` : 'Lines loading';
    return `${sections} · ${lines}`;
  }

  chapterLineMeta(chapter: Chapter) {
    if (chapter.id === this.selectedChapterId) return `${this.lines.length} lines loaded`;
    return 'Select to load lines';
  }

  private loadCourseStats(courseId: number) {
    this.api.get<CourseStats>(`/courses/${courseId}/stats`).subscribe({
      next: (stats) => {
        this.courseStatsById = { ...this.courseStatsById, [courseId]: stats };
        this.cdr.detectChanges();
      },
      error: () => {
        this.courseStatsById = { ...this.courseStatsById };
      },
    });
  }

  private normalizedSearch() {
    return this.searchText.trim().toLowerCase();
  }

  private matches(query: string, ...values: Array<string | number | null | undefined>) {
    return values.some((value) => String(value ?? '').toLowerCase().includes(query));
  }
}
