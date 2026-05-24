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
          <div>
            <span class="eyebrow">Course detail</span>
            <h2 class="page-heading" style="font-size:clamp(1.8rem,3vw,2.9rem);">
              {{ course?.name || 'Course' }}
            </h2>
            <p class="page-subtitle">
              {{ course?.description || 'Group related chapters into a single focused opening system and track how much of it is actually getting trained.' }}
            </p>
          </div>
          <div class="collection-actions">
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
                <div>
                  <h4 class="collection-title">{{ chapter.name }}</h4>
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
