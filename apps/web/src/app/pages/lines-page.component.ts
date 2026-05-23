import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';

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
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div *ngIf="chapterId">
      <p><a routerLink="/courses">← Courses</a></p>
      <h2>Lines</h2>
      <p *ngIf="loading">Loading lines...</p>
      <p *ngIf="error" style="color:#b00020;">{{ error }}</p>
      <form (ngSubmit)="createLine()" style="margin-bottom:20px;">
        <input [(ngModel)]="newLineName" name="name" placeholder="Line name" required />
        <select [(ngModel)]="newLineSide" name="sideToTrain" required>
          <option value="WHITE">White</option>
          <option value="BLACK">Black</option>
        </select>
        <input [(ngModel)]="newLineStartingFen" name="startingFen" placeholder="Starting FEN" />
        <button type="submit" [disabled]="saving">{{ saving ? 'Adding...' : 'Add Line' }}</button>
      </form>
      <p *ngIf="!loading && !error && lines.length === 0">No lines yet.</p>
      <ul *ngIf="lines.length > 0">
        <li *ngFor="let line of lines">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;">
            <span><strong>{{ line.name }}</strong> ({{ line.sideToTrain }}) - Trained: {{ line.totalAttempts }}, Passed: {{ line.passedCount }}, Failed: {{ line.failedCount }}</span>
            <span>
              <a [routerLink]="['/lines', line.id, 'edit']">Edit</a> |
              <a [routerLink]="['/lines', line.id, 'train']">Train</a>
            </span>
          </div>
        </li>
      </ul>
    </div>
  `
})
export class LinesPageComponent implements OnInit {
  chapterId!: number;
  lines: Line[] = [];
  newLineName = '';
  newLineSide: 'WHITE' | 'BLACK' = 'WHITE';
  newLineStartingFen = 'startpos';
  loading = false;
  saving = false;
  error: string | null = null;

  constructor(private route: ActivatedRoute, private api: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      this.chapterId = Number(params.get('chapterId'));
      this.loadLines();
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
}
