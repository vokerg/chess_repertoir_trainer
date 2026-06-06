import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ApiService } from '../services/api.service';
import { ActiveTrainingSession, TrainingSessionComponent, TrainingSessionCompletedEvent } from '../components/training-session.component';

@Component({
  selector: 'app-line-train-page',
  standalone: true,
  imports: [CommonModule, RouterModule, TrainingSessionComponent],
  template: `
    <section *ngIf="loaded; else loadingState" class="stack">
      <header class="workbench-header">
        <div class="workbench-title-group">
          <a routerLink="/library" class="workbench-breadcrumb">← Library / Training focus</a>
          <h2 class="workbench-title">{{ lineName }}</h2>
          <div class="workbench-meta">
            <span>Train as {{ sideToTrain === 'BLACK' ? 'Black' : 'White' }}</span>
            <span>{{ sessionCompleted ? 'Session complete' : 'In progress' }}</span>
          </div>
        </div>

        <nav class="workbench-mode-switch" aria-label="Line mode">
          <span class="mode-pill mode-pill-active">Train</span>
          <a class="mode-pill" [routerLink]="['/lines', lineId, 'edit']">Edit tree</a>
        </nav>
      </header>

      <p *ngIf="error" class="status-error">{{ error }}</p>

      <app-training-session
        [session]="session"
        [sideToTrain]="sideToTrain"
        [secondaryActionLink]="['/library']"
        secondaryActionLabel="Back to library"
        [editActionLink]="['/lines', lineId, 'edit']"
        (primaryAction)="startTraining()"
        (sessionCompleted)="onSessionCompleted($event)"
      ></app-training-session>
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
  session: ActiveTrainingSession | null = null;
  sessionCompleted = false;
  loaded = false;
  error: string | null = null;

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
            this.session = session;
            this.sessionCompleted = session.completed ?? false;
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

  onSessionCompleted(_event: TrainingSessionCompletedEvent) {
    this.sessionCompleted = true;
  }
}
