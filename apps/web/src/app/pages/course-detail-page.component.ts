import { Component, OnInit } from '@angular/core';
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
      <h2>Chapters</h2>
      <form (ngSubmit)="createChapter()" style="margin-bottom:20px;">
        <input [(ngModel)]="newChapterName" name="name" placeholder="Chapter name" required />
        <input [(ngModel)]="newChapterDescription" name="description" placeholder="Description" />
        <button type="submit">Add Chapter</button>
      </form>
      <ul>
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
  constructor(private route: ActivatedRoute, private api: ApiService) {}
  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      this.courseId = Number(params.get('courseId'));
      this.loadChapters();
    });
  }
  loadChapters() {
    this.api.get<Chapter[]>(`/courses/${this.courseId}/chapters`).subscribe((data) => {
      this.chapters = data;
    });
  }
  createChapter() {
    const body = { name: this.newChapterName, description: this.newChapterDescription };
    this.api.post<Chapter>(`/courses/${this.courseId}/chapters`, body).subscribe(() => {
      this.newChapterName = '';
      this.newChapterDescription = null;
      this.loadChapters();
    });
  }
}