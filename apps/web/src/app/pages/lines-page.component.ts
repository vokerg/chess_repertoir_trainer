import { Component, OnInit } from '@angular/core';
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
      <h2>Lines</h2>
      <form (ngSubmit)="createLine()" style="margin-bottom:20px;">
        <input [(ngModel)]="newLineName" name="name" placeholder="Line name" required />
        <select [(ngModel)]="newLineSide" name="sideToTrain" required>
          <option value="WHITE">White</option>
          <option value="BLACK">Black</option>
        </select>
        <input [(ngModel)]="newLineStartingFen" name="startingFen" placeholder="Starting FEN" />
        <button type="submit">Add Line</button>
      </form>
      <ul>
        <li *ngFor="let line of lines">
          <div style="display:flex;align-items:center;justify-content:space-between;">
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
  constructor(private route: ActivatedRoute, private api: ApiService) {}
  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      this.chapterId = Number(params.get('chapterId'));
      this.loadLines();
    });
  }
  loadLines() {
    this.api.get<Line[]>(`/chapters/${this.chapterId}/lines`).subscribe((data) => {
      this.lines = data;
    });
  }
  createLine() {
    const body = { name: this.newLineName, sideToTrain: this.newLineSide, startingFen: this.newLineStartingFen };
    this.api.post<Line>(`/chapters/${this.chapterId}/lines`, body).subscribe(() => {
      this.newLineName = '';
      this.newLineStartingFen = 'startpos';
      this.loadLines();
    });
  }
}