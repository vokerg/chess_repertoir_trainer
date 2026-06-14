import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { distinctUntilChanged, map } from 'rxjs';
import { PageHeaderComponent } from '../../../components/page-header.component';
import { CourseDetailApiService } from '../data-access/course-detail-api.service';
import { CourseDetailStore } from '../state/course-detail.store';
import { SublinesListComponent } from '../../sublines/components/sublines-list.component';

@Component({
  selector: 'app-course-detail-page',
  standalone: true,
  imports: [DecimalPipe, FormsModule, RouterLink, PageHeaderComponent, SublinesListComponent],
  providers: [CourseDetailApiService, CourseDetailStore],
  templateUrl: './course-detail-page.component.html',
  styleUrl: './course-detail-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CourseDetailPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly store = inject(CourseDetailStore);

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
