import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';

interface CourseDetail {
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
  sortOrder: number;
}

@Component({
  selector: 'app-course-detail-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <section class="stack" *ngIf="courseId">
      <a routerLink="/courses" class="subtle-link">← Back to courses</a>

      <section class="section-card stack">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;flex-wrap:wrap;">
          <div class="stack" style="gap:0.7rem;">
            <span class="eyebrow">Course detail</span>
            <div *ngIf="editingCourseName; else courseHeading" class="inline-form" style="grid-template-columns:minmax(220px, 1fr) auto auto;">
              <div class="stack" style="gap:0.45rem;">
                <label for="course-rename" class="metric-label">Course name</label>
                <input id="course-rename" [(ngModel)]="courseNameDraft" name="courseRename" />
              </div>
              <button type="button" (click)="saveCourseName()" [disabled]="savingCourseName">{{ savingCourseName ? 'Saving...' : 'Save' }}</button>
              <button type="button" class="secondary" (click)="cancelCourseEdit()" [disabled]="savingCourseName">Cancel</button>
            </div>
            <ng-template #courseHeading>
              <h2 class="page-heading" style="font-size:clamp(1.8rem,3vw,2.9rem);">
                {{ course?.name || 'Course' }}
              </h2>
            </ng-template>
            <p class="page-subtitle">
              {{ course?.description || 'Group related chapters into a single focused opening system and track how much of it is actually getting trained.' }}
            </p>
          </div>
          <div class="collection-actions">
            <button *ngIf="!editingCourseName" type="button" class="secondary" (click)="startCourseEdit()" [disabled]="!course">Rename course</button>
            <button type="button" class="secondary" (click)="deleteCourse()" [disabled]="deletingCourse">
              {{ deletingCourse ? 'Deleting...' : 'Delete course' }}
            </button>
          </div>
        </div>

        <div class="grid-auto">
          <div class="metric-card">
            <p class="metric-label">Chapters</p>
            <p class="metric-value">{{ chapters.length }}</p>
          </div>
          <div class="metric-card">
            <p class="metric-label">Lines in course</p>
            <p class="metric-value">{{ stats?.totalLines ?? 0 }}</p>
          </div>
          <div class="metric-card">
            <p class="metric-label">Training attempts</p>
            <p class="metric-value">{{ stats?.totalAttempts ?? 0 }}</p>
          </div>
          <div class="metric-card">
            <p class="metric-label">Pass rate</p>
            <p class="metric-value">{{ ((stats?.passRate ?? 0) * 100) | number:'1.0-0' }}%</p>
          </div>
        </div>
      </section>

      <div class="detail-grid">
        <section class="section-card stack">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap;">
            <div>
              <span class="eyebrow">Chapter map</span>
              <h3 class="collection-title" style="font-size:1.7rem;">Chapters</h3>
            </div>
            <span class="pill">{{ chapters.length }} total</span>
          </div>

          <p *ngIf="loading" class="status-note">Loading chapters...</p>
          <p *ngIf="error" class="status-error">{{ error }}</p>

          <div *ngIf="!loading && !error && chapters.length === 0" class="empty-state">
            No chapters yet. Add the first chapter on the right to start structuring this course.
          </div>

          <div class="stack" *ngIf="chapters.length > 0">
            <article class="collection-card" *ngFor="let chapter of chapters">
              <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;flex-wrap:wrap;">
                <div class="stack" style="gap:0.55rem;">
                  <div *ngIf="editingChapterId === chapter.id; else chapterHeading" class="inline-form" style="grid-template-columns:minmax(220px, 1fr) auto auto;">
                    <div class="stack" style="gap:0.45rem;">
                      <label [for]="'chapter-rename-' + chapter.id" class="metric-label">Chapter name</label>
                      <input [id]="'chapter-rename-' + chapter.id" [(ngModel)]="chapterNameDraft" [name]="'chapterRename' + chapter.id" />
                    </div>
                    <button type="button" (click)="saveChapterName(chapter)" [disabled]="savingChapterId === chapter.id">{{ savingChapterId === chapter.id ? 'Saving...' : 'Save' }}</button>
                    <button type="button" class="secondary" (click)="cancelChapterEdit()" [disabled]="savingChapterId === chapter.id">Cancel</button>
                  </div>
                  <ng-template #chapterHeading>
                    <h4 class="collection-title">{{ chapter.name }}</h4>
                  </ng-template>
                  <p class="collection-description">
                    {{ chapter.description || 'A chapter for a key branch, model structure, or opponent system.' }}
                  </p>
                </div>
                <span class="pill">Order {{ chapter.sortOrder }}</span>
              </div>

              <div class="collection-actions">
                <a [routerLink]="['/chapters', chapter.id, 'lines']" style="text-decoration:none;">
                  <button type="button">Open lines</button>
                </a>
                <button type="button" class="secondary" (click)="startChapterEdit(chapter)" [disabled]="savingChapterId === chapter.id">
                  Rename
                </button>
                <button
                  type="button"
                  class="secondary"
                  (click)="deleteChapter(chapter)"
                  [disabled]="deletingChapterId === chapter.id"
                >
                  {{ deletingChapterId === chapter.id ? 'Deleting...' : 'Delete' }}
                </button>
              </div>
            </article>
          </div>
        </section>

        <aside class="section-card stack">
          <div>
            <span class="eyebrow">Add chapter</span>
            <h3 class="collection-title" style="font-size:1.7rem;">Create a chapter</h3>
            <p class="page-subtitle" style="font-size:0.98rem;">
              Split the course into digestible chunks like “Main line”, “Sidelines”, or “Anti-Sicilian”.
            </p>
          </div>

          <form (ngSubmit)="createChapter()" class="stack">
            <div class="stack" style="gap:0.55rem;">
              <label for="chapter-name" class="metric-label">Chapter name</label>
              <input id="chapter-name" [(ngModel)]="newChapterName" name="name" placeholder="Main line ideas" required />
            </div>

            <div class="stack" style="gap:0.55rem;">
              <label for="chapter-description" class="metric-label">Description</label>
              <textarea
                id="chapter-description"
                [(ngModel)]="newChapterDescription"
                name="description"
                rows="4"
                placeholder="What this chapter covers and when it appears."
              ></textarea>
            </div>

            <div class="collection-actions">
              <button type="submit" [disabled]="saving">{{ saving ? 'Creating...' : 'Add chapter' }}</button>
            </div>
          </form>
        </aside>
      </div>
    </section>
  `
})
export class CourseDetailPageComponent implements OnInit {
  courseId!: number;
  course: CourseDetail | null = null;
  stats: CourseStats | null = null;
  chapters: Chapter[] = [];
  newChapterName = '';
  newChapterDescription: string | null = null;
  loading = false;
  saving = false;
  editingCourseName = false;
  courseNameDraft = '';
  savingCourseName = false;
  editingChapterId: number | null = null;
  chapterNameDraft = '';
  savingChapterId: number | null = null;
  deletingCourse = false;
  deletingChapterId: number | null = null;
  error: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      this.courseId = Number(params.get('courseId'));
      this.loadCoursePage();
    });
  }

  loadCoursePage() {
    this.loadCourse();
    this.loadStats();
    this.loadChapters();
  }

  loadCourse() {
    this.api.get<CourseDetail>(`/courses/${this.courseId}`).subscribe({
      next: (course) => {
        this.course = course;
        if (!this.editingCourseName) this.courseNameDraft = course.name;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Could not load course.';
        this.cdr.detectChanges();
      },
    });
  }

  loadStats() {
    this.api.get<CourseStats>(`/courses/${this.courseId}/stats`).subscribe({
      next: (stats) => {
        this.stats = stats;
        this.cdr.detectChanges();
      },
      error: () => {
        this.stats = null;
        this.cdr.detectChanges();
      },
    });
  }

  loadChapters() {
    this.loading = true;
    this.error = null;
    this.api.get<Chapter[]>(`/courses/${this.courseId}/chapters`).subscribe({
      next: (data) => {
        this.chapters = data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = err?.error?.message || err?.error?.error || 'Could not load chapters.';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  createChapter() {
    const body = { name: this.newChapterName, description: this.newChapterDescription };
    this.saving = true;
    this.error = null;
    this.api.post<Chapter>(`/courses/${this.courseId}/chapters`, body).subscribe({
      next: () => {
        this.newChapterName = '';
        this.newChapterDescription = null;
        this.saving = false;
        this.loadCoursePage();
      },
      error: (err) => {
        this.error = err?.error?.message || err?.error?.error || 'Could not create chapter.';
        this.saving = false;
        this.cdr.detectChanges();
      },
    });
  }

  startCourseEdit() {
    if (!this.course) return;
    this.editingCourseName = true;
    this.courseNameDraft = this.course.name;
  }

  cancelCourseEdit() {
    this.editingCourseName = false;
    this.courseNameDraft = this.course?.name || '';
  }

  saveCourseName() {
    const name = this.courseNameDraft.trim();
    if (!name || !this.course) return;
    this.savingCourseName = true;
    this.error = null;
    this.api.patch<CourseDetail>(`/courses/${this.courseId}`, { name }).subscribe({
      next: (course) => {
        this.course = course;
        this.courseNameDraft = course.name;
        this.editingCourseName = false;
        this.savingCourseName = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = err?.error?.message || err?.error?.error || 'Could not rename course.';
        this.savingCourseName = false;
        this.cdr.detectChanges();
      },
    });
  }

  startChapterEdit(chapter: Chapter) {
    this.editingChapterId = chapter.id;
    this.chapterNameDraft = chapter.name;
  }

  cancelChapterEdit() {
    this.editingChapterId = null;
    this.chapterNameDraft = '';
  }

  saveChapterName(chapter: Chapter) {
    const name = this.chapterNameDraft.trim();
    if (!name) return;
    this.savingChapterId = chapter.id;
    this.error = null;
    this.api.patch<Chapter>(`/chapters/${chapter.id}`, { name }).subscribe({
      next: (updated) => {
        this.chapters = this.chapters.map((item) => (item.id === chapter.id ? { ...item, ...updated } : item));
        this.editingChapterId = null;
        this.chapterNameDraft = '';
        this.savingChapterId = null;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = err?.error?.message || err?.error?.error || 'Could not rename chapter.';
        this.savingChapterId = null;
        this.cdr.detectChanges();
      },
    });
  }

  deleteChapter(chapter: Chapter) {
    const confirmed = window.confirm(`Delete chapter "${chapter.name}" and all lines inside it? This cannot be undone.`);
    if (!confirmed) return;

    this.deletingChapterId = chapter.id;
    this.error = null;
    this.api.delete<void>(`/chapters/${chapter.id}`).subscribe({
      next: () => {
        this.deletingChapterId = null;
        this.loadCoursePage();
      },
      error: (err) => {
        this.error = err?.error?.message || err?.error?.error || 'Could not delete chapter.';
        this.deletingChapterId = null;
        this.cdr.detectChanges();
      },
    });
  }

  deleteCourse() {
    const confirmed = window.confirm(`Delete "${this.course?.name || 'this course'}" and everything inside it? This cannot be undone.`);
    if (!confirmed) return;

    this.deletingCourse = true;
    this.error = null;
    this.api.delete<void>(`/courses/${this.courseId}`).subscribe({
      next: () => {
        this.router.navigate(['/courses']);
      },
      error: (err) => {
        this.error = err?.error?.message || err?.error?.error || 'Could not delete course.';
        this.deletingCourse = false;
        this.cdr.detectChanges();
      },
    });
  }
}
