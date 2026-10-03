import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { GameLibrary } from '@chess-trainer/contracts/imported-games';

@Component({
  selector: 'app-game-collection-actions',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './game-collection-actions.component.html',
  styleUrl: './game-collection-actions.component.css',
})
export class GameCollectionActionsComponent {
  readonly game = input.required<{ liked?: boolean; libraryIds?: readonly number[] }>();
  readonly libraries = input<readonly GameLibrary[]>([]);
  readonly busy = input(false);
  readonly like = output<void>();
  readonly membership = output<number>();
}
