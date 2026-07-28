import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { PlayerChessProfileConclusionViewModel } from '../helpers/player-chess-profile-view-model';

@Component({
  selector: 'app-player-chess-profile-conclusions',
  standalone: true,
  templateUrl: './player-chess-profile-conclusions.component.html',
  styleUrl: './player-chess-profile-conclusions.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerChessProfileConclusionsComponent {
  readonly conclusions = input<readonly PlayerChessProfileConclusionViewModel[]>([]);
  readonly selectedIndex = input<number | null>(null);
  readonly selectConclusion = output<number>();
}
