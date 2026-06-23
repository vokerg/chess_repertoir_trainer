import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PageHeaderComponent } from '../../../shared/ui/page-header/page-header.component';
import { PanelComponent } from '../../../shared/ui/panel/panel.component';
import { ConfirmDialogService } from '../../../shared/ui/confirm-dialog/confirm-dialog.service';
import { CourseDetailApiService } from '../data-access/course-detail-api.service';
import { CourseDetail } from '../data-access/course-detail.models';
import { CoursesStore } from '../state/courses.store';

@Component({
  selector: 'app-courses-page',
  standalone: true,
  imports: [FormsModule, RouterLink, PageHeaderComponent, PanelComponent],
  providers: [CourseDetailApiService, CoursesStore],
  templateUrl: './courses-page.component.html',
  styleUrl: './courses-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoursesPageComponent implements OnInit {
  protected readonly store = inject(CoursesStore);
  private readonly confirmDialog = inject(ConfirmDialogService);
  protected readonly loadedCourseStats = computed(() => [
    { id: 'loaded', label: 'Loaded', value: this.store.courses().length },
  ]);

  ngOnInit(): void { void this.store.loadCourses(); }

  protected async confirmDeleteCourse(course: CourseDetail): Promise<void> {
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
