import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LabExperimentPageHeaderComponent } from '../components/lab-experiment-page-header.component';
import { MonthlyGamesExperimentComponent } from '../experiments/monthly-games/monthly-games-experiment.component';

@Component({
  selector: 'app-lab-monthly-games-page',
  standalone: true,
  imports: [LabExperimentPageHeaderComponent, MonthlyGamesExperimentComponent],
  template: `
    <section class="stack">
      <app-lab-experiment-page-header
        title="Monthly games"
        subtitle="Review monthly results and opponent rating snapshots."
      />
      <app-lab-monthly-games />
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MonthlyGamesPageComponent {}
