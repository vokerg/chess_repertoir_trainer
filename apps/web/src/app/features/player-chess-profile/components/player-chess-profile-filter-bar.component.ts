import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type {
  PlayerChessProfileAccountOption,
  PlayerChessProfileColor,
  PlayerChessProfileFilters,
  PlayerChessProfilePeriod,
} from '../data-access/player-chess-profile.models';

@Component({
  selector: 'app-player-chess-profile-filter-bar',
  standalone: true,
  templateUrl: './player-chess-profile-filter-bar.component.html',
  styleUrl: './player-chess-profile-filter-bar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerChessProfileFilterBarComponent {
  readonly filters = input.required<PlayerChessProfileFilters>();
  readonly accounts = input<readonly PlayerChessProfileAccountOption[]>([]);
  readonly accountsLoading = input(false);
  readonly loading = input(false);

  readonly periodChange = output<PlayerChessProfilePeriod>();
  readonly dateChange = output<{ key: 'from' | 'to'; value: string }>();
  readonly speedPresetChange = output<PlayerChessProfileFilters['speedPreset']>();
  readonly ratedChange = output<boolean>();
  readonly accountToggle = output<number>();
  readonly allAccountsSelect = output<void>();
  readonly colorToggle = output<PlayerChessProfileColor>();
  readonly ratingFilterChange = output<{
    key: 'minUserRating' | 'maxUserRating' | 'minOpponentRating' | 'maxOpponentRating';
    value: string;
  }>();
  readonly ratingContextClear = output<void>();
  readonly recalculate = output<void>();

  protected accountLabel(account: PlayerChessProfileAccountOption): string {
    const provider = account.provider === 'LICHESS' ? 'Lichess' : 'Chess.com';
    const name = account.displayName || account.username;
    return `${name} · ${provider}`;
  }

  protected isAccountSelected(accountId: number): boolean {
    return this.filters().accountIds.includes(accountId);
  }

  protected isColorSelected(color: PlayerChessProfileColor): boolean {
    return this.filters().colors.includes(color);
  }

  protected numericValue(value: number | null): string {
    return value === null ? '' : String(value);
  }
}
