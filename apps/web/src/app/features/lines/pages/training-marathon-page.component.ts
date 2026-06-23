import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { combineLatest, distinctUntilChanged, map } from 'rxjs';
import { LineTrainingSessionComponent } from '../components/line-training-session.component';
import { parseMarathonOptions } from '../helpers/marathon-query.helpers';
import { TrainingMarathonStore } from '../state/training-marathon.store';

@Component({
  selector: 'app-training-marathon-page',
  standalone: true,
  imports: [RouterLink, LineTrainingSessionComponent],
  providers: [TrainingMarathonStore],
  templateUrl: './training-marathon-page.component.html',
  styleUrl: './training-marathon-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrainingMarathonPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly store = inject(TrainingMarathonStore);

  ngOnInit(): void {
    combineLatest([this.route.paramMap, this.route.queryParamMap])
      .pipe(
        map(([params, query]) => parseMarathonOptions(params, query)),
        distinctUntilChanged((previous, current) => JSON.stringify(previous) === JSON.stringify(current)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((options) => this.store.initialize(options));
  }
}
