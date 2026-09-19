import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LabExperimentPageHeaderComponent } from '../components/lab-experiment-page-header.component';
import { TrainingLogExperimentComponent } from '../experiments/training-log/training-log-experiment.component';

@Component({
  selector: 'app-lab-training-log-page',
  standalone: true,
  imports: [LabExperimentPageHeaderComponent, TrainingLogExperimentComponent],
  template: `
    <section class="stack">
      <app-lab-experiment-page-header
        title="Training log"
        subtitle="Review recent course, chapter, and line training attempts."
      />
      <app-lab-training-log />
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrainingLogPageComponent {}
