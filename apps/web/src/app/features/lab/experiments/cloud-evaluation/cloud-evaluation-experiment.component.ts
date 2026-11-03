import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { PanelComponent } from '../../../../shared/ui/panel/panel.component';
import { CloudEvaluationApiService } from './data-access/cloud-evaluation-api.service';
import { CloudEvaluationStore } from './state/cloud-evaluation.store';

@Component({
  selector: 'app-lab-cloud-evaluation',
  standalone: true,
  imports: [PanelComponent],
  providers: [CloudEvaluationApiService, CloudEvaluationStore],
  templateUrl: './cloud-evaluation-experiment.component.html',
  styleUrl: './cloud-evaluation-experiment.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CloudEvaluationExperimentComponent {
  protected readonly store = inject(CloudEvaluationStore);
  protected readonly formattedResult = computed(() => {
    const result = this.store.result();
    return result ? JSON.stringify(result, null, 2) : '';
  });

  protected updateFen(event: Event): void {
    this.store.fen.set((event.target as HTMLTextAreaElement).value);
    this.store.result.set(null);
    this.store.error.set(null);
  }

  protected evaluationLabel(scoreCpWhite?: number | null, mateWhite?: number | null): string {
    if (typeof mateWhite === 'number') return (mateWhite > 0 ? '+' : '') + '#' + mateWhite;
    if (typeof scoreCpWhite === 'number') {
      const score = scoreCpWhite / 100;
      return (score > 0 ? '+' : '') + score.toFixed(2);
    }
    return '—';
  }
}
