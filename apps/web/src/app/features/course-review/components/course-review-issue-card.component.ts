import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BoardImageComponent } from '../../../shared/chess/board-image/board-image.component';
import { CopyableFenComponent } from '../../../shared/ui/copyable-fen/copyable-fen.component';
import type {
  CourseReviewFindingExampleViewModel,
  CourseReviewFindingViewModel,
} from '../helpers/course-review-finding.mapper';

@Component({
  selector: 'app-course-review-issue-card',
  standalone: true,
  imports: [BoardImageComponent, CopyableFenComponent, DatePipe, RouterLink],
  templateUrl: './course-review-issue-card.component.html',
  styleUrl: './course-review-issue-card.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CourseReviewIssueCardComponent {
  readonly finding = input.required<CourseReviewFindingViewModel>();

  protected readonly analysisQueryParams = computed(() => {
    const example = this.finding().examples[0];
    return {
      fen: this.finding().positionFen,
      gameId: example?.gameId ?? null,
      ply: example?.plyNumber ?? null,
    };
  });

  protected exampleAnalysisQueryParams(example: CourseReviewFindingExampleViewModel) {
    return {
      fen: this.finding().positionFen,
      gameId: example.gameId,
      ply: example.plyNumber,
    };
  }
}
