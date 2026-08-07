import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { distinctUntilChanged, map } from 'rxjs';
import { PageHeaderAction, PageHeaderComponent, PageHeaderStat } from '../../../shared/ui/page-header/page-header.component';
import { PanelComponent } from '../../../shared/ui/panel/panel.component';
import { ConfirmDialogService } from '../../../shared/ui/confirm-dialog/confirm-dialog.service';
import { CourseDetailApiService } from '../data-access/course-detail-api.service';
import { CourseChapter } from '../data-access/course-detail.models';
import { CourseDetailStore } from '../state/course-detail.store';
import { SublinesListComponent } from '../components/sublines/sublines-list.component';

@Component({
  selector: 'app-course-detail-page',
  standalone: true,
  imports: [FormsModule, RouterLink, PageHeaderComponent, PanelComponent, SublinesListComponent],
  providers: [CourseDetailApiService, CourseDetailStore],
  templateUrl: './course-detail-page.component.html',
  styleUrl: './course-detail-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CourseDetailPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly confirmDialog = inject(ConfirmDialogService);
  protected readonly store = inject(CourseDetailStore);
  protected readonly routeCourseId = signal<number | null>(null);
  protected readonly loadedCourse = computed(() => {
    const routeCourseId = this.routeCourseId();
    const course = this.store.course();
    return course && routeCourseId === course.id ? course : null;
  });
  protected readonly headerStats = computed<readonly PageHeaderStat[]>(() => {
    if (!this.loadedCourse()) return [];
    return [
      { id: 'chapters', label: 'Chapters', value: this.store.chapters().length },
      { id: 'sublines', label: 'Active sublines', value: this.store.stats()?.activeSublineCount ?? 0 },
    ];
  });
  protected readonly headerActions = computed<readonly PageHeaderAction[]>(() => {
    const backAction: PageHeaderAction = { id: 'back', label: 'Back', link: ['/courses'] };
    const course = this.loadedCourse();
    const courseId = this.routeCourseId();
    if (!course || !courseId) return [backAction];

    return [
      backAction,
      { id: 'marathon', label: 'Marathon', link: ['/courses', courseId, 'marathon'] },
      { id: 'review', label: 'Review', link: ['/courses', courseId, 'review'] },
      ...(!this.store.editingCourseName()
        ? [{ id: 'rename', label: 'Rename', run: () => this.store.startCourseEdit() }]
        : []),
      {
        id: 'delete',
        label: this.store.deletingCourse() ? 'Deleting...' : 'Delete',
        disabled: this.store.deletingCourse(),
        run: () => void this.confirmDeleteCurrentCourse(),
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
      .subscribe((courseId) => {
        this.routeCourseId.set(Number.isFinite(courseId) && courseId > 0 ? courseId : null);
        this.store.initialize(courseId);
      });
  }

  protected async confirmDeleteChapter(chapter: CourseChapter): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Delete chapter?',
      message: `Delete chapter "${chapter.name}" and all lines inside it? This cannot be undone.`,
      tone: 'danger',
      confirmLabel: 'Delete chapter',
      cancelLabel: 'Cancel',
    });

    if (confirmed) void this.store.deleteChapter(chapter);
  }

  protected async confirmDeleteCurrentCourse(): Promise<void> {
    const course = this.loadedCourse();
    if (!course) return;

    const confirmed = await this.confirmDialog.confirm({
      title: 'Delete course?',
      message: `Delete "${course.name}" and everything inside it? This cannot be undone.`,
      tone: 'danger',
      confirmLabel: 'Delete course',
      cancelLabel: 'Cancel',
      requireTypedConfirmation: course.name,
    });

    if (confirmed) void this.store.deleteCourse();
  }
}
