import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CourseReviewGroup } from '../data-access/course-review.models';

@Component({
  selector: 'app-course-review-issue-list',
  standalone: true,
  imports: [DatePipe, RouterLink],
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

  protected expectedMoves(group: CourseReviewGroup): string {
    return (
      group.expectedMoveSans.join(' or ') ||
      group.expectedMoveUcis.join(' or ') ||
      'a repertoire move'
    );
  }
}
