import { Component, OnInit } from '@angular/core';
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
    <form (ngSubmit)="createCourse()" style="margin-bottom:20px;">
      <input [(ngModel)]="newCourseName" name="name" placeholder="Course name" required />
      <input [(ngModel)]="newCourseDescription" name="description" placeholder="Description" />
      <button type="submit">Add Course</button>
    </form>
    <ul>
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
  constructor(private api: ApiService) {}
  ngOnInit() {
    this.loadCourses();
  }
  loadCourses() {
    this.api.get<Course[]>('/courses').subscribe((data) => {
      this.courses = data;
    });
  }
  createCourse() {
    const body = { name: this.newCourseName, description: this.newCourseDescription };
    this.api.post<Course>('/courses', body).subscribe(() => {
      this.newCourseName = '';
      this.newCourseDescription = null;
      this.loadCourses();
    });
  }
}