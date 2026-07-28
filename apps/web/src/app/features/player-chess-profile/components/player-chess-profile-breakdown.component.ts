import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { PlayerChessProfileDimension } from '@chess-trainer/contracts/player-chess-profile';
import type {
  PlayerChessProfilePerformanceRowViewModel,
  PlayerChessProfilePreferenceRowViewModel,
} from '../helpers/player-chess-profile-view-model';
import type {
  PlayerChessProfileBreakdownSelection,
  PlayerChessProfileView,
} from '../state/player-chess-profile.models';
import { playerChessProfileDimensionLabel } from '../helpers/player-chess-profile-view-model';

@Component({
  selector: 'app-player-chess-profile-breakdown',
  standalone: true,
  templateUrl: './player-chess-profile-breakdown.component.html',
  styleUrl: './player-chess-profile-breakdown.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerChessProfileBreakdownComponent {
  readonly activeView = input.required<PlayerChessProfileView>();
  readonly selectedDimension = input.required<PlayerChessProfileDimension>();
  readonly preferenceItems = input<readonly PlayerChessProfilePreferenceRowViewModel[]>([]);
  readonly performanceItems = input<readonly PlayerChessProfilePerformanceRowViewModel[]>([]);

  readonly viewChange = output<PlayerChessProfileView>();
  readonly dimensionChange = output<PlayerChessProfileDimension>();
  readonly inspect = output<PlayerChessProfileBreakdownSelection>();

  protected readonly dimensions: readonly PlayerChessProfileDimension[] = [
    'CHARACTER',
    'SOUNDNESS',
    'THEORETICAL_STATUS',
    'THEORY_BURDEN',
    'ROLE',
  ];
  protected dimensionLabel = playerChessProfileDimensionLabel;

  protected deltaWidth(value: number | null): number {
    return value === null ? 0 : Math.min(48, Math.max(3, Math.abs(value) * 3));
  }
}
