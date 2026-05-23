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

@Component({
  selector: 'app-courses-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <section class="stack">
      <div class="section-card">
        <span class="eyebrow">Repertoire Hub</span>
        <h2 class="page-heading" style="font-size:clamp(1.9rem,3vw,2.8rem);">Courses</h2>
        <p class="page-subtitle">
          Organize your opening work into focused repertoires. Each course can hold multiple chapters and training lines.
        </p>
        <div class="grid-auto" style="margin-top:1.1rem;">
          <div class="metric-card">
            <p class="metric-label">Total courses</p>
            <p class="metric-value">{{ courses.length }}</p>
          </div>
          <div class="metric-card">
            <p class="metric-label">Current mode</p>
            <p class="metric-value" style="font-size:1.3rem;">Build · Train · Review</p>
          </div>
        </div>
      </div>

      <div class="detail-grid">
        <section class="section-card stack">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap;">
            <div>
              <span class="eyebrow">Collection</span>
              <h3 class="collection-title" style="font-size:1.7rem;">Your courses</h3>
            </div>
            <span class="pill">{{ courses.length }} loaded</span>
          </div>

          <p *ngIf="loading" class="status-note">Loading courses...</p>
          <p *ngIf="error" class="status-error">{{ error }}</p>

          <div *ngIf="!loading && !error && courses.length === 0" class="empty-state">
            No courses yet. Create your first repertoire on the right.
          </div>

          <div class="stack" *ngIf="courses.length > 0">
            <article class="collection-card" *ngFor="let course of courses">
              <div class="stack" style="gap:0.45rem;">
                <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;flex-wrap:wrap;">
                  <div>
                    <h4 class="collection-title">{{ course.name }}</h4>
                    <p class="collection-description">
                      {{ course.description || 'A focused training space for a complete repertoire branch.' }}
                    </p>
                  </div>
                  <span class="pill">Course #{{ course.id }}</span>
                </div>
              </div>

              <div class="collection-actions">
                <a [routerLink]="['/courses', course.id]" style="text-decoration:none;">
                  <button type="button">Open course</button>
                </a>
                <button
                  type="button"
                  class="secondary"
                  (click)="deleteCourse(course)"
                  [disabled]="deletingId === course.id"
                >
                  {{ deletingId === course.id ? 'Deleting...' : 'Delete' }}
                </button>
              </div>
            </article>
          </div>
        </section>

        <aside class="section-card stack">
          <div>
            <span class="eyebrow">Create</span>
            <h3 class="collection-title" style="font-size:1.7rem;">New course</h3>
            <p class="page-subtitle" style="font-size:0.98rem;">
              Give the repertoire a memorable identity so it still feels obvious months from now.
            </p>
          </div>

          <form (ngSubmit)="createCourse()" class="stack">
            <div class="stack" style="gap:0.55rem;">
              <label for="course-name" class="metric-label">Course name</label>
              <input id="course-name" [(ngModel)]="newCourseName" name="name" placeholder="Italian Game for White" required />
            </div>

            <div class="stack" style="gap:0.55rem;">
              <label for="course-description" class="metric-label">Description</label>
              <textarea
                id="course-description"
                [(ngModel)]="newCourseDescription"
                name="description"
                rows="4"
                placeholder="What this course is for, what structures it covers, and why it matters."
              ></textarea>
            </div>

            <div class="collection-actions">
              <button type="submit" [disabled]="saving">{{ saving ? 'Creating...' : 'Create course' }}</button>
            </div>
          </form>
        </aside>
      </div>
    </section>
  `
})
export class CoursesPageComponent implements OnInit {
  courses: Course[] = [];
  newCourseName = '';
  newCourseDescription: string | null = null;
  loading = false;
  saving = false;
  deletingId: number | null = null;
  error: string | null = null;

  constructor(private api: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.loadCourses();
  }

  loadCourses() {
    this.loading = true;
    this.error = null;
    this.api.get<Course[]>('/courses').subscribe({
      next: (data) => {
        this.courses = data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = err?.error?.message || err?.error?.error || 'Could not load courses. Is the API running and seeded?';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  createCourse() {
    const body = { name: this.newCourseName, description: this.newCourseDescription };
    this.saving = true;
    this.error = null;
    this.api.post<Course>('/courses', body).subscribe({
      next: () => {
        this.newCourseName = '';
        this.newCourseDescription = null;
        this.saving = false;
        this.loadCourses();
      },
      error: (err) => {
        this.error = err?.error?.message || err?.error?.error || 'Could not create course.';
        this.saving = false;
        this.cdr.detectChanges();
      },
    });
  }

  deleteCourse(course: Course) {
    const confirmed = window.confirm(`Delete "${course.name}" and all of its chapters and lines? This cannot be undone.`);
    if (!confirmed) return;

    this.deletingId = course.id;
    this.error = null;
    this.api.delete<void>(`/courses/${course.id}`).subscribe({
      next: () => {
        this.deletingId = null;
        this.loadCourses();
      },
      error: (err) => {
        this.error = err?.error?.message || err?.error?.error || 'Could not delete course.';
        this.deletingId = null;
        this.cdr.detectChanges();
      },
    });
  }
}
