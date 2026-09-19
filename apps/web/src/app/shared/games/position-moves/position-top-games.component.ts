import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProgressiveListComponent } from '../../ui/progressive-list/progressive-list.component';
import {
  gameDateLabel,
  gameMetaLabel,
  playerPairLabel,
  providerClass,
  providerLabel,
  resultClass,
  resultLabel,
} from './position-game-moves.helpers';
import { OpeningAnalysisGame } from './position-game-moves.models';

@Component({
  selector: 'app-position-top-games',
  standalone: true,
  imports: [RouterLink, ProgressiveListComponent],
  templateUrl: './position-top-games.component.html',
  styleUrl: './position-top-games.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PositionTopGamesComponent {
  readonly games = input<readonly OpeningAnalysisGame[]>([]);
  readonly loading = input(false);
  readonly title = input('Top games in this position');
  readonly subtitle = input('Most recent games that reached this exact normalized position.');
  readonly initialVisibleCount = input(4);
  readonly resetKey = input<unknown>(null);

  protected readonly providerLabel = providerLabel;
  protected readonly providerClass = providerClass;
  protected readonly resultLabel = resultLabel;
  protected readonly resultClass = resultClass;
  protected readonly playerPairLabel = playerPairLabel;
  protected readonly gameDateLabel = gameDateLabel;
  protected readonly gameMetaLabel = gameMetaLabel;
}
