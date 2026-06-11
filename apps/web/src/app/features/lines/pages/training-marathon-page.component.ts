import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { distinctUntilChanged, map } from 'rxjs';
import { LineTrainingSessionComponent } from '../components/line-training-session.component';
import { TrainingMarathonStore } from '../state/training-marathon.store';

@Component({
  selector: 'app-training-marathon-page',
  standalone: true,
  imports: [RouterLink, LineTrainingSessionComponent],
  providers: [TrainingMarathonStore],
  templateUrl: './training-marathon-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrainingMarathonPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly store = inject(TrainingMarathonStore);

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        map((params) => {
          const courseId = Number(params.get('courseId'));
          return courseId > 0
            ? { type: 'COURSE' as const, id: courseId }
            : { type: 'CHAPTER' as const, id: Number(params.get('chapterId')) };
        }),
        distinctUntilChanged((previous, current) => previous.type === current.type && previous.id === current.id),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((scope) => this.store.initialize(scope.type, scope.id));
  }
}
