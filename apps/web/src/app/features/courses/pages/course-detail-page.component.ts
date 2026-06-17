import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { distinctUntilChanged, map } from 'rxjs';
import { PageHeaderAction, PageHeaderComponent, PageHeaderStat } from '../../../shared/ui/page-header/page-header.component';
import { CourseDetailApiService } from '../data-access/course-detail-api.service';
import { CourseDetailStore } from '../state/course-detail.store';
import { SublinesListComponent } from '../components/sublines/sublines-list.component';

@Component({
  selector: 'app-course-detail-page',
  standalone: true,
  imports: [FormsModule, RouterLink, PageHeaderComponent, SublinesListComponent],
  providers: [CourseDetailApiService, CourseDetailStore],
  templateUrl: './course-detail-page.component.html',
  styleUrl: './course-detail-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CourseDetailPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly store = inject(CourseDetailStore);
  protected readonly headerStats = computed<readonly PageHeaderStat[]>(() => [
    { id: 'chapters', label: 'Chapters', value: this.store.chapters().length },
    { id: 'lines', label: 'Lines', value: this.store.stats()?.totalLines ?? 0 },
    { id: 'attempts', label: 'Attempts', value: this.store.stats()?.totalAttempts ?? 0 },
    { id: 'pass-rate', label: 'Pass rate', value: `${Math.round((this.store.stats()?.passRate ?? 0) * 100)}%` },
  ]);
  protected readonly headerActions = computed<readonly PageHeaderAction[]>(() => {
    const courseId = this.store.courseId();
    if (!courseId) return [];
    return [
      { id: 'back', label: 'Back', link: '/courses' },
      { id: 'marathon', label: 'Marathon', link: ['/courses', courseId, 'marathon'] },
      { id: 'review', label: 'Review', link: ['/courses', courseId, 'review'] },
      ...(!this.store.editingCourseName()
        ? [{ id: 'rename', label: 'Rename', disabled: !this.store.course(), run: () => this.store.startCourseEdit() }]
        : []),
      {
        id: 'delete',
        label: this.store.deletingCourse() ? 'Deleting...' : 'Delete',
        disabled: this.store.deletingCourse(),
        run: () => this.store.deleteCourse(),
      },
    ];
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
