import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { LichessPuzzleRound } from '@chess-trainer/contracts/lichess-puzzles';
import { ChessgroundBoardComponent } from '../../../shared/chess/board/chessground-board.component';
import { PanelComponent } from '../../../shared/ui/panel/panel.component';

@Component({
  selector: 'app-lichess-puzzle-trainer',
  standalone: true,
  imports: [ChessgroundBoardComponent, PanelComponent],
  templateUrl: './lichess-puzzle-trainer.component.html',
  styleUrl: './lichess-puzzle-trainer.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LichessPuzzleTrainerComponent {
  readonly round = input.required<LichessPuzzleRound>();
  readonly movable = input(false);
  readonly positionVersion = input(0);
  readonly lastMove = input<{ from: string; to: string } | null>(null);
  readonly busy = input(false);

  readonly boardMove = output<string>();
  readonly abandon = output<void>();
  readonly retrySync = output<void>();
  readonly nextPuzzle = output<void>();

  protected readonly progressLabel = computed(() => {
    const round = this.round();
    return `${Math.min(round.currentStep, round.puzzle.solutionPlies)} / ${round.puzzle.solutionPlies} solution plies`;
  });

  protected readonly outcomeLabel = computed(() => {
    const round = this.round();
    if (round.status === 'IN_PROGRESS') return 'Your move';
    if (round.outcome === 'WIN') return 'Solved first try';
    if (round.outcome === 'LOSS') return 'Line completed after a mistake';
    return 'Round abandoned';
  });

  protected readonly ratingLabel = computed(() => {
    const round = this.round();
    if (!round.ratedRequested) return 'Practice round';
    if (round.upstreamStatus === 'SYNCED') {
      const diff = round.ratingDiff ?? 0;
      return `Lichess rating ${diff >= 0 ? '+' : ''}${diff}`;
    }
    if (round.upstreamStatus === 'FAILED') return 'Lichess sync failed';
    if (round.upstreamStatus === 'PENDING' || round.upstreamStatus === 'SYNCING') {
      return 'Lichess result syncing';
    }
    return 'Rated on Lichess';
  });
}
