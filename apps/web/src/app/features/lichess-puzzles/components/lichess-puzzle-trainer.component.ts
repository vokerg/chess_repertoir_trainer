import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ChessgroundBoardComponent } from '../../../shared/chess/board/chessground-board.component';
import { PanelComponent } from '../../../shared/ui/panel/panel.component';
import type { LichessPuzzleTrainerViewModel } from '../helpers/lichess-puzzle-trainer-view-model';

@Component({
  selector: 'app-lichess-puzzle-trainer',
  standalone: true,
  imports: [ChessgroundBoardComponent, PanelComponent],
  templateUrl: './lichess-puzzle-trainer.component.html',
  styleUrl: './lichess-puzzle-trainer.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LichessPuzzleTrainerComponent {
  readonly view = input.required<LichessPuzzleTrainerViewModel>();
  readonly movable = input(false);
  readonly positionVersion = input(0);
  readonly busy = input(false);

  readonly boardMove = output<string>();
  readonly abandon = output<void>();
  readonly retrySync = output<void>();
  readonly nextPuzzle = output<void>();
}
