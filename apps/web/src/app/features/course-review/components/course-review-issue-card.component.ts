import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Chess } from 'chess.js';
import { BoardImageComponent } from '../../../shared/chess/board-image/board-image.component';
import { CopyableFenComponent } from '../../../shared/ui/copyable-fen/copyable-fen.component';
import { CourseReviewGroup } from '../data-access/course-review.models';

@Component({
  selector: 'app-course-review-issue-card',
  standalone: true,
  imports: [BoardImageComponent, CopyableFenComponent, DatePipe, RouterLink],
  templateUrl: './course-review-issue-card.component.html',
  styleUrl: './course-review-issue-card.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CourseReviewIssueCardComponent {
  readonly group = input.required<CourseReviewGroup>();
  readonly opponent = input(false);

  protected readonly displayedFen = computed(() => {
    const group = this.group();
    try {
      const chess = new Chess(group.normalizedFenBefore);
      const move = chess.move({
        from: group.playedMoveUci.slice(0, 2),
        to: group.playedMoveUci.slice(2, 4),
        promotion: group.playedMoveUci[4],
      });
      return move ? chess.fen() : group.normalizedFenBefore;
    } catch {
      return group.normalizedFenBefore;
    }
  });

  protected readonly boardPov = computed<'white' | 'black'>(() => {
    const sideToMove = this.group().sideToMove === 'WHITE' ? 'white' : 'black';
    if (!this.opponent()) return sideToMove;
    return sideToMove === 'white' ? 'black' : 'white';
  });

  protected readonly analysisQueryParams = computed(() => {
    const example = this.group().examples[0];
    return {
      fen: this.displayedFen(),
      gameId: example?.gameId ?? null,
      ply: example?.plyNumber ?? null,
    };
  });

  protected exampleAnalysisQueryParams(example: CourseReviewGroup['examples'][number]) {
    return {
      fen: this.displayedFen(),
      gameId: example.gameId,
      ply: example.plyNumber,
    };
  }

  protected expectedMoves(): string {
    const group = this.group();
    return (
      group.expectedMoveSans.join(' or ') ||
      group.expectedMoveUcis.join(' or ') ||
      'a repertoire move'
    );
  }
}
