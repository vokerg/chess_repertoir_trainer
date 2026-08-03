import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { PanelComponent } from '../../../../shared/ui/panel/panel.component';
import { type UiShellAction } from '../../../../shared/ui/ui-shell.model';
import { MonthlyGamesApiService } from './data-access/monthly-games-api.service';
import { monthLabel, percentLabel, ratingLabel, wdlLabel } from './helpers/monthly-games-labels';
import { MonthlyGamesStore } from './state/monthly-games.store';

@Component({
  selector: 'app-lab-monthly-games',
  standalone: true,
  imports: [PanelComponent],
  providers: [MonthlyGamesApiService, MonthlyGamesStore],
  templateUrl: './monthly-games-experiment.component.html',
  styleUrl: './monthly-games-experiment.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MonthlyGamesExperimentComponent implements OnInit {
  protected readonly store = inject(MonthlyGamesStore);
  protected readonly monthLabel = monthLabel;
  protected readonly wdlLabel = wdlLabel;
  protected readonly percentLabel = percentLabel;
  protected readonly ratingLabel = ratingLabel;

  protected readonly actions = computed<readonly UiShellAction[]>(() => [
    {
      id: 'refresh-monthly-games',
      label: this.store.loading() ? 'Loading…' : 'Refresh',
      disabled: this.store.loading(),
      run: () => void this.store.load(),
    },
  ]);

  ngOnInit(): void {
    void this.store.load();
  }
}
