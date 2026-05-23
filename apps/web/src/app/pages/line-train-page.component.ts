import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ApiService } from '../services/api.service';
import { ChessBoardComponent } from '../components/chess-board.component';

@Component({
  selector: 'app-line-train-page',
  standalone: true,
  imports: [CommonModule, RouterModule, ChessBoardComponent],
  template: `
    <div *ngIf="loaded">
      <h2>Training: {{ lineName }}</h2>
      <div>
        <app-chess-board [fen]="currentFen" [side]="sideToTrain" [lastMove]="lastMove" (move)="onBoardMove($event)"></app-chess-board>
      </div>
      <div style="margin-top:10px;">
        <p *ngIf="feedback" [style.color]="feedbackCorrect ? 'green' : 'red'">{{ feedback }}</p>
        <p>Expected move: {{ expectedMove || '(waiting...)' }}</p>
        <p>Mistakes: {{ mistakesCount }}</p>
        <button (click)="finish()" [disabled]="completed">Finish</button>
      </div>
      <div *ngIf="completed" style="margin-top:20px;">
        <h3>Session {{ passed ? 'Passed' : 'Failed' }}</h3>
        <p>Accuracy: {{ accuracy | number:'1.0-2' }}</p>
      </div>
    </div>
    <div *ngIf="!loaded">
      <p>Loading...</p>
      <p *ngIf="error" style="color:#b00020;">{{ error }}</p>
    </div>
  `
})
export class LineTrainPageComponent implements OnInit {
  lineId!: number;
  lineName = '';
  sideToTrain: 'WHITE' | 'BLACK' = 'WHITE';
  sessionId!: number;
  currentFen = '';
  expectedMove: string | undefined;
  feedback: string | null = null;
  feedbackCorrect = false;
  mistakesCount = 0;
  completed = false;
  passed = false;
  accuracy: number | null = null;
  loaded = false;
  error: string | null = null;
  lastMove: { from: string; to: string } | null = null;

  constructor(private route: ActivatedRoute, private api: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      this.lineId = Number(params.get('lineId'));
      this.startTraining();
    });
  }

  startTraining() {
    this.loaded = false;
    this.error = null;
    this.api.get<any>(`/lines/${this.lineId}`).subscribe({
      next: (line) => {
        this.lineName = line.name;
        this.sideToTrain = line.sideToTrain;
        this.api.post<any>(`/lines/${this.lineId}/training/start`, {}).subscribe({
          next: (session) => {
            this.sessionId = session.sessionId;
            this.currentFen = session.fen;
            this.expectedMove = session.expectedMove;
            this.mistakesCount = 0;
            this.completed = session.completed ?? false;
            this.passed = false;
            this.accuracy = null;
            this.feedback = null;
            this.loaded = true;
            this.cdr.detectChanges();
          },
          error: () => {
            this.error = 'Could not start training.';
            this.cdr.detectChanges();
          },
        });
      },
      error: () => {
        this.error = 'Could not load line.';
        this.cdr.detectChanges();
      },
    });
  }

  onBoardMove(uci: string) {
    if (this.completed) return;
    const from = uci.substring(0, 2);
    const to = uci.substring(2, 4);
    this.lastMove = { from, to };
    this.api.post<any>(`/training/${this.sessionId}/move`, { moveUci: uci }).subscribe((res) => {
      this.currentFen = res.fen;
      this.expectedMove = res.nextExpectedMove;
      this.mistakesCount = res.mistakesCount ?? this.mistakesCount;
      if (res.correct) {
        this.feedback = 'Correct!';
        this.feedbackCorrect = true;
      } else {
        this.feedback = `Incorrect. Expected ${res.expectedMove}`;
        this.feedbackCorrect = false;
      }
      if (res.completed) {
        this.completed = true;
        this.passed = res.result === 'PASSED';
        this.accuracy = res.accuracy;
      }
      this.cdr.detectChanges();
    });
  }

  finish() {
    if (this.completed) return;
    this.api.post<any>(`/training/${this.sessionId}/complete`, {}).subscribe((session) => {
      this.completed = true;
      this.passed = session.result === 'PASSED';
      this.accuracy = session.accuracy;
      this.mistakesCount = session.mistakesCount ?? this.mistakesCount;
      this.cdr.detectChanges();
    });
  }
}
