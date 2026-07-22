import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LabExperimentPageHeaderComponent } from '../components/lab-experiment-page-header.component';
import { CourseExtensionCandidatesExperimentComponent } from '../experiments/course-extension-candidates/course-extension-candidates-experiment.component';

@Component({
  selector: 'app-lab-course-extension-candidates-page',
  standalone: true,
  imports: [LabExperimentPageHeaderComponent, CourseExtensionCandidatesExperimentComponent],
  template: `
    <section class="stack">
      <app-lab-experiment-page-header
        title="Course extension candidates"
        subtitle="Find course lines that stop before opponent continuations you face regularly."
      />
      <app-lab-course-extension-candidates />
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CourseExtensionCandidatesPageComponent {}
