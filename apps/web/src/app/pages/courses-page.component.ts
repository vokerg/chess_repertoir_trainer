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
    <h2>Courses</h2>
    <p *ngIf="loading">Loading courses...</p>
    <p *ngIf="error" style="color:#b00020;">{{ error }}</p>
    <form (ngSubmit)="createCourse()" style="margin-bottom:20px;">
      <input [(ngModel)]="newCourseName" name="name" placeholder="Course name" required />
      <input [(ngModel)]="newCourseDescription" name="description" placeholder="Description" />
      <button type="submit" [disabled]="saving">{{ saving ? 'Adding...' : 'Add Course' }}</button>
    </form>
    <p *ngIf="!loading && !error && courses.length === 0">No courses yet. Add one above or run the seed script.</p>
    <ul *ngIf="courses.length > 0">
      <li *ngFor="let course of courses">
        <a [routerLink]="['/courses', course.id]">{{ course.name }}</a>
      </li>
    </ul>
  `
})
export class CoursesPageComponent implements OnInit {
  courses: Course[] = [];
  newCourseName = '';
  newCourseDescription: string | null = null;
  loading = false;
  saving = false;
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
}
