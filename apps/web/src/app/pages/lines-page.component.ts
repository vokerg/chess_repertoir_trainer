import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';
import { PgnToolsComponent } from '../components/pgn-tools.component';

interface ChapterDetail {
  id: number;
  courseId: number;
  name: string;
  description?: string | null;
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

@Component({
  selector: 'app-lines-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PgnToolsComponent],
  template: `
    <section class="stack" *ngIf="chapterId">
      <a [routerLink]="courseId ? ['/courses', courseId] : ['/courses']" class="subtle-link">← Back to course</a>

      <section class="section-card stack">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;flex-wrap:wrap;">
          <div class="stack" style="gap:0.7rem;">
            <span class="eyebrow">Line studio</span>
            <div *ngIf="editingChapterName; else chapterTitle" class="inline-form" style="grid-template-columns:minmax(220px, 1fr) auto auto;">
              <div class="stack" style="gap:0.45rem;">
                <label for="chapter-page-rename" class="metric-label">Chapter name</label>
                <input id="chapter-page-rename" [(ngModel)]="chapterNameDraft" name="chapterPageRename" />
              </div>
              <button type="button" (click)="saveChapterName()" [disabled]="savingChapterName">{{ savingChapterName ? 'Saving...' : 'Save' }}</button>
              <button type="button" class="secondary" (click)="cancelChapterEdit()" [disabled]="savingChapterName">Cancel</button>
            </div>
            <ng-template #chapterTitle>
              <h2 class="page-heading" style="font-size:clamp(1.8rem,3vw,2.9rem);">
                {{ chapter?.name || 'Chapter lines' }}
              </h2>
            </ng-template>
            <p class="page-subtitle">
              {{ chapter?.description || 'Shape concrete move orders, attach practice targets, and jump between edit and training quickly.' }}
            </p>
          </div>
          <div class="collection-actions">
            <span class="pill">{{ lines.length }} lines</span>
            <a [routerLink]="['/chapters', chapterId, 'marathon']" style="text-decoration:none;">
              <button type="button">Train chapter marathon</button>
            </a>
            <button *ngIf="!editingChapterName" type="button" class="secondary" (click)="startChapterEdit()" [disabled]="!chapter">Rename chapter</button>
          </div>
        </div>

        <div class="grid-auto">
          <div class="metric-card">
            <p class="metric-label">Lines</p>
            <p class="metric-value">{{ lines.length }}</p>
          </div>
          <div class="metric-card">
            <p class="metric-label">Attempts logged</p>
            <p class="metric-value">{{ totalAttempts() }}</p>
          </div>
          <div class="metric-card">
            <p class="metric-label">Passes</p>
            <p class="metric-value">{{ totalPassed() }}</p>
          </div>
          <div class="metric-card">
            <p class="metric-label">Fails</p>
            <p class="metric-value">{{ totalFailed() }}</p>
          </div>
        </div>
      </section>

      <div class="detail-grid">
        <section class="section-card stack">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap;">
            <div>
              <span class="eyebrow">Training map</span>
              <h3 class="collection-title" style="font-size:1.7rem;">Lines</h3>
            </div>
          </div>

          <p *ngIf="loading" class="status-note">Loading lines...</p>
          <p *ngIf="error" class="status-error">{{ error }}</p>

          <div *ngIf="!loading && !error && lines.length === 0" class="empty-state">
            No lines yet. Add your first trainable branch on the right.
          </div>

          <div class="stack" *ngIf="lines.length > 0">
            <article class="collection-card" *ngFor="let line of lines">
              <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;flex-wrap:wrap;">
                <div class="stack" style="gap:0.45rem;">
                  <div *ngIf="editingLineId === line.id; else lineTitle" class="inline-form" style="grid-template-columns:minmax(220px, 1fr) auto auto;">
                    <div class="stack" style="gap:0.45rem;">
                      <label [for]="'line-rename-' + line.id" class="metric-label">Line name</label>
                      <input [id]="'line-rename-' + line.id" [(ngModel)]="lineNameDraft" [name]="'lineRename' + line.id" />
                    </div>
                    <button type="button" (click)="saveLineName(line)" [disabled]="savingLineId === line.id">{{ savingLineId === line.id ? 'Saving...' : 'Save' }}</button>
                    <button type="button" class="secondary" (click)="cancelLineEdit()" [disabled]="savingLineId === line.id">Cancel</button>
                  </div>
                  <ng-template #lineTitle>
                    <h4 class="collection-title">{{ line.name }}</h4>
                  </ng-template>
                  <p class="collection-description">
                    Train as {{ line.sideToTrain === 'WHITE' ? 'White' : 'Black' }} ·
                    {{ line.startingFen === 'startpos' ? 'Start position' : 'Custom FEN' }}
                  </p>
                </div>
                <span class="pill">{{ line.sideToTrain }}</span>
              </div>

              <div class="grid-auto" style="grid-template-columns:repeat(auto-fit, minmax(120px, 1fr));">
                <div class="metric-card">
                  <p class="metric-label">Attempts</p>
                  <p class="metric-value" style="font-size:1.3rem;">{{ line.totalAttempts }}</p>
                </div>
                <div class="metric-card">
                  <p class="metric-label">Passed</p>
                  <p class="metric-value" style="font-size:1.3rem;color:var(--success);">{{ line.passedCount }}</p>
                </div>
                <div class="metric-card">
                  <p class="metric-label">Failed</p>
                  <p class="metric-value" style="font-size:1.3rem;color:var(--danger);">{{ line.failedCount }}</p>
                </div>
              </div>

              <div class="collection-actions">
                <a [routerLink]="['/lines', line.id, 'edit']" style="text-decoration:none;">
                  <button type="button">Edit</button>
                </a>
                <a [routerLink]="['/lines', line.id, 'train']" style="text-decoration:none;">
                  <button type="button" class="secondary">Train</button>
                </a>
                <button type="button" class="secondary" (click)="startLineEdit(line)" [disabled]="savingLineId === line.id">Rename</button>
                <button
                  type="button"
                  class="secondary"
                  (click)="deleteLine(line)"
                  [disabled]="deletingLineId === line.id"
                >
                  {{ deletingLineId === line.id ? 'Deleting...' : 'Delete' }}
                </button>
              </div>
            </article>
          </div>
        </section>

        <aside class="section-card stack">
          <div>
            <span class="eyebrow">Add line</span>
            <h3 class="collection-title" style="font-size:1.7rem;">Create a line</h3>
            <p class="page-subtitle" style="font-size:0.98rem;">
              Start from the initial position or from a custom FEN if you want to drill a branching middlegame structure.
            </p>
          </div>

          <form (ngSubmit)="createLine()" class="stack">
            <div class="stack" style="gap:0.55rem;">
              <label for="line-name" class="metric-label">Line name</label>
              <input id="line-name" [(ngModel)]="newLineName" name="name" placeholder="Mainline after 6...Bb4+" required />
            </div>

            <div class="stack" style="gap:0.55rem;">
              <label for="line-side" class="metric-label">Side to train</label>
              <select id="line-side" [(ngModel)]="newLineSide" name="sideToTrain" required>
                <option value="WHITE">White</option>
                <option value="BLACK">Black</option>
              </select>
            </div>

            <div class="stack" style="gap:0.55rem;">
              <label for="line-fen" class="metric-label">Starting position</label>
              <input id="line-fen" [(ngModel)]="newLineStartingFen" name="startingFen" placeholder="startpos" />
            </div>

            <div class="collection-actions">
              <button type="submit" [disabled]="saving">{{ saving ? 'Creating...' : 'Add line' }}</button>
            </div>
          </form>

          <app-pgn-tools [chapterId]="chapterId" [lines]="lines" (changed)="loadLines()"></app-pgn-tools>
        </aside>
      </div>
    </section>
  `
})
export class LinesPageComponent implements OnInit {
  chapterId!: number;
  courseId: number | null = null;
  chapter: ChapterDetail | null = null;
  lines: Line[] = [];
  newLineName = '';
  newLineSide: 'WHITE' | 'BLACK' = 'WHITE';
  newLineStartingFen = 'startpos';
  loading = false;
  saving = false;
  editingChapterName = false;
  chapterNameDraft = '';
  savingChapterName = false;
  editingLineId: number | null = null;
  lineNameDraft = '';
  savingLineId: number | null = null;
  deletingLineId: number | null = null;
  error: string | null = null;

