import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ApiService } from '../services/api.service';
import { ChessBoardComponent } from '../components/chess-board.component';

interface MistakeReviewItem {
  id: number;
  fenBefore: string;
  expectedMoveUci: string | null;
  playedMoveUci: string | null;
  moveSan: string | null;
  comment: string | null;
  annotation: string | null;
  branchLabel: string | null;
}

@Component({
  selector: 'app-line-train-page',
  standalone: true,
  imports: [CommonModule, RouterModule, ChessBoardComponent],
  template: `
    <div *ngIf="loaded">
      <h2>Training: {{ lineName }}</h2>
      <div>
        <app-chess-board
          *ngIf="boardReady"
          [fen]="currentFen"
          [side]="sideToTrain"
          [lastMove]="lastMove"
          (move)="onBoardMove($event)"
        ></app-chess-board>
      </div>
      <div style="margin-top:10px;">
        <p *ngIf="feedback" [style.color]="feedbackCorrect ? 'green' : 'red'">{{ feedback }}</p>
        <p *ngIf="showExpectedMove" style="color:#666;">
          Expected move: <code>{{ expectedMove || '(waiting...)' }}</code>
        </p>
        <p *ngIf="!showExpectedMove" style="color:#666;">
          Expected move hidden. Use Reveal only if you are stuck.
        </p>
        <p>Mistakes: {{ mistakesCount }}</p>
        <button type="button" (click)="toggleExpectedMove()">
          {{ showExpectedMove ? 'Hide expected move' : 'Reveal expected move' }}
        </button>
        <button type="button" (click)="finish()" [disabled]="completed">Finish</button>
      </div>
      <div *ngIf="completed" style="margin-top:20px;">
        <h3>Session {{ passed ? 'Passed' : 'Failed' }}</h3>
        <p>Accuracy: {{ accuracy | number:'1.0-2' }}</p>
        <section style="margin-top:12px;border:1px solid #ddd;padding:12px;background:#fff;max-width:680px;">
          <h3 style="margin-top:0;">Mistake review</h3>
          <p *ngIf="reviewLoading">Loading mistake review...</p>
          <p *ngIf="!reviewLoading && mistakes.length === 0">No mistakes. Clean session.</p>
          <ol *ngIf="mistakes.length > 0">
            <li *ngFor="let mistake of mistakes" style="margin-bottom:12px;">
              <p style="margin:0 0 4px;">
                Expected <code>{{ mistake.expectedMoveUci }}</code>
                <span *ngIf="mistake.moveSan">({{ mistake.moveSan }})</span>,
                played <code>{{ mistake.playedMoveUci }}</code>
              </p>
              <p *ngIf="mistake.branchLabel" style="margin:0;color:#666;">Branch: {{ mistake.branchLabel }}</p>
              <p *ngIf="mistake.comment" style="margin:0;color:#333;">Note: {{ mistake.comment }}</p>
              <p *ngIf="mistake.annotation" style="margin:0;color:#333;">Annotation: {{ mistake.annotation }}</p>
            </li>
          </ol>
        </section>
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
  boardReady = true;
  showExpectedMove = false;
  reviewLoading = false;
  mistakes: MistakeReviewItem[] = [];
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
            this.feedbackCorrect = false;
            this.lastMove = null;
            this.showExpectedMove = false;
            this.mistakes = [];
            this.reviewLoading = false;
            this.loaded = true;
            this.resetBoard();
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
    this.api.post<any>(`/training/${this.sessionId}/move`, { moveUci: uci }).subscribe((res) => {
      this.currentFen = res.fen;
      this.expectedMove = res.nextExpectedMove;
      this.mistakesCount = res.mistakesCount ?? this.mistakesCount;

      if (res.correct) {
        this.lastMove = { from: uci.substring(0, 2), to: uci.substring(2, 4) };
        this.feedback = 'Correct!';
        this.feedbackCorrect = true;
      } else {
        this.lastMove = null;
        this.feedback = this.showExpectedMove
          ? `Incorrect. Expected ${res.expectedMove}. Try it again.`
          : 'Incorrect. Same position — try again.';
        this.feedbackCorrect = false;
      }

      if (res.completed) {
        this.completed = true;
        this.passed = res.result === 'PASSED';
        this.accuracy = res.accuracy;
        this.loadReview();
      }

      this.resetBoard();
      this.cdr.detectChanges();
    });
  }

  toggleExpectedMove() {
    this.showExpectedMove = !this.showExpectedMove;
    this.cdr.detectChanges();
  }

  finish() {
    if (this.completed) return;
    this.api.post<any>(`/training/${this.sessionId}/complete`, {}).subscribe((session) => {
      this.completed = true;
      this.passed = session.result === 'PASSED';
      this.accuracy = session.accuracy;
      this.mistakesCount = session.mistakesCount ?? this.mistakesCount;
      this.loadReview();
      this.cdr.detectChanges();
    });
  }

  private loadReview() {
    this.reviewLoading = true;
    this.api.get<any>(`/training/${this.sessionId}/review`).subscribe({
      next: (review) => {
        this.mistakes = review.mistakes ?? [];
        this.reviewLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.reviewLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  private resetBoard() {
    this.boardReady = false;
    this.cdr.detectChanges();
    setTimeout(() => {
      this.boardReady = true;
      this.cdr.detectChanges();
    });
  }
}
