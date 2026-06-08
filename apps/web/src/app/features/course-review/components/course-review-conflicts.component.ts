import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CourseReviewConflict } from '../data-access/course-review.models';

@Component({
  selector: 'app-course-review-conflicts',
  standalone: true,
  templateUrl: './course-review-conflicts.component.html',
  styleUrl: './course-review-conflicts.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CourseReviewConflictsComponent {
  readonly conflicts = input.required<CourseReviewConflict[]>();

  protected lineNames(refs: Array<{ lineName: string }>): string {
    return [...new Set(refs.map((ref) => ref.lineName))].join(', ');
  }
}
