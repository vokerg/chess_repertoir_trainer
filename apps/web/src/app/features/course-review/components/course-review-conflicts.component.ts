import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PanelComponent } from '../../../shared/ui/panel/panel.component';
import { CourseReviewConflict } from '../data-access/course-review.models';

@Component({
  selector: 'app-course-review-conflicts',
  standalone: true,
  imports: [RouterLink, PanelComponent],
  templateUrl: './course-review-conflicts.component.html',
  styleUrl: './course-review-conflicts.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CourseReviewConflictsComponent {
  readonly conflicts = input.required<CourseReviewConflict[]>();
}