  constructor(private route: ActivatedRoute, private api: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      this.chapterId = Number(params.get('chapterId'));
      this.loadChapter();
      this.loadLines();
    });
  }

  loadChapter() {
    this.api.get<ChapterDetail>(`/chapters/${this.chapterId}`).subscribe({
      next: (chapter) => {
        this.chapter = chapter;
        this.courseId = chapter.courseId;
        if (!this.editingChapterName) this.chapterNameDraft = chapter.name;
        this.cdr.detectChanges();
      },
      error: () => {
        this.chapter = null;
        this.cdr.detectChanges();
      },
    });
  }

  loadLines() {
    this.loading = true;
    this.error = null;
    this.api.get<Line[]>(`/chapters/${this.chapterId}/lines`).subscribe({
      next: (data) => {
        this.lines = data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = err?.error?.message || err?.error?.error || 'Could not load lines.';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  createLine() {
    const body = { name: this.newLineName, sideToTrain: this.newLineSide, startingFen: this.newLineStartingFen };
    this.saving = true;
    this.error = null;
    this.api.post<Line>(`/chapters/${this.chapterId}/lines`, body).subscribe({
      next: () => {
        this.newLineName = '';
        this.newLineStartingFen = 'startpos';
        this.saving = false;
        this.loadLines();
      },
      error: (err) => {
        this.error = err?.error?.message || err?.error?.error || 'Could not create line.';
        this.saving = false;
        this.cdr.detectChanges();
      },
    });
  }

  deleteLine(line: Line) {
    const confirmed = window.confirm(`Delete line "${line.name}" and its full move tree? This cannot be undone.`);
    if (!confirmed) return;

    this.deletingLineId = line.id;
    this.error = null;
    this.api.delete<void>(`/lines/${line.id}`).subscribe({
      next: () => {
        this.deletingLineId = null;
        this.loadLines();
      },
      error: (err) => {
        this.error = err?.error?.message || err?.error?.error || 'Could not delete line.';
        this.deletingLineId = null;
        this.cdr.detectChanges();
      },
    });
  }

  startChapterEdit() {
    if (!this.chapter) return;
    this.editingChapterName = true;
    this.chapterNameDraft = this.chapter.name;
  }

  cancelChapterEdit() {
    this.editingChapterName = false;
    this.chapterNameDraft = this.chapter?.name || '';
  }

  saveChapterName() {
    const name = this.chapterNameDraft.trim();
    if (!name || !this.chapter) return;
    this.savingChapterName = true;
    this.error = null;
    this.api.patch<ChapterDetail>(`/chapters/${this.chapter.id}`, { name }).subscribe({
      next: (chapter) => {
        this.chapter = chapter;
        this.chapterNameDraft = chapter.name;
        this.editingChapterName = false;
        this.savingChapterName = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = err?.error?.message || err?.error?.error || 'Could not rename chapter.';
        this.savingChapterName = false;
        this.cdr.detectChanges();
      },
    });
  }

  startLineEdit(line: Line) {
    this.editingLineId = line.id;
    this.lineNameDraft = line.name;
  }

  cancelLineEdit() {
    this.editingLineId = null;
    this.lineNameDraft = '';
  }

  saveLineName(line: Line) {
    const name = this.lineNameDraft.trim();
    if (!name) return;
    this.savingLineId = line.id;
    this.error = null;
    this.api.patch<Line>(`/lines/${line.id}`, { name }).subscribe({
      next: (updated) => {
        this.lines = this.lines.map((item) => (item.id === line.id ? { ...item, ...updated } : item));
        this.editingLineId = null;
        this.lineNameDraft = '';
        this.savingLineId = null;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = err?.error?.message || err?.error?.error || 'Could not rename line.';
        this.savingLineId = null;
        this.cdr.detectChanges();
      },
    });
  }

  totalAttempts() {
    return this.lines.reduce((sum, line) => sum + line.totalAttempts, 0);
  }

  totalPassed() {
    return this.lines.reduce((sum, line) => sum + line.passedCount, 0);
  }

  totalFailed() {
    return this.lines.reduce((sum, line) => sum + line.failedCount, 0);
  }
}
