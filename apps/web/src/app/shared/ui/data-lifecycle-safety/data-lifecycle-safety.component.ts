import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type {
  DataLifecycleOperationResponse,
  DataLifecyclePreviewResponse,
} from '@chess-trainer/contracts/data-lifecycle';
import { FactGridComponent, type UiFactItem } from '../fact-grid/fact-grid.component';

@Component({
  selector: 'app-data-lifecycle-safety',
  standalone: true,
  imports: [DatePipe, FactGridComponent, FormsModule],
  templateUrl: './data-lifecycle-safety.component.html',
  styleUrl: './data-lifecycle-safety.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataLifecycleSafetyComponent {
  readonly preview = input<DataLifecyclePreviewResponse | null>(null);
  readonly operation = input<DataLifecycleOperationResponse | null>(null);
  readonly targetLabel = input('selected target');
  readonly confirmation = input('');
  readonly busy = input(false);
  readonly error = input<string | null>(null);

  readonly confirmationChange = output<string>();
  readonly execute = output<void>();
  readonly refresh = output<void>();
  readonly stop = output<void>();

  protected readonly impactFacts = computed<readonly UiFactItem[]>(() => {
    const counts = this.preview()?.previewCounts;
    if (!counts) return [];
    return [
      { id: 'accounts', label: 'External accounts', value: counts.accounts, mono: true },
      { id: 'games', label: 'Imported games', value: counts.games, mono: true },
      { id: 'plies', label: 'Plies', value: counts.plies, mono: true },
      { id: 'analysis-runs', label: 'Analysis runs', value: counts.analysisRuns, mono: true },
      { id: 'ai-reviews', label: 'AI reviews', value: counts.aiReviews, mono: true },
      {
        id: 'tactical-detections',
        label: 'Tactical detections',
        value: counts.tacticalDetections,
        mono: true,
      },
      {
        id: 'scenario-sessions',
        label: 'Scenario sessions',
        value: counts.scenarioSessions,
        mono: true,
      },
      { id: 'import-runs', label: 'Import runs', value: counts.importRuns, mono: true },
      { id: 'job-runs', label: 'Job runs', value: counts.jobRuns, mono: true },
      {
        id: 'preparation-runs',
        label: 'Preparation runs',
        value: counts.preparationRuns,
        mono: true,
      },
    ];
  });

  protected readonly canExecute = computed(() => {
    const preview = this.preview();
    const operation = this.operation();
    return Boolean(
      preview &&
      operation &&
      (operation.status === 'PREVIEWED' || operation.status === 'NEEDS_ATTENTION') &&
      this.confirmation() === preview.confirmationPhrase &&
      !this.busy(),
    );
  });

  protected readonly executeLabel = computed(() =>
    this.operation()?.status === 'NEEDS_ATTENTION' ? 'Reverify and resume' : 'Reverify and execute',
  );

  protected readonly canStop = computed(() => {
    const status = this.operation()?.status;
    return Boolean(status && !['COMPLETED', 'FAILED', 'CANCELLED', 'EXPIRED'].includes(status));
  });
}
