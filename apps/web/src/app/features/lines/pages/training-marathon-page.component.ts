import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { combineLatest, distinctUntilChanged, map } from 'rxjs';
import {
  PageHeaderAction,
  PageHeaderComponent,
  PageHeaderStat,
} from '../../../shared/ui/page-header/page-header.component';
import { PanelComponent } from '../../../shared/ui/panel/panel.component';
import { LineTrainingSessionComponent } from '../components/line-training-session.component';
import { parseMarathonOptions } from '../helpers/marathon-query.helpers';
import { TrainingMarathonStore } from '../state/training-marathon.store';

@Component({
  selector: 'app-training-marathon-page',
  standalone: true,
  imports: [RouterLink, PageHeaderComponent, PanelComponent, LineTrainingSessionComponent],
  providers: [TrainingMarathonStore],
  templateUrl: './training-marathon-page.component.html',
  styleUrl: './training-marathon-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrainingMarathonPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly store = inject(TrainingMarathonStore);

  protected readonly headerStats = computed<readonly PageHeaderStat[]>(() => [
    {
      id: 'line',
      label: 'Current line',
      value: this.store.lineName() || 'Preparing',
    },
    {
      id: 'side',
      label: 'Train as',
      value: this.store.sideToTrain() === 'BLACK' ? 'Black' : 'White',
    },
    {
      id: 'completed',
      label: 'This run',
      value: this.store.completedThisRun(),
    },
    {
      id: 'status',
      label: 'Status',
      value: this.store.completed() ? 'Complete' : 'In progress',
    },
  ]);

  protected readonly headerActions = computed<readonly PageHeaderAction[]>(() => {
    const actions: PageHeaderAction[] = [
      {
        id: 'mode-all',
        label: 'All',
        kind: 'toggle',
        pressed: this.store.mode() === 'ALL',
        run: () => this.store.switchMode('ALL'),
      },
      {
        id: 'mode-weak',
        label: 'Weak',
        kind: 'toggle',
        pressed: this.store.mode() === 'WEAK_SUBLINES',
        run: () => this.store.switchMode('WEAK_SUBLINES'),
      },
      {
        id: 'mode-untrained',
        label: 'Untrained',
        kind: 'toggle',
        pressed: this.store.mode() === 'UNTRAINED_SUBLINES',
        run: () => this.store.switchMode('UNTRAINED_SUBLINES'),
      },
      {
        id: 'mode-mixed',
        label: 'Mixed',
        kind: 'toggle',
        pressed: this.store.mode() === 'MIXED_WEAK_UNTRAINED',
        run: () => this.store.switchMode('MIXED_WEAK_UNTRAINED'),
      },
    ];

    const lineId = this.store.lineId();
    if (lineId) {
      actions.push({
        id: 'edit-tree',
        label: 'Edit current tree',
        link: ['/lines', lineId, 'edit'],
      });
    }

    return actions;
  });

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
