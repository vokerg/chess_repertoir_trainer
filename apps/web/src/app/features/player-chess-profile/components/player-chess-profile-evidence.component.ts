import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { PlayerChessProfileSupportingGame } from '@chess-trainer/contracts/player-chess-profile';
import type { PlayerChessProfileEvidenceViewModel } from '../helpers/player-chess-profile-view-model';
import {
  playerChessProfileEvidenceLabel,
  playerChessProfileValueLabel,
} from '../helpers/player-chess-profile-view-model';

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

  protected evidenceLabel = playerChessProfileEvidenceLabel;
  protected valueLabel = playerChessProfileValueLabel;

  protected gameTitle(game: PlayerChessProfileSupportingGame): string {
    return game.openingName || game.openingEco || `Game ${game.id}`;
  }

  protected gameMeta(game: PlayerChessProfileSupportingGame): string {
    const result = game.resultForUser ? this.valueLabel(game.resultForUser) : 'Unknown result';
    const speed = game.speedCategory ? this.valueLabel(game.speedCategory) : 'Unknown speed';
    const color = this.valueLabel(game.userColor);
    return `${result} · ${color} · ${speed}`;
  }

  protected endedAtLabel(value: string | null): string {
    if (!value) return 'Date unavailable';
    return new Intl.DateTimeFormat('en', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(value));
  }
}
