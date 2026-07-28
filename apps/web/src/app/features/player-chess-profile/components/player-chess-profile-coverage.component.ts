import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { PlayerChessProfileResponse } from '@chess-trainer/contracts/player-chess-profile';
import {
  playerChessProfilePeerLabel,
  playerChessProfilePercentLabel,
  playerChessProfileWdlLabel,
} from '../helpers/player-chess-profile-view-model';

@Component({
  selector: 'app-player-chess-profile-coverage',
  standalone: true,
  templateUrl: './player-chess-profile-coverage.component.html',
  styleUrl: './player-chess-profile-coverage.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerChessProfileCoverageComponent {
  readonly profile = input.required<PlayerChessProfileResponse>();

  protected percentLabel = playerChessProfilePercentLabel;
  protected wdlLabel = playerChessProfileWdlLabel;
  protected peerLabel = playerChessProfilePeerLabel;

  protected coveragePercent(value: number, denominator: number): number {
    return denominator > 0 ? Math.min(100, Math.round((value / denominator) * 100)) : 0;
  }
}
