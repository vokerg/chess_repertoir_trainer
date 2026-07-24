import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { PanelComponent } from '../../../shared/ui/panel/panel.component';
import { LabExperimentPageHeaderComponent } from '../components/lab-experiment-page-header.component';
import { CourseReviewLauncherApiService } from '../data-access/course-review-launcher-api.service';
import { CourseReviewLauncherStore } from '../state/course-review-launcher.store';

@Component({
  selector: 'app-lab-course-extension-candidates-page',
  standalone: true,
  imports: [LabExperimentPageHeaderComponent, PanelComponent],
  providers: [CourseReviewLauncherApiService, CourseReviewLauncherStore],
  templateUrl: './course-extension-candidates-page.component.html',
  styleUrl: './course-extension-candidates-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CourseExtensionCandidatesPageComponent implements OnInit {
  private readonly router = inject(Router);
  protected readonly store = inject(CourseReviewLauncherStore);

  ngOnInit(): void {
    void this.store.initialize();
  }

  protected selectedNumber(event: Event): number {
    return Number((event.target as HTMLSelectElement).value);
  }

  protected openCourseEndings(): void {
    const courseId = this.store.courseId();
    if (!courseId) return;
    void this.router.navigate(['/courses', courseId, 'review'], {
      queryParams: { view: 'course-endings' },
    });
  }
}
