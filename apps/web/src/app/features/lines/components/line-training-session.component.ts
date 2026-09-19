import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Chess } from 'chess.js';
import { ChessgroundBoardComponent } from '../../../shared/chess/board/chessground-board.component';
import { RepertoireColor, TrainingReviewItem } from '../data-access/lines.models';

@Component({
  selector: 'app-line-training-session',
  standalone: true,
  imports: [RouterLink, ChessgroundBoardComponent],
  templateUrl: './line-training-session.component.html',
  styleUrl: './line-training-session.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LineTrainingSessionComponent {
  readonly sessionId = input(0);
  readonly currentFen = input('');
  readonly expectedMove = input<string | null | undefined>(undefined);
  readonly sideToTrain = input<RepertoireColor>('WHITE');
  readonly feedback = input<string | null>(null);
  readonly feedbackCorrect = input(false);
  readonly mistakesCount = input(0);
  readonly completed = input(false);
  readonly passed = input(false);
  readonly accuracy = input<number | null>(null);
  readonly showExpectedMove = input(false);
  readonly reviewLoading = input(false);
  readonly mistakes = input<TrainingReviewItem[]>([]);
  readonly error = input<string | null>(null);
  readonly lastMove = input<{ from: string; to: string } | null>(null);
  readonly boardPositionVersion = input(0);
  readonly goalTitle = input('Goal');
  readonly goalSubtitle = input(
    'Play the repertoire line from memory. Keep the expected move hidden unless you are stuck.',
  );
  readonly progressTitle = input('Session progress');
  readonly finishButtonLabel = input('Finish');
  readonly primaryActionLabel = input('Train again');
  readonly secondaryActionLabel = input('Back');
  readonly secondaryActionLink = input<string | readonly (string | number)[] | null>(null);
  readonly editActionLabel = input('Edit tree');
  readonly editActionLink = input<string | readonly (string | number)[] | null>(null);
  readonly reviewSubtitle = input(
    'Review the missed moves and any notes attached to those branches.',
  );

  readonly boardMove = output<string>();
  readonly toggleExpectedMove = output<void>();
  readonly finish = output<void>();
  readonly primaryAction = output<void>();

  protected expectedMoveLabel(moveUci: string | null | undefined = this.expectedMove()): string {
    const move = this.describeExpectedMove(moveUci);
    return move?.san || moveUci || '(waiting...)';
  }

  protected progressLabel(): string {
    if (this.completed()) return 'Complete';
    return this.mistakesCount() === 0
      ? 'Clean so far'
      : `${this.mistakesCount()} mistake${this.mistakesCount() === 1 ? '' : 's'}`;
  }

  protected progressPercent(): number {
    if (this.completed()) return 100;
    if (this.mistakesCount() === 0) return 42;
    return Math.max(18, Math.min(82, 42 - this.mistakesCount() * 8));
  }

  protected accuracyLabel(): string {
    const accuracy = this.accuracy();
    if (accuracy === null || accuracy === undefined) return '-';
    return `${Math.round(accuracy * 100)}%`;
  }

  private describeExpectedMove(moveUci: string | null | undefined) {
    if (!moveUci || !this.currentFen()) return null;
    try {
      const game = new Chess(this.currentFen());
      return game.move({
        from: moveUci.substring(0, 2),
        to: moveUci.substring(2, 4),
        promotion: moveUci.substring(4, 5) || 'q',
      }) as { san: string };
    } catch {
      return null;
    }
  }
}
