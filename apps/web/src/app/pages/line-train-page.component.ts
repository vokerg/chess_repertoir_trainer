import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Chess } from 'chess.js';
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
          [fen]="currentFen"
          [side]="sideToTrain"
          [lastMove]="lastMove"
          [positionVersion]="boardPositionVersion"
          (move)="onBoardMove($event)"
        ></app-chess-board>
      </div>
      <div style="margin-top:10px;">
        <p *ngIf="feedback" [style.color]="feedbackCorrect ? 'green' : 'red'">{{ feedback }}</p>
        <p *ngIf="showExpectedMove" style="color:#666;">
          Expected move:
          <strong>{{ expectedMovePiece() }}</strong>
          <code>{{ expectedMoveLabel() }}</code>
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
      <div *ngIf="completed" class="completion-panel" [class.completion-panel-failed]="!passed">
        <h3>{{ passed ? 'Line complete' : 'Training complete' }}</h3>
        <p>{{ passed ? 'Clean run. Nice work.' : 'Finished with mistakes to review.' }}</p>
        <div class="completion-stats">
          <span>Accuracy: {{ accuracy | percent:'1.0-0' }}</span>
          <span>Mistakes: {{ mistakesCount }}</span>
        </div>
        <button type="button" (click)="startTraining()">Train again</button>
      </div>
      <div *ngIf="completed" style="margin-top:20px;">
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
  `,
  styles: [
    `
    .completion-panel {
      margin-top: 20px;
      border: 1px solid #9ad29a;
      background: #f3fbf1;
      color: #163b16;
      padding: 16px;
      max-width: 680px;
    }
    .completion-panel-failed {
      border-color: #f0c36a;
      background: #fff8e8;
      color: #4a3300;
    }
    .completion-panel h3 {
      margin: 0 0 6px;
    }
    .completion-panel p {
      margin: 0 0 12px;
    }
    .completion-stats {
      display: flex;
      gap: 14px;
      flex-wrap: wrap;
      margin-bottom: 12px;
      font-weight: 700;
    }
    `
  ]
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
  showExpectedMove = false;
  reviewLoading = false;
  mistakes: MistakeReviewItem[] = [];
  error: string | null = null;
  lastMove: { from: string; to: string } | null = null;
  boardPositionVersion = 0;

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
            this.boardPositionVersion++;
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
        const lastPlayedMove = res.playedMoves?.at(-1)?.moveUci || uci;
        this.lastMove = { from: lastPlayedMove.substring(0, 2), to: lastPlayedMove.substring(2, 4) };
        this.feedback = 'Correct!';
        this.feedbackCorrect = true;
      } else {
        this.lastMove = null;
        this.boardPositionVersion++;
        this.feedback = this.showExpectedMove
          ? `Incorrect. Expected ${this.expectedMoveLabel(res.expectedMove)}. Try it again.`
          : 'Incorrect. Same position — try again.';
        this.feedbackCorrect = false;
      }

      if (res.completed) {
        this.completed = true;
        this.passed = res.result === 'PASSED';
        this.accuracy = res.accuracy;
        this.loadReview();
      }

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

  expectedMoveLabel(moveUci: string | undefined = this.expectedMove) {
    const move = this.describeExpectedMove(moveUci);
    return move?.san || moveUci || '(waiting...)';
  }

  expectedMovePiece(moveUci: string | undefined = this.expectedMove) {
    const move = this.describeExpectedMove(moveUci);
    if (!move) return '';
    return this.pieceSymbol(move.piece, move.color);
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

  private describeExpectedMove(moveUci: string | undefined) {
    if (!moveUci || !this.currentFen) return null;
    try {
      const game = new Chess(this.currentFen);
      return game.move({
        from: moveUci.substring(0, 2),
        to: moveUci.substring(2, 4),
        promotion: moveUci.substring(4, 5) || 'q',
      }) as any;
    } catch {
      return null;
    }
  }

  private pieceSymbol(piece: string, color: string) {
    const symbols: Record<string, Record<string, string>> = {
      w: { p: '♙', n: '♘', b: '♗', r: '♖', q: '♕', k: '♔' },
      b: { p: '♟', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚' },
    };
    return symbols[color]?.[piece] || '';
  }
}
