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
    <section *ngIf="loaded; else loadingState" class="stack">
      <header class="workbench-header">
        <div class="workbench-title-group">
          <a routerLink="/library" class="workbench-breadcrumb">← Library / Training focus</a>
          <h2 class="workbench-title">{{ lineName }}</h2>
          <div class="workbench-meta">
            <span>Train as {{ sideToTrain === 'BLACK' ? 'Black' : 'White' }}</span>
            <span>{{ completed ? 'Session complete' : 'Session active' }}</span>
          </div>
        </div>

        <nav class="workbench-mode-switch" aria-label="Line mode">
          <span class="mode-pill mode-pill-active">Train</span>
          <a class="mode-pill" [routerLink]="['/lines', lineId, 'edit']">Edit tree</a>
        </nav>
      </header>

      <p *ngIf="error" class="status-error">{{ error }}</p>

      <div class="training-focus-layout">
        <section class="training-board-panel">
          <div class="training-board-inner">
            <app-chess-board
              [fen]="currentFen"
              [side]="sideToTrain"
              [lastMove]="lastMove"
              [positionVersion]="boardPositionVersion"
              (move)="onBoardMove($event)"
            ></app-chess-board>

            <div class="training-feedback" [class.correct]="feedbackCorrect && feedback" [class.incorrect]="feedback && !feedbackCorrect">
              {{ feedback || 'Your move. Stay focused on this line.' }}
            </div>
          </div>
        </section>

        <aside class="training-side-panel">
          <div>
            <h3 class="training-goal-title">Goal</h3>
            <p class="training-goal-subtitle">
              Train the prepared moves for {{ sideToTrain === 'BLACK' ? 'Black' : 'White' }}. The expected move starts hidden so the board stays honest.
            </p>
          </div>

          <section class="expected-move-card">
            <p class="expected-move-label">Expected move</p>
            <p class="expected-move-value" *ngIf="showExpectedMove">
              <span>{{ expectedMovePiece() }}</span>
              <code>{{ expectedMoveLabel() }}</code>
            </p>
            <p class="training-goal-subtitle" *ngIf="!showExpectedMove">
              Hidden. Reveal only if you are stuck.
            </p>
          </section>

          <section class="training-progress-block">
            <div class="training-progress-labels">
              <span>{{ completed ? 'Complete' : 'In progress' }}</span>
              <span>{{ mistakesCount }} mistake{{ mistakesCount === 1 ? '' : 's' }}</span>
            </div>
            <div class="training-progress-track" aria-hidden="true">
              <div class="training-progress-fill" [style.width.%]="trainingProgressPercent()"></div>
            </div>
          </section>

          <div class="library-stat-grid">
            <div class="library-mini-stat">
              <p class="library-mini-stat-label">Mistakes</p>
              <p class="library-mini-stat-value">{{ mistakesCount }}</p>
            </div>
            <div class="library-mini-stat">
              <p class="library-mini-stat-label">Accuracy</p>
              <p class="library-mini-stat-value">{{ accuracyLabel() }}</p>
            </div>
          </div>

          <div class="library-actions">
            <button type="button" class="secondary" (click)="toggleExpectedMove()">
              {{ showExpectedMove ? 'Hide expected move' : 'Reveal expected move' }}
            </button>
            <button type="button" (click)="finish()" [disabled]="completed">Finish</button>
          </div>

          <section *ngIf="completed" class="training-result-panel" [class.failed]="!passed || mistakesCount > 0">
            <h3 class="training-result-title">{{ passed && mistakesCount === 0 ? 'Clean run' : 'Needs review' }}</h3>
            <div class="training-result-meta">
              <span>Accuracy: {{ accuracy | percent:'1.0-0' }}</span>
              <span>Mistakes: {{ mistakesCount }}</span>
            </div>
            <div class="library-actions">
              <button type="button" (click)="startTraining()">Train again</button>
              <a class="library-button-link secondary" routerLink="/library">Back to library</a>
              <a class="library-button-link secondary" [routerLink]="['/lines', lineId, 'edit']">Edit tree</a>
            </div>
          </section>
        </aside>
      </div>

      <section *ngIf="completed" class="workbench-panel mistake-review-grid">
        <div>
          <h3 class="workbench-panel-title">Mistake review</h3>
          <p class="workbench-panel-subtitle">Review the moments that broke the session, then train again when ready.</p>
        </div>

        <p *ngIf="reviewLoading" class="status-note">Loading mistake review...</p>
        <div *ngIf="!reviewLoading && mistakes.length === 0" class="empty-state">No mistakes. Clean session.</div>

        <article *ngFor="let mistake of mistakes" class="mistake-card">
          <p class="mistake-card-title">
            Expected <code>{{ mistake.expectedMoveUci || '—' }}</code>
            <span *ngIf="mistake.moveSan">({{ mistake.moveSan }})</span>
            · played <code>{{ mistake.playedMoveUci || '—' }}</code>
          </p>
          <p *ngIf="mistake.branchLabel" class="mistake-card-meta">Branch: {{ mistake.branchLabel }}</p>
          <p *ngIf="mistake.comment" class="mistake-card-meta">Note: {{ mistake.comment }}</p>
          <p *ngIf="mistake.annotation" class="mistake-card-meta">Annotation: {{ mistake.annotation }}</p>
        </article>
      </section>
    </section>

    <ng-template #loadingState>
      <section class="section-card stack">
        <p class="status-note">Loading training session...</p>
        <p *ngIf="error" class="status-error">{{ error }}</p>
      </section>
    </ng-template>
  `,
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
    this.api.post<any>(`/training/${this.sessionId}/move`, { moveUci: uci }).subscribe({
      next: (res) => {
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
      },
      error: (err) => {
        this.error = err?.error?.message || err?.error?.error || 'Could not submit move.';
        this.cdr.detectChanges();
      },
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

  trainingProgressPercent() {
    if (this.completed) return 100;
    if (this.mistakesCount > 0) return 38;
    return 18;
  }

  accuracyLabel() {
    if (this.accuracy === null || this.accuracy === undefined) return '—';
    return `${Math.round(this.accuracy * 100)}%`;
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
