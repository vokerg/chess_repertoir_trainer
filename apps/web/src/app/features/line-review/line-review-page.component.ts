import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import {
  LineCoverageApiService,
  LineCoverageGame,
  LineCoverageResponse,
} from './line-coverage-api.service';

@Component({
  selector: 'app-line-review-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <section class="stack">
      <p *ngIf="loading" class="status-note">Loading line coverage...</p>
      <p *ngIf="error" class="status-error">{{ error }}</p>

      <ng-container *ngIf="coverage as data">
        <header class="workbench-header">
          <div class="workbench-title-group">
            <a
              [routerLink]="['/chapters', data.line.chapterId, 'lines']"
              class="workbench-breadcrumb"
              >&larr; Back to chapter</a
            >
            <span class="eyebrow">Line review</span>
            <h2 class="workbench-title">{{ data.line.name }}</h2>
            <div class="workbench-meta">
              <span>Train as {{ data.line.sideToTrain === 'WHITE' ? 'White' : 'Black' }}</span>
              <span>Repertoire updated: {{ data.line.repertoireUpdatedAt | date: 'medium' }}</span>
            </div>
          </div>
          <nav class="workbench-mode-switch" aria-label="Line mode">
            <a class="mode-pill" [routerLink]="['/lines', lineId, 'edit']">Build</a>
            <a class="mode-pill" [routerLink]="['/lines', lineId, 'train']">Train</a>
            <span class="mode-pill mode-pill-active">Review</span>
          </nav>
        </header>

        <p class="page-subtitle">
          Showing imported games since this line was last meaningfully updated.
        </p>
        <p *ngIf="!data.line.hasMoves" class="status-note">
          This line has no moves yet, so coverage cannot identify deviations.
        </p>
        <p *ngIf="data.summary.unindexedGames > 0" class="status-note">
          Some games have not been indexed yet and were skipped.
        </p>

        <div class="grid-auto">
          <div class="metric-card">
            <p class="metric-label">Games since update</p>
            <p class="metric-value">{{ data.summary.gamesSinceUpdate }}</p>
          </div>
          <div class="metric-card">
            <p class="metric-label">Reached line</p>
            <p class="metric-value">{{ data.summary.reachedLine }}</p>
          </div>
          <div class="metric-card">
            <p class="metric-label">Matched line</p>
            <p class="metric-value">{{ data.summary.matchedLine }}</p>
          </div>
          <div class="metric-card">
            <p class="metric-label">My deviations</p>
            <p class="metric-value">{{ data.summary.userDeviations }}</p>
          </div>
          <div class="metric-card">
            <p class="metric-label">Opponent uncovered</p>
            <p class="metric-value">{{ data.summary.opponentUncovered }}</p>
          </div>
          <div class="metric-card">
            <p class="metric-label">Line ended</p>
            <p class="metric-value">{{ data.summary.lineEnded }}</p>
          </div>
          <div class="metric-card">
            <p class="metric-label">Unindexed</p>
            <p class="metric-value">{{ data.summary.unindexedGames }}</p>
          </div>
        </div>

        <div *ngIf="data.summary.gamesSinceUpdate === 0" class="empty-state">
          No imported games found since this line was last updated.
        </div>

        <div class="detail-grid" *ngIf="data.summary.gamesSinceUpdate > 0">
          <section class="section-card stack">
            <div>
              <span class="eyebrow">My play</span>
              <h3 class="collection-title">My deviations</h3>
            </div>
            <div *ngIf="userDeviations.length === 0" class="empty-state">
              No personal deviations found in indexed games since this line was updated.
            </div>
            <article class="collection-card stack" *ngFor="let item of userDeviations">
              <div>
                <strong>{{ item.endedAt | date: 'mediumDate' }}</strong> vs
                {{ item.opponentUsername || 'Unknown opponent' }}
                <span class="pill">{{ item.resultForUser || 'Unknown result' }}</span>
              </div>
              <p class="collection-description">
                Move {{ moveNumber(item.plyNumber) }}: expected {{ expectedMoves(item) }}, played
                {{ playedMove(item) }}.
              </p>
              <div class="collection-actions">
                <a [routerLink]="['/games', item.gameId]">Open review</a>
                <a
                  *ngIf="item.providerUrl"
                  [href]="item.providerUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  >Open on {{ item.provider }}</a
                >
              </div>
            </article>
          </section>

          <section class="section-card stack">
            <div>
              <span class="eyebrow">Opponent play</span>
              <h3 class="collection-title">Uncovered moves</h3>
            </div>
            <div *ngIf="opponentUncovered.length === 0" class="empty-state">
              No uncovered opponent moves found in indexed games since this line was updated.
            </div>
            <article class="collection-card stack" *ngFor="let item of opponentUncovered">
              <div>
                <strong>{{ item.endedAt | date: 'mediumDate' }}</strong> vs
                {{ item.opponentUsername || 'Unknown opponent' }}
                <span class="pill">{{ item.resultForUser || 'Unknown result' }}</span>
              </div>
              <p class="collection-description">
                Move {{ moveNumber(item.plyNumber) }}: opponent played {{ playedMove(item) }}, which
                is not covered in this line.
              </p>
              <div class="collection-actions">
                <a [routerLink]="['/games', item.gameId]">Open review</a>
                <a
                  *ngIf="item.providerUrl"
                  [href]="item.providerUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  >Open on {{ item.provider }}</a
                >
              </div>
            </article>
          </section>
        </div>
      </ng-container>
    </section>
  `,
})
export class LineReviewPageComponent implements OnInit {
  lineId = 0;
  coverage: LineCoverageResponse | null = null;
  loading = true;
  error: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private coverageApi: LineCoverageApiService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      this.lineId = Number(params.get('lineId'));
      this.loadCoverage();
    });
  }

  get userDeviations() {
    return this.coverage?.deviations.filter((item) => item.status === 'USER_DEVIATION') ?? [];
  }

  get opponentUncovered() {
    return this.coverage?.deviations.filter((item) => item.status === 'OPPONENT_UNCOVERED') ?? [];
  }

  loadCoverage() {
    this.loading = true;
    this.error = null;
    this.coverageApi.getLineCoverage(this.lineId).subscribe({
      next: (coverage) => {
        this.coverage = coverage;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = err?.error?.message || err?.error?.error || 'Could not load line coverage.';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  moveNumber(plyNumber: number | null) {
    return plyNumber == null ? '?' : Math.ceil(plyNumber / 2);
  }

  expectedMoves(item: LineCoverageGame) {
    return item.expectedMoveSans.length
      ? item.expectedMoveSans.join(' or ')
      : item.expectedMoveUcis.join(' or ') || 'a repertoire move';
  }

  playedMove(item: LineCoverageGame) {
    return item.playedSan || item.playedMoveUci || 'an unknown move';
  }
}
