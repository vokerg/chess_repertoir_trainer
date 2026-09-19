import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LabExperimentPageHeaderComponent } from '../components/lab-experiment-page-header.component';
import { TacticalDetectionsExperimentComponent } from '../experiments/tactical-detections/tactical-detections-experiment.component';

@Component({
  selector: 'app-lab-tactical-detections-page',
  standalone: true,
  imports: [LabExperimentPageHeaderComponent, TacticalDetectionsExperimentComponent],
  template: `
    <section class="stack">
      <app-lab-experiment-page-header
        title="Tactical detections"
        subtitle="Review missed shots and blunders found in analysed games."
      />
      <app-lab-tactical-detections />
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TacticalDetectionsPageComponent {}
