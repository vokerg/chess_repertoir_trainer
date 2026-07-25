import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { PanelComponent } from '../../../shared/ui/panel/panel.component';
import type { CourseReviewFindingViewModel } from '../helpers/course-review-finding.mapper';
import { CourseReviewIssueCardComponent } from './course-review-issue-card.component';

@Component({
  selector: 'app-course-review-issue-list',
  standalone: true,
  imports: [PanelComponent, CourseReviewIssueCardComponent],
  templateUrl: './course-review-issue-list.component.html',
  styleUrl: './course-review-issue-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CourseReviewIssueListComponent {
  readonly title = input.required<string>();
  readonly subtitle = input<string>();
  readonly emptyMessage = input.required<string>();
  readonly findings = input.required<readonly CourseReviewFindingViewModel[]>();
}
