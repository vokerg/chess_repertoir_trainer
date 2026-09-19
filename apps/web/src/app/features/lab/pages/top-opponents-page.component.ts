import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LabExperimentPageHeaderComponent } from '../components/lab-experiment-page-header.component';
import { TopOpponentsExperimentComponent } from '../experiments/top-opponents/top-opponents-experiment.component';

@Component({
  selector: 'app-lab-top-opponents-page',
  standalone: true,
  imports: [LabExperimentPageHeaderComponent, TopOpponentsExperimentComponent],
  template: `
    <section class="stack">
      <app-lab-experiment-page-header
        title="Top opponents"
        subtitle="Review imported games grouped by opponent."
      />
      <app-lab-top-opponents />
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopOpponentsPageComponent {}
