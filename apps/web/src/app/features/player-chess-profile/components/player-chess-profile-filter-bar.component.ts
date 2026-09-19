import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import {
  SelectMenuComponent,
  type UiSelectMenuOption,
} from '../../../shared/ui/select-menu/select-menu.component';
import type { PlayerChessProfileAccountViewModel } from '../helpers/player-chess-profile-view-model';
import type {
  PlayerChessProfileColor,
  PlayerChessProfileFilters,
  PlayerChessProfilePeriod,
} from '../state/player-chess-profile.models';

const PERIOD_OPTIONS = [
  { value: '1M', label: 'Last month' },
  { value: '3M', label: 'Last 3 months', marker: 'action' },
  { value: '1Y', label: 'Last year' },
  { value: 'ALL', label: 'All time' },
  { value: 'CUSTOM', label: 'Custom', caption: 'Choose exact dates' },
] as const satisfies readonly UiSelectMenuOption[];

const SPEED_OPTIONS = [
  { value: 'BLITZ_AND_SLOWER', label: 'Blitz and slower', marker: 'action' },
  { value: 'ALL', label: 'All speeds' },
  { value: 'BLITZ', label: 'Blitz' },
  { value: 'BULLET', label: 'Bullet' },
] as const satisfies readonly UiSelectMenuOption[];

const RATED_OPTIONS = [
  { value: 'true', label: 'Rated', marker: 'action' },
  { value: 'false', label: 'Casual', marker: 'neutral' },
] as const satisfies readonly UiSelectMenuOption[];

@Component({
  selector: 'app-player-chess-profile-filter-bar',
  standalone: true,
  imports: [SelectMenuComponent],
  templateUrl: './player-chess-profile-filter-bar.component.html',
  styleUrl: './player-chess-profile-filter-bar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerChessProfileFilterBarComponent {
  readonly filters = input.required<PlayerChessProfileFilters>();
  readonly accounts = input<readonly PlayerChessProfileAccountViewModel[]>([]);
  readonly accountsLoading = input(false);
  readonly periodOptions = PERIOD_OPTIONS;
  readonly speedOptions = SPEED_OPTIONS;
  readonly ratedOptions = RATED_OPTIONS;
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

  protected changePeriod(value: string): void {
    this.periodChange.emit(value as PlayerChessProfilePeriod);
  }

  protected changeSpeedPreset(value: string): void {
    this.speedPresetChange.emit(value as PlayerChessProfileFilters['speedPreset']);
  }

  protected changeRated(value: string): void {
    this.ratedChange.emit(value === 'true');
  }

  protected isColorSelected(color: PlayerChessProfileColor): boolean {
    return this.filters().colors.includes(color);
  }

  protected numericValue(value: number | null): string {
    return value === null ? '' : String(value);
  }
}
