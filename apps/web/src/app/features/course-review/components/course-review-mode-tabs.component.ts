import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { CourseReviewMode, CourseReviewModeTab } from '../helpers/course-review-mode';

@Component({
  selector: 'app-course-review-mode-tabs',
  standalone: true,
  templateUrl: './course-review-mode-tabs.component.html',
  styleUrl: './course-review-mode-tabs.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CourseReviewModeTabsComponent {
  readonly tabs = input.required<readonly CourseReviewModeTab[]>();
  readonly activeMode = input.required<CourseReviewMode>();
  readonly modeChange = output<CourseReviewMode>();
}
