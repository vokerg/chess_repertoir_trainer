import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CourseReviewGroup } from '../data-access/course-review.models';
import { CourseReviewIssueCardComponent } from './course-review-issue-card.component';

@Component({
  selector: 'app-course-review-issue-list',
  standalone: true,
  imports: [CourseReviewIssueCardComponent],
  templateUrl: './course-review-issue-list.component.html',
  styleUrl: './course-review-issue-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CourseReviewIssueListComponent {
  readonly title = input.required<string>();
  readonly eyebrow = input.required<string>();
  readonly emptyMessage = input.required<string>();
  readonly groups = input.required<CourseReviewGroup[]>();
  readonly opponent = input(false);
}
