import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LabExperimentPageHeaderComponent } from '../components/lab-experiment-page-header.component';
import { PerformanceByRatingExperimentComponent } from '../experiments/performance-by-rating/performance-by-rating-experiment.component';

@Component({
  selector: 'app-lab-performance-by-rating-page',
  standalone: true,
  imports: [LabExperimentPageHeaderComponent, PerformanceByRatingExperimentComponent],
  template: `
    <section class="stack">
      <app-lab-experiment-page-header
        title="Performance by rating"
        subtitle="Compare results across opponent rating bands, providers, and speeds."
      />
      <app-lab-performance-by-rating />
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PerformanceByRatingPageComponent {}
