import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ImportedGameSearchItem } from '../data-access/games.models';

@Component({
  selector: 'app-game-action-menu',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './game-action-menu.component.html',
  styleUrl: './game-action-menu.component.css',
})
export class GameActionMenuComponent {
  readonly game = input.required<ImportedGameSearchItem>();
  readonly open = input(false);
  readonly analysing = input(false);
  readonly indexing = input(false);
  readonly toggle = output<Event>();
  readonly close = output<void>();
  readonly analyse = output<void>();
  readonly forceReanalyse = output<void>();
  readonly indexPlies = output<void>();

  protected canForceReanalyse(): boolean {
    const status = this.game().analysis?.status;
    return status === 'RUNNING' || status === 'FAILED' || status === 'COMPLETED';
  }

  protected plyIndexActionLabel(): string {
    return this.game().plyIndex?.status === 'FAILED' ? 'Retry ply index' : 'Index plies';
  }

  protected providerLabel(): string {
    const provider = this.game().provider;
    if (provider === 'CHESS_COM') return 'Chess.com';
    if (provider === 'LICHESS') return 'Lichess';
    return 'Provider';
  }
}
