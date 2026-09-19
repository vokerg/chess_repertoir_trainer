import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { AccountRatingStatsResponse, RatingSpeed } from '../data-access/accounts.models';

interface YearlyHighRow {
  year: number;
  values: Partial<Record<RatingSpeed, number>>;
}

const SPEEDS: readonly RatingSpeed[] = ['bullet', 'blitz', 'rapid'];

@Component({
  selector: 'app-account-yearly-highs',
  standalone: true,
  templateUrl: './account-yearly-highs.component.html',
  styleUrl: './account-yearly-highs.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountYearlyHighsComponent {
  readonly stats = input<AccountRatingStatsResponse | null>(null);
  readonly loading = input(false);
  readonly error = input<string | null>(null);

  protected readonly speeds = SPEEDS;
  protected readonly rows = computed<YearlyHighRow[]>(() => {
    const rowsByYear = new Map<number, YearlyHighRow>();

    for (const speed of this.stats()?.data.speeds ?? []) {
      for (const high of speed.yearlyHighs) {
        const row = rowsByYear.get(high.year) ?? { year: high.year, values: {} };
        row.values[speed.key] = high.rating;
        rowsByYear.set(high.year, row);
      }
    }

    return Array.from(rowsByYear.values()).sort((left, right) => right.year - left.year);
  });
}
