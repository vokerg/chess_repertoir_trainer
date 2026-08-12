import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import type { CourseSide } from '@chess-trainer/contracts/courses';
import { ConfirmDialogService } from '../../../shared/ui/confirm-dialog/confirm-dialog.service';
import { PageHeaderComponent } from '../../../shared/ui/page-header/page-header.component';
import { PanelComponent } from '../../../shared/ui/panel/panel.component';
import { StateMessageComponent } from '../../../shared/ui/state-message/state-message.component';
import { CourseDetailApiService } from '../data-access/course-detail-api.service';
import { CourseCoverPickerComponent } from '../components/course-cover-picker/course-cover-picker.component';
import { courseCoverOption, courseSideLabel, percentLabel } from '../helpers/course-presentation';
import { CourseCatalogItem, CoursesStore } from '../state/courses.store';

@Component({
  selector: 'app-courses-page',
  standalone: true,
  imports: [FormsModule, RouterLink, PageHeaderComponent, PanelComponent, StateMessageComponent, CourseCoverPickerComponent],
  providers: [CourseDetailApiService, CoursesStore],
  templateUrl: './courses-page.component.html',
  styleUrl: './courses-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoursesPageComponent implements OnInit {
  protected readonly store = inject(CoursesStore);
  private readonly confirmDialog = inject(ConfirmDialogService);
  protected readonly sideFilter = signal<'ALL' | CourseSide>('ALL');
  protected readonly headerStats = computed(() => {
    const courses = this.store.courses();
    return [
      { id: 'courses', label: 'Courses', value: courses.length },
      { id: 'chapters', label: 'Chapters', value: courses.reduce((total, course) => total + course.chapters.length, 0) },
      { id: 'lines', label: 'Lines', value: courses.reduce((total, course) => total + course.chapters.reduce((count, chapter) => count + chapter.lines.length, 0), 0) },
    ];
  });
  protected readonly courseCards = computed(() => this.store.courses()
    .filter((course) => this.sideFilter() === 'ALL' || course.side === this.sideFilter())
    .map((course) => ({
      course,
      cover: courseCoverOption(course.id, course.side, course.coverKey),
      sideLabel: courseSideLabel(course.side),
      chapterCount: course.chapters.length,
      lineCount: course.chapters.reduce((count, chapter) => count + chapter.lines.length, 0),
      masteryLabel: percentLabel(course.stats.attemptPassRate),
    })));

  ngOnInit(): void { void this.store.loadCourses(); }

  protected async confirmDeleteCourse(course: Pick<CourseCatalogItem, 'id' | 'name'>): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Delete course?',
      message: `Delete "${course.name}" and all of its chapters and lines? This cannot be undone.`,
      tone: 'danger',
      confirmLabel: 'Delete course',
      cancelLabel: 'Cancel',
      requireTypedConfirmation: course.name,
    });

    if (confirmed) void this.store.deleteCourse(course);
  }
}
