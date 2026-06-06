import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Chess } from 'chess.js';
import { ApiService } from '../services/api.service';
import { ChessgroundBoardComponent } from '../components/chessground-board.component';

type MarathonScopeType = 'CHAPTER' | 'COURSE';

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

interface MarathonNextResponse {
  line: {
    id: number;
    name: string;
    sideToTrain: 'WHITE' | 'BLACK';
    startingFen: string;
    chapterId: number;
    chapterName: string;
    courseId: number;
  };
  session: {
    sessionId: number;
    fen: string;
    expectedMove?: string;
    completed: boolean;
  };
}

@Component({
  selector: 'app-training-marathon-page',
  standalone: true,
  imports: [CommonModule, RouterModule, ChessgroundBoardComponent],
  template: `
    <section *ngIf="loaded; else loadingState" class="stack">
      <header class="workbench-header">
        <div class="workbench-title-group">
          <a [routerLink]="backLink" class="workbench-breadcrumb">← {{ backLabel }}</a>
          <h2 class="workbench-title">{{ marathonTitle() }}</h2>
          <div class="workbench-meta">
            <span>Current line: {{ lineName }}</span>
            <span>Train as {{ sideToTrain === 'BLACK' ? 'Black' : 'White' }}</span>
            <span>{{ completedThisRun }} completed this run</span>
            <span>{{ completed ? 'Session complete' : 'In progress' }}</span>
          </div>
        </div>

        <nav class="workbench-mode-switch" aria-label="Marathon mode">
          <span class="mode-pill mode-pill-active">Marathon</span>
          <a class="mode-pill" *ngIf="lineId" [routerLink]="['/lines', lineId, 'edit']">Edit current tree</a>
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
            <h3 class="training-goal-title">Marathon goal</h3>
            <p class="training-goal-subtitle">
              Train one normal line session at a time. Line stats are updated exactly like regular line training.
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
              <span>Current line progress</span>
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
            <button type="button" (click)="finish()" [disabled]="completed">Finish current line</button>
          </div>

          <section *ngIf="completed" class="training-result-panel" [class.failed]="!passed || mistakesCount > 0">
            <h3 class="training-result-title">{{ passed && mistakesCount === 0 ? 'Clean run' : 'Needs review' }}</h3>
            <div class="training-result-meta">
              <span>Accuracy: {{ accuracy | percent:'1.0-0' }}</span>
              <span>Mistakes: {{ mistakesCount }}</span>
            </div>
            <div class="library-actions">
              <button type="button" (click)="startNextLine()">Next line</button>
              <a class="library-button-link secondary" [routerLink]="backLink">Stop marathon</a>
              <a class="library-button-link secondary" [routerLink]="['/lines', lineId, 'edit']">Edit tree</a>
            </div>
          </section>
        </aside>
      </div>

      <section *ngIf="completed" class="workbench-panel">
        <h3 class="workbench-panel-title">Mistake review</h3>
        <p class="workbench-panel-subtitle">Review missed moves for this line before moving to the next marathon line.</p>

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
        <p class="status-note">Loading marathon training...</p>
        <p *ngIf="error" class="status-error">{{ error }}</p>
        <a *ngIf="error" class="library-button-link secondary" [routerLink]="backLink">Back</a>
      </section>
    </ng-template>
  `,
})
export class TrainingMarathonPageComponent implements OnInit {
  scopeType: MarathonScopeType = 'CHAPTER';
  scopeId!: number;
  backLink: any[] = ['/library'];
  backLabel = 'Library';

  lineId!: number;
  lineName = '';
  chapterName = '';
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
  completedThisRun = 0;

  private recentLineIds: number[] = [];
  private completionCountedForSession = false;

  constructor(private route: ActivatedRoute, private api: ApiService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      const courseId = params.get('courseId');
      const chapterId = params.get('chapterId');

      if (courseId) {
        this.scopeType = 'COURSE';
        this.scopeId = Number(courseId);
        this.backLink = ['/courses', this.scopeId];
        this.backLabel = 'Course';
      } else {
        this.scopeType = 'CHAPTER';
        this.scopeId = Number(chapterId);
        this.backLink = ['/chapters', this.scopeId, 'lines'];
        this.backLabel = 'Chapter lines';
      }

      this.recentLineIds = [];
      this.completedThisRun = 0;
      this.startNextLine();
    });
  }

  startNextLine() {
    this.loaded = false;
    this.error = null;

    this.api
      .post<MarathonNextResponse>('/training-marathons/next', {
        scope: { type: this.scopeType, id: this.scopeId },
        recentLineIds: this.recentLineIds,
      })
      .subscribe({
        next: (res) => {
          this.lineId = res.line.id;
          this.lineName = res.line.name;
          this.chapterName = res.line.chapterName;
          this.sideToTrain = res.line.sideToTrain;

          this.sessionId = res.session.sessionId;
          this.currentFen = res.session.fen;
          this.expectedMove = res.session.expectedMove;
          this.mistakesCount = 0;
          this.completed = res.session.completed ?? false;
          this.passed = false;
          this.accuracy = null;
          this.feedback = null;
          this.feedbackCorrect = false;
          this.lastMove = null;
          this.showExpectedMove = false;
          this.mistakes = [];
          this.reviewLoading = false;
          this.completionCountedForSession = false;
          this.loaded = true;
          this.rememberLine(res.line.id);
          this.boardPositionVersion++;

          if (this.completed) {
            this.markCurrentLineComplete();
            this.loadReview();
          }

          this.cdr.detectChanges();
        },
        error: (err) => {
          this.error = err?.error?.message || err?.error?.error || 'Could not start marathon training.';
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
          this.markCurrentLineComplete();
          this.loadReview();
        }

        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = err?.error?.message || err?.error?.error || 'Could not play move.';
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
    this.api.post<any>(`/training/${this.sessionId}/complete`, {}).subscribe({
      next: (session) => {
        this.completed = true;
        this.passed = session.result === 'PASSED';
        this.accuracy = session.accuracy;
        this.mistakesCount = session.mistakesCount ?? this.mistakesCount;
        this.markCurrentLineComplete();
        this.loadReview();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = err?.error?.message || err?.error?.error || 'Could not finish training.';
        this.cdr.detectChanges();
      },
    });
  }

  marathonTitle() {
    return this.scopeType === 'COURSE' ? 'Course marathon' : 'Chapter marathon';
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

  private markCurrentLineComplete() {
    if (this.completionCountedForSession) return;
    this.completionCountedForSession = true;
    this.completedThisRun += 1;
  }

  private rememberLine(lineId: number) {
    this.recentLineIds = [...this.recentLineIds.filter((id) => id !== lineId), lineId].slice(-20);
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
