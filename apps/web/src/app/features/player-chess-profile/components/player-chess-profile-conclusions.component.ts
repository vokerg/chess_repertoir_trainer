import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { PlayerChessProfileConclusion } from '@chess-trainer/contracts/player-chess-profile';
import {
  playerChessProfileEvidenceLabel,
  playerChessProfilePercentLabel,
} from '../helpers/player-chess-profile-view-model';

@Component({
  selector: 'app-player-chess-profile-conclusions',
  standalone: true,
  templateUrl: './player-chess-profile-conclusions.component.html',
  styleUrl: './player-chess-profile-conclusions.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerChessProfileConclusionsComponent {
  readonly conclusions = input<readonly PlayerChessProfileConclusion[]>([]);
  readonly selectedIndex = input<number | null>(null);
  readonly selectConclusion = output<number>();

  protected evidenceLabel = playerChessProfileEvidenceLabel;
  protected percentLabel = playerChessProfilePercentLabel;

  protected kindLabel(conclusion: PlayerChessProfileConclusion): string {
    if (conclusion.code === 'PREFERENCE') return 'Preference';
    if (conclusion.code === 'PERFORMS_BETTER') return 'Above baseline';
    if (conclusion.code === 'PERFORMS_WORSE') return 'Below baseline';
    if (conclusion.code === 'OPENING_TROUBLE') return 'Trouble area';
    return 'Not enough data';
  }
}
