import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { distinctUntilChanged, map } from 'rxjs';
import { PanelComponent } from '../../../shared/ui/panel/panel.component';
import { ConfirmDialogService } from '../../../shared/ui/confirm-dialog/confirm-dialog.service';
import { CourseDetailApiService } from '../data-access/course-detail-api.service';
import { CourseOverviewChapter } from '../data-access/course-detail.models';
import { CourseDetailStore } from '../state/course-detail.store';
import { SublinesListComponent } from '../components/sublines/sublines-list.component';
import { CourseCoverPickerComponent } from '../components/course-cover-picker/course-cover-picker.component';
import { courseCoverOption, courseSideLabel, percentLabel } from '../helpers/course-presentation';

@Component({
  selector: 'app-course-detail-page',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    PanelComponent,
    SublinesListComponent,
    CourseCoverPickerComponent,
  ],
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
  protected readonly chapterFormOpen = signal(false);
  protected readonly loadedCourse = computed(() => {
    const routeCourseId = this.routeCourseId();
    const course = this.store.course();
    return course && routeCourseId === course.id ? course : null;
  });
  protected readonly courseCover = computed(() => {
    const course = this.loadedCourse();
    return course ? courseCoverOption(course.id, course.side, course.coverKey) : null;
  });
  protected readonly courseSide = computed(() => {
    const course = this.loadedCourse();
    return course ? courseSideLabel(course.side) : '';
  });
  protected readonly coursePassRate = computed(() =>
    percentLabel(this.store.stats()?.attemptPassRate),
  );
  protected readonly coursePassRatePercent = computed(() =>
    Math.round((this.store.stats()?.attemptPassRate ?? 0) * 100),
  );
  protected readonly courseLineCount = computed(() =>
    this.store.chapters().reduce((total, chapter) => total + chapter.lineCount, 0),
  );
  protected readonly courseAttentionCount = computed(() => {
    const stats = this.store.stats();
    return (stats?.weakSublineCount ?? 0) + (stats?.untrainedSublineCount ?? 0);
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

  protected chapterPassRate(chapter: CourseOverviewChapter): string {
    return percentLabel(chapter.stats.attemptPassRate);
  }

  protected chapterPassRatePercent(chapter: CourseOverviewChapter): number {
    return Math.round((chapter.stats.attemptPassRate ?? 0) * 100);
  }

  protected chapterStatusLabel(chapter: CourseOverviewChapter): string {
    const labels = {
      NEW: 'New',
      WEAK: 'Weak',
      REVIEW: 'Review',
      STABLE: 'Stable',
      STRONG: 'Strong',
    } as const;
    return labels[chapter.stats.status];
  }

  protected chapterAttentionLabel(chapter: CourseOverviewChapter): string {
    if (chapter.stats.weakSublineCount > 0) return `${chapter.stats.weakSublineCount} weak`;
    if (chapter.stats.untrainedSublineCount > 0)
      return `${chapter.stats.untrainedSublineCount} new`;
    return 'Ready';
  }

  protected async createChapter(): Promise<void> {
    await this.store.createChapter();
    if (!this.store.error()) this.chapterFormOpen.set(false);
  }

  protected async confirmDeleteChapter(chapter: CourseOverviewChapter): Promise<void> {
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
