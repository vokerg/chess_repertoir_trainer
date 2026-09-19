import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { OpeningExplorerResponse } from '@chess-trainer/contracts/opening-explorer';
import { compactGameCount, exactGameCount } from '../games/game-count.helpers';
import { ProgressiveListComponent } from '../ui/progressive-list/progressive-list.component';
import { percentage, sameOpening } from './opening-explorer.helpers';

@Component({
  selector: 'app-opening-explorer-results',
  standalone: true,
  imports: [ProgressiveListComponent],
  templateUrl: './opening-explorer-results.component.html',
  styleUrl: './opening-explorer-results.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpeningExplorerResultsComponent {
  readonly data = input.required<OpeningExplorerResponse>();
  readonly resetKey = input.required<string>();
  readonly singularGameLabel = input('game');
  readonly pluralGameLabel = input('games');
  readonly moveSelected = output<string>();

  protected readonly compactGameCount = compactGameCount;
  protected readonly exactGameCount = exactGameCount;
  protected readonly percentage = percentage;
  protected readonly sameOpening = sameOpening;

  protected gameLabel(count: number): string {
    return count === 1 ? this.singularGameLabel() : this.pluralGameLabel();
  }
}
