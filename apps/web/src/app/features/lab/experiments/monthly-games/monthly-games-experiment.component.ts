import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { MonthlyGamesApiService } from './data-access/monthly-games-api.service';
import { monthLabel, percentLabel, ratingLabel, wdlLabel } from './helpers/monthly-games-labels';
import { MonthlyGamesStore } from './state/monthly-games.store';

@Component({
  selector: 'app-lab-monthly-games',
  standalone: true,
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
  ngOnInit(): void { void this.store.load(); }
}
