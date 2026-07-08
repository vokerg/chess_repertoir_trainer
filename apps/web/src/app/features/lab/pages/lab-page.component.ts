import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { PageHeaderAction, PageHeaderComponent } from '../../../shared/ui/page-header/page-header.component';
import { MonthlyGamesExperimentComponent } from '../experiments/monthly-games/monthly-games-experiment.component';
import { TacticalDetectionsExperimentComponent } from '../experiments/tactical-detections/tactical-detections-experiment.component';
import { TrainingLogExperimentComponent } from '../experiments/training-log/training-log-experiment.component';
import { TopOpponentsExperimentComponent } from '../experiments/top-opponents/top-opponents-experiment.component';

type LabExperiment = 'top-opponents' | 'monthly-games' | 'tactical-detections' | 'training-log';

@Component({
  selector: 'app-lab-page',
  standalone: true,
  imports: [
    PageHeaderComponent,
    TopOpponentsExperimentComponent,
    MonthlyGamesExperimentComponent,
    TacticalDetectionsExperimentComponent,
    TrainingLogExperimentComponent,
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
