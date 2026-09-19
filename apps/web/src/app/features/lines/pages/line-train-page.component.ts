import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { distinctUntilChanged, map } from 'rxjs';
import {
  PageHeaderAction,
  PageHeaderComponent,
  PageHeaderStat,
} from '../../../shared/ui/page-header/page-header.component';
import { PanelComponent } from '../../../shared/ui/panel/panel.component';
import { StateMessageComponent } from '../../../shared/ui/state-message/state-message.component';
import { LineTrainingSessionComponent } from '../components/line-training-session.component';
import { LineTrainStore } from '../state/line-train.store';

@Component({
  selector: 'app-line-train-page',
  standalone: true,
  imports: [RouterLink, PageHeaderComponent, PanelComponent, StateMessageComponent, LineTrainingSessionComponent],
  providers: [LineTrainStore],
  templateUrl: './line-train-page.component.html',
  styleUrl: './line-train-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LineTrainPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly store = inject(LineTrainStore);

  protected readonly headerStats = computed<readonly PageHeaderStat[]>(() => [
    {
      id: 'side',
      label: 'Train as',
      value: this.store.sideToTrain() === 'BLACK' ? 'Black' : 'White',
    },
    {
      id: 'status',
      label: 'Session',
      value: this.store.sessionStatusLabel(),
    },
  ]);

  protected readonly headerActions = computed<readonly PageHeaderAction[]>(() => {
    const lineId = this.store.line()?.id;
    if (!lineId) return [];

    return [
      {
        id: 'edit-tree',
        label: 'Edit tree',
        link: ['/lines', lineId, 'edit'],
      },
    ];
  });

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