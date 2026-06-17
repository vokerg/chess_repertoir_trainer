import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { PageHeaderAction, PageHeaderComponent } from '../../../shared/ui/page-header/page-header.component';
import { MonthlyGamesExperimentComponent } from '../experiments/monthly-games/monthly-games-experiment.component';
import { OpeningStrugglesExperimentComponent } from '../experiments/opening-struggles/opening-struggles-experiment.component';
import { TopOpponentsExperimentComponent } from '../experiments/top-opponents/top-opponents-experiment.component';

type LabExperiment = 'top-opponents' | 'monthly-games' | 'opening-struggles';

@Component({
  selector: 'app-lab-page',
  standalone: true,
  imports: [
    PageHeaderComponent,
    TopOpponentsExperimentComponent,
    MonthlyGamesExperimentComponent,
    OpeningStrugglesExperimentComponent,
  ],
  templateUrl: './lab-page.component.html',
  styleUrl: './lab-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LabPageComponent {
  protected readonly selected = signal<LabExperiment | null>(null);
  protected readonly headerActions = computed<readonly PageHeaderAction[]>(() => this.selected()
    ? [{ id: 'all-experiments', label: 'All experiments', run: () => this.selected.set(null) }]
    : []);

  protected selectExperiment(experiment: LabExperiment): void {
    this.selected.set(experiment);
  }
}
