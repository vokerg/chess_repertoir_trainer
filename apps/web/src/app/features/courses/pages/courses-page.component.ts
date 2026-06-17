import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PageHeaderComponent } from '../../../shared/ui/page-header/page-header.component';
import { CourseDetailApiService } from '../data-access/course-detail-api.service';
import { CoursesStore } from '../state/courses.store';

@Component({
  selector: 'app-courses-page',
  standalone: true,
  imports: [FormsModule, RouterLink, PageHeaderComponent],
  providers: [CourseDetailApiService, CoursesStore],
  templateUrl: './courses-page.component.html',
  styleUrl: './courses-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoursesPageComponent implements OnInit {
  protected readonly store = inject(CoursesStore);
  ngOnInit(): void { void this.store.loadCourses(); }
}
