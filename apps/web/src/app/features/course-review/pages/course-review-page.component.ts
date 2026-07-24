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
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { combineLatest, distinctUntilChanged, map } from 'rxjs';
import { GameFilterPanelComponent } from '../../../shared/games/filters/game-filter-panel.component';
import { PageHeaderComponent, PageHeaderStat } from '../../../shared/ui/page-header/page-header.component';
import { PanelComponent } from '../../../shared/ui/panel/panel.component';
import { CourseReviewConflictsComponent } from '../components/course-review-conflicts.component';
import { CourseReviewIssueListComponent } from '../components/course-review-issue-list.component';
import { CourseReviewModeTabsComponent } from '../components/course-review-mode-tabs.component';
import {
  courseReviewModeFromQuery,
  courseReviewModeToQuery,
  type CourseReviewMode,
  type CourseReviewModeTab,
} from '../helpers/course-review-mode';
import { CourseReviewStore } from '../state/course-review.store';

@Component({
  selector: 'app-course-review-page',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    PageHeaderComponent,
    PanelComponent,
    GameFilterPanelComponent,
    CourseReviewConflictsComponent,
    CourseReviewIssueListComponent,
    CourseReviewModeTabsComponent,
  ],
  providers: [CourseReviewStore],
  templateUrl: './course-review-page.component.html',
  styleUrl: './course-review-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CourseReviewPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly store = inject(CourseReviewStore);

  protected readonly headerStats = computed<readonly PageHeaderStat[]>(() => {
    const course = this.store.course();
    if (!course) return [];
    const stats: PageHeaderStat[] = [{ id: 'lines', label: 'Lines', value: course.lineCount }];
    if (course.moveCount !== null) {
      stats.push({ id: 'moves', label: 'Moves', value: course.moveCount });
    }
    if (course.sideToTrain && !course.hasMixedSides) {
      stats.push({
        id: 'side',
        label: 'Training side',
        value: course.sideToTrain === 'WHITE' ? 'White' : 'Black',
      });
    }
    return stats;
  });

  protected readonly modeTabs = computed<readonly CourseReviewModeTab[]>(() => [
    {
      id: 'MY_DEVIATIONS',
      label: 'My deviations',
      count: this.store.review()?.summary.myDeviations ?? null,
    },
    {
      id: 'OPPONENT_GAPS',
      label: 'Opponent gaps',
      count: this.store.review()?.summary.opponentUncovered ?? null,
    },
    {
      id: 'COURSE_ENDINGS',
      label: 'Course endings',
      count: this.store.endings()?.summary.qualifyingContinuations ?? null,
    },
  ]);

  protected readonly resultTitle = computed(() => {
    switch (this.store.activeMode()) {
      case 'MY_DEVIATIONS':
        return 'My deviations';
      case 'OPPONENT_GAPS':
        return 'Opponent gaps';
      case 'COURSE_ENDINGS':
        return 'Course endings';
    }
  });

  protected readonly resultSubtitle = computed(() => {
    switch (this.store.activeMode()) {
      case 'MY_DEVIATIONS':
        return 'Positions where your move left the course repertoire.';
      case 'OPPONENT_GAPS':
        return 'Opponent moves encountered before the course line ended but not covered by it.';
      case 'COURSE_ENDINGS':
        return 'Common opponent continuations after one of your course lines ends.';
    }
  });

  protected readonly emptyMessage = computed(() => {
    switch (this.store.activeMode()) {
      case 'MY_DEVIATIONS':
        return 'No personal deviations found with the current filters.';
      case 'OPPONENT_GAPS':
        return 'No uncovered opponent moves found with the current filters.';
      case 'COURSE_ENDINGS':
        return `No opponent continuations were seen in at least ${this.store.minGames()} games.`;
    }
  });

  protected readonly actionLabel = computed(() => {
    if (this.store.loading()) return 'Checking...';
    return this.store.activeMode() === 'COURSE_ENDINGS' ? 'Find endings' : 'Review';
  });

  ngOnInit(): void {
    combineLatest([this.route.paramMap, this.route.queryParamMap])
      .pipe(
        map(([params, query]) => ({
          courseId: Number(params.get('courseId')),
          mode: courseReviewModeFromQuery(query.get('view')),
        })),
        distinctUntilChanged(
          (previous, current) =>
            previous.courseId === current.courseId && previous.mode === current.mode,
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(({ courseId, mode }) => this.store.initialize(courseId, mode));
  }

  protected selectMode(mode: CourseReviewMode): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { view: courseReviewModeToQuery(mode) },
      queryParamsHandling: 'merge',
    });
  }
}
