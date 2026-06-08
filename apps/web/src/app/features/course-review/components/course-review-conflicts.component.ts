import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CourseReviewConflict } from '../data-access/course-review.models';

@Component({
  selector: 'app-course-review-conflicts',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './course-review-conflicts.component.html',
  styleUrl: './course-review-conflicts.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CourseReviewConflictsComponent {
  readonly conflicts = input.required<CourseReviewConflict[]>();
}
