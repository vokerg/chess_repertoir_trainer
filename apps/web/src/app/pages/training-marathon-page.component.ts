import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ApiService } from '../services/api.service';
import { ActiveTrainingSession, TrainingSessionComponent, TrainingSessionCompletedEvent } from '../components/training-session.component';

type MarathonScopeType = 'CHAPTER' | 'COURSE';

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
  imports: [CommonModule, RouterModule, TrainingSessionComponent],
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
            <span>{{ sessionCompleted ? 'Session complete' : 'In progress' }}</span>
          </div>
        </div>

        <nav class="workbench-mode-switch" aria-label="Marathon mode">
          <span class="mode-pill mode-pill-active">Marathon</span>
          <a class="mode-pill" *ngIf="lineId" [routerLink]="['/lines', lineId, 'edit']">Edit current tree</a>
        </nav>
      </header>

      <p *ngIf="error" class="status-error">{{ error }}</p>

      <app-training-session
        [session]="session"
        [sideToTrain]="sideToTrain"
        goalTitle="Marathon goal"
        goalSubtitle="Train one normal line session at a time. Line stats are updated exactly like regular line training."
        progressTitle="Current line progress"
        finishButtonLabel="Finish current line"
        primaryActionLabel="Next line"
        secondaryActionLabel="Stop marathon"
        [secondaryActionLink]="backLink"
        [editActionLink]="['/lines', lineId, 'edit']"
        reviewSubtitle="Review missed moves for this line before moving to the next marathon line."
        (primaryAction)="startNextLine()"
        (sessionCompleted)="onSessionCompleted($event)"
      ></app-training-session>
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
  session: ActiveTrainingSession | null = null;
  sessionCompleted = false;
  loaded = false;
  error: string | null = null;
  completedThisRun = 0;

  private recentLineIds: number[] = [];
  private countedCompletedSessionIds = new Set<number>();

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
      this.countedCompletedSessionIds.clear();
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
          this.session = res.session;
          this.sessionCompleted = res.session.completed ?? false;
          this.loaded = true;
          this.rememberLine(res.line.id);

          this.cdr.detectChanges();
        },
        error: (err) => {
          this.error = err?.error?.message || err?.error?.error || 'Could not start marathon training.';
          this.cdr.detectChanges();
        },
      });
  }

  marathonTitle() {
    return this.scopeType === 'COURSE' ? 'Course marathon' : 'Chapter marathon';
  }

  onSessionCompleted(event: TrainingSessionCompletedEvent) {
    this.sessionCompleted = true;
    if (this.countedCompletedSessionIds.has(event.sessionId)) return;
    this.countedCompletedSessionIds.add(event.sessionId);
    this.completedThisRun += 1;
  }

  private rememberLine(lineId: number) {
    this.recentLineIds = [...this.recentLineIds.filter((id) => id !== lineId), lineId].slice(-20);
  }
}
