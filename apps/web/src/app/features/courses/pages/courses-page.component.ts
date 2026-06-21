import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PageHeaderComponent } from '../../../shared/ui/page-header/page-header.component';
import { PanelComponent } from '../../../shared/ui/panel/panel.component';
import { CourseDetailApiService } from '../data-access/course-detail-api.service';
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
  protected readonly loadedCourseStats = computed(() => [
    { id: 'loaded', label: 'Loaded', value: this.store.courses().length },
  ]);

  ngOnInit(): void { void this.store.loadCourses(); }
}
