import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../services/api.service';

interface Summary {
  totalCourses: number;
  totalLines: number;
  totalTrainingSessions: number;
  weakestLines: { id: number; name: string; failureRate: number }[];
}

@Component({
  selector: 'app-stats-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <h2>Statistics</h2>
    <div *ngIf="summary">
      <p>Total Courses: {{ summary.totalCourses }}</p>
      <p>Total Lines: {{ summary.totalLines }}</p>
      <p>Total Sessions: {{ summary.totalTrainingSessions }}</p>
      <h3>Weakest Lines</h3>
      <ul>
        <li *ngFor="let line of summary.weakestLines">
          {{ line.name }} - Failure Rate: {{ line.failureRate | number:'1.0-2' }}
        </li>
      </ul>
    </div>
    <div *ngIf="!summary">Loading...</div>
  `
})
export class StatsPageComponent implements OnInit {
  summary: Summary | null = null;
  constructor(private api: ApiService) {}
  ngOnInit() {
    this.api.get<Summary>('/stats/summary').subscribe((data) => {
      this.summary = data;
    });
  }
}