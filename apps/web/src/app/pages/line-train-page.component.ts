import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Chess } from 'chess.js';
import { ApiService } from '../services/api.service';
import { ChessgroundBoardComponent } from '../components/chessground-board.component';

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
  imports: [CommonModule, RouterModule, ChessgroundBoardComponent],
  template: `
    <section *ngIf="loaded; else loadingState" class="stack">
      <header class="workbench-header">
        <div class="workbench-title-group">
          <a routerLink="/library" class="workbench-breadcrumb">← Library / Training focus</a>
          <h2 class="workbench-title">{{ lineName }}</h2>
          <div class="workbench-meta">
            <span>Train as {{ sideToTrain === 'BLACK' ? 'Black' : 'White' }}</span>
            <span>{{ completed ? 'Session complete' : 'In progress' }}</span>
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
            <app-chessground-board
              [fen]="currentFen"
              [side]="sideToTrain"
              [lastMove]="lastMove"
              [positionVersion]="boardPositionVersion"
              (move)="onBoardMove($event)"
            ></app-chessground-board>

            <div
              class="training-feedback"
              [class.correct]="feedback && feedbackCorrect"
              [class.incorrect]="feedback && !feedbackCorrect"
            >
              {{ feedback || 'Find the next trained move on the board.' }}
            </div>
          </div>
        </section>

        <aside class="training-side-panel">
          <div>
            <h3 class="training-goal-title">Goal</h3>
            <p class="training-goal-subtitle">
              Play the repertoire line from memory. Keep the expected move hidden unless you are stuck.
            </p>
          </div>

          <div class="expected-move-card">
            <p class="expected-move-label">Expected move</p>
            <p class="expected-move-value" *ngIf="showExpectedMove">
              <span>{{ expectedMovePiece() }}</span>
              <code>{{ expectedMoveLabel() }}</code>
            </p>
            <p class="training-goal-subtitle" *ngIf="!showExpectedMove">
              Hidden. Reveal only when you need a hint.
            </p>
          </div>

          <div class="training-progress-block">
            <div class="training-progress-labels">
              <span>Session progress</span>
              <span>{{ progressLabel() }}</span>
            </div>
            <div class="training-progress-track">
              <div class="training-progress-fill" [style.width.%]="progressPercent()"></div>
            </div>
          </div>

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

      <section *ngIf="completed" class="workbench-panel">
        <h3 class="workbench-panel-title">Mistake review</h3>
        <p class="workbench-panel-subtitle">Review the missed moves and any notes attached to those branches.</p>

        <p *ngIf="reviewLoading" class="status-note">Loading mistake review...</p>
        <div *ngIf="!reviewLoading && mistakes.length === 0" class="empty-state">
          {{ passed ? 'No mistakes. Clean session.' : 'No move-level mistakes to review, but the session did not finish cleanly.' }}
        </div>

        <div *ngIf="mistakes.length > 0" class="mistake-review-grid">
          <article class="mistake-card" *ngFor="let mistake of mistakes">
            <h4 class="mistake-card-title">
              Expected <code>{{ mistake.expectedMoveUci || '—' }}</code>
              <span *ngIf="mistake.moveSan">({{ mistake.moveSan }})</span>
            </h4>
            <p class="mistake-card-meta">Played <code>{{ mistake.playedMoveUci || '—' }}</code></p>
            <p *ngIf="mistake.branchLabel" class="mistake-card-meta">Branch: {{ mistake.branchLabel }}</p>
            <p *ngIf="mistake.comment" class="mistake-card-meta">Note: {{ mistake.comment }}</p>
            <p *ngIf="mistake.annotation" class="mistake-card-meta">Annotation: {{ mistake.annotation }}</p>
          </article>
        </div>
      </section>
    </section>

    <ng-template #loadingState>
      <section class="section-card stack">
        <p class="status-note">Loading training focus...</p>
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

  progressLabel() {
    if (this.completed) return 'Complete';
    return this.mistakesCount === 0 ? 'Clean so far' : `${this.mistakesCount} mistake${this.mistakesCount === 1 ? '' : 's'}`;
  }

  progressPercent() {
    if (this.completed) return 100;
    if (this.mistakesCount === 0) return 42;
    return Math.max(18, Math.min(82, 42 - this.mistakesCount * 8));
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
