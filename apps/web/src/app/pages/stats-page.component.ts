import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
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
  imports: [CommonModule, RouterModule],
  template: `
    <section class="stack">
      <section class="section-card stack">
        <span class="eyebrow">Performance board</span>
        <h2 class="page-heading" style="font-size:clamp(1.8rem,3vw,2.9rem);">Training stats</h2>
        <p class="page-subtitle">
          See how much material exists, how often it gets practiced, and which lines are currently the easiest to break under pressure.
        </p>

        <div class="grid-auto" *ngIf="summary">
          <div class="metric-card">
            <p class="metric-label">Courses</p>
            <p class="metric-value">{{ summary.totalCourses }}</p>
          </div>
          <div class="metric-card">
            <p class="metric-label">Lines</p>
            <p class="metric-value">{{ summary.totalLines }}</p>
          </div>
          <div class="metric-card">
            <p class="metric-label">Sessions</p>
            <p class="metric-value">{{ summary.totalTrainingSessions }}</p>
          </div>
          <div class="metric-card">
            <p class="metric-label">Pressure points</p>
            <p class="metric-value">{{ summary.weakestLines.length }}</p>
          </div>
        </div>
      </section>

      <section class="section-card stack">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap;">
          <div>
            <span class="eyebrow">Priority review</span>
            <h3 class="collection-title" style="font-size:1.7rem;">Weakest lines</h3>
          </div>
          <span class="pill" *ngIf="summary">{{ summary.weakestLines.length }} tracked</span>
        </div>

        <p *ngIf="loading" class="status-note">Loading statistics...</p>
        <p *ngIf="error" class="status-error">{{ error }}</p>

        <div *ngIf="!loading && !error && summary && summary.weakestLines.length === 0" class="empty-state">
          No weak lines yet. Once training data accumulates, the lines that need attention will show up here.
        </div>

        <div class="stack" *ngIf="!loading && !error && summary && summary.weakestLines.length > 0">
          <article class="collection-card" *ngFor="let line of summary.weakestLines; let index = index">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;flex-wrap:wrap;">
              <div>
                <div class="pill" style="margin-bottom:0.7rem;">Priority {{ index + 1 }}</div>
                <h4 class="collection-title">{{ line.name }}</h4>
                <p class="collection-description">
                  Failure rate {{ (line.failureRate * 100) | number:'1.0-1' }}%. This line needs another pass before it feels dependable.
                </p>
              </div>
              <div class="metric-card" style="min-width:140px;">
                <p class="metric-label">Failure rate</p>
                <p class="metric-value" style="font-size:1.55rem;color:var(--danger);">
                  {{ (line.failureRate * 100) | number:'1.0-0' }}%
                </p>
              </div>
            </div>

            <div class="collection-actions">
              <a [routerLink]="['/lines', line.id, 'edit']" style="text-decoration:none;">
                <button type="button">Open line</button>
              </a>
              <a [routerLink]="['/lines', line.id, 'train']" style="text-decoration:none;">
                <button type="button" class="secondary">Train now</button>
              </a>
            </div>
          </article>
        </div>
      </section>
    </section>
  `
})
export class StatsPageComponent implements OnInit {
  summary: Summary | null = null;
  loading = false;
  error: string | null = null;

  constructor(private api: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.loading = true;
    this.error = null;
    this.api.get<Summary>('/stats/summary').subscribe({
      next: (data) => {
        this.summary = data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.summary = null;
        this.error = err?.error?.message || err?.error?.error || 'Could not load training statistics.';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }
}
