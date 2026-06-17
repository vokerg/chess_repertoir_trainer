import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { distinctUntilChanged, map } from 'rxjs';
import { PageHeaderComponent, PageHeaderStat } from '../../../shared/ui/page-header/page-header.component';
import { GameFilterPanelComponent } from '../../../shared/games/filters/game-filter-panel.component';
import { CourseReviewConflictsComponent } from '../components/course-review-conflicts.component';
import { CourseReviewIssueListComponent } from '../components/course-review-issue-list.component';
import { CourseReviewStore } from '../state/course-review.store';

@Component({
  selector: 'app-course-review-page',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    PageHeaderComponent,
    GameFilterPanelComponent,
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
  protected readonly headerStats = computed<readonly PageHeaderStat[]>(() => {
    const course = this.store.course();
    if (!course) return [];
    const stats: PageHeaderStat[] = [
      { id: 'lines', label: 'Lines', value: course.lineCount },
      { id: 'moves', label: 'Moves', value: course.moveCount },
    ];
    if (course.sideToTrain && !course.hasMixedSides) {
      stats.push({
        id: 'side',
        label: 'Training side',
        value: course.sideToTrain === 'WHITE' ? 'White' : 'Black',
      });
    }
    return stats;
  });

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
