import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { PlayerChessProfileEvidenceViewModel } from '../helpers/player-chess-profile-view-model';

@Component({
  selector: 'app-player-chess-profile-evidence',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './player-chess-profile-evidence.component.html',
  styleUrl: './player-chess-profile-evidence.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlayerChessProfileEvidenceComponent {
  readonly evidence = input<PlayerChessProfileEvidenceViewModel | null>(null);
}
