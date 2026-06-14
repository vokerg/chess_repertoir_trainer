import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { distinctUntilChanged, map } from 'rxjs';
import { PageHeaderComponent } from '../../../components/page-header.component';
import { CourseDetailApiService } from '../../courses/data-access/course-detail-api.service';
import { LinesPageStore } from '../state/lines-page.store';

@Component({
  selector: 'app-lines-page',
  standalone: true,
  imports: [FormsModule, RouterLink, PageHeaderComponent],
  providers: [CourseDetailApiService, LinesPageStore],
  templateUrl: './lines-page.component.html',
  styleUrl: './lines-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LinesPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly store = inject(LinesPageStore);

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        map((params) => Number(params.get('chapterId'))),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((chapterId) => this.store.initialize(chapterId));
  }

  protected confirmDeleteLine(lineId: number): void {
    const line = this.store.lines().find((item) => item.id === lineId);
    if (!line) return;
    const confirmed = window.confirm(
      `Delete line "${line.name}" and its full move tree? This cannot be undone.`,
    );
    if (!confirmed) return;
    void this.store.deleteLine(line);
  }
}
