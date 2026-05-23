import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';

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
    <div *ngIf="courseId">
      <p><a routerLink="/courses">← Courses</a></p>
      <h2>Chapters</h2>
      <p *ngIf="loading">Loading chapters...</p>
      <p *ngIf="error" style="color:#b00020;">{{ error }}</p>
      <form (ngSubmit)="createChapter()" style="margin-bottom:20px;">
        <input [(ngModel)]="newChapterName" name="name" placeholder="Chapter name" required />
        <input [(ngModel)]="newChapterDescription" name="description" placeholder="Description" />
        <button type="submit" [disabled]="saving">{{ saving ? 'Adding...' : 'Add Chapter' }}</button>
      </form>
      <p *ngIf="!loading && !error && chapters.length === 0">No chapters yet.</p>
      <ul *ngIf="chapters.length > 0">
        <li *ngFor="let chapter of chapters">
          <a [routerLink]="['/chapters', chapter.id, 'lines']">{{ chapter.name }}</a>
        </li>
      </ul>
    </div>
  `
})
export class CourseDetailPageComponent implements OnInit {
  courseId!: number;
  chapters: Chapter[] = [];
  newChapterName = '';
  newChapterDescription: string | null = null;
  loading = false;
  saving = false;
  error: string | null = null;

  constructor(private route: ActivatedRoute, private api: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      this.courseId = Number(params.get('courseId'));
      this.loadChapters();
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
        this.loadChapters();
      },
      error: (err) => {
        this.error = err?.error?.message || err?.error?.error || 'Could not create chapter.';
        this.saving = false;
        this.cdr.detectChanges();
      },
    });
  }
}
