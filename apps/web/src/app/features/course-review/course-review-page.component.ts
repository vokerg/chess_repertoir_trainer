import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { distinctUntilChanged, map } from 'rxjs';
import { CourseReviewConflictsComponent } from './components/course-review-conflicts.component';
import { CourseReviewIssueListComponent } from './components/course-review-issue-list.component';
import { CourseReviewStore } from './state/course-review.store';

@Component({
  selector: 'app-course-review-page',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    CourseReviewConflictsComponent,
    CourseReviewIssueListComponent,
  ],
  providers: [CourseReviewStore],
  templateUrl: './course-review-page.component.html',
  styleUrl: './course-review-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CourseReviewPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly store = inject(CourseReviewStore);

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        map((params) => Number(params.get('courseId'))),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((courseId) => this.store.initialize(courseId));
  }
}
