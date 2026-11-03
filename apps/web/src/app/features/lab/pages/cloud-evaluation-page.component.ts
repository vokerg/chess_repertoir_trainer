import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LabExperimentPageHeaderComponent } from '../components/lab-experiment-page-header.component';
import { CloudEvaluationExperimentComponent } from '../experiments/cloud-evaluation/cloud-evaluation-experiment.component';

@Component({
  selector: 'app-lab-cloud-evaluation-page',
  standalone: true,
  imports: [LabExperimentPageHeaderComponent, CloudEvaluationExperimentComponent],
  template: `
    <section class="stack">
      <app-lab-experiment-page-header
        title="Lichess cloud evaluation"
        subtitle="Test externally cached Stockfish evaluations for a FEN."
      />
      <app-lab-cloud-evaluation />
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CloudEvaluationPageComponent {}
