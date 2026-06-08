import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { distinctUntilChanged, map } from 'rxjs';
import { LineTrainingSessionComponent } from '../components/line-training-session.component';
import { LineTrainStore } from '../state/line-train.store';

@Component({
  selector: 'app-line-train-page',
  standalone: true,
  imports: [RouterLink, LineTrainingSessionComponent],
  providers: [LineTrainStore],
  templateUrl: './line-train-page.component.html',
  styleUrl: './line-train-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LineTrainPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly store = inject(LineTrainStore);

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        map((params) => Number(params.get('lineId'))),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((lineId) => this.store.initialize(lineId));
  }
}
