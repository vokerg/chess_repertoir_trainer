import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { PlayerChessProfileCoverageViewModel } from '../helpers/player-chess-profile-view-model';

@Component({
  selector: 'app-player-chess-profile-coverage',
  standalone: true,
  templateUrl: './player-chess-profile-coverage.component.html',
  styleUrl: './player-chess-profile-coverage.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerChessProfileCoverageComponent {
  readonly coverage = input.required<PlayerChessProfileCoverageViewModel>();
}
