import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink, type Params } from '@angular/router';
import type { CourseExtensionCandidatesResponse } from '@chess-trainer/contracts/lab';
import { BoardImageComponent } from '../../../shared/chess/board-image/board-image.component';
import { serializeImportedGameSearchQuery } from '../../../shared/games/filters/imported-game-search-query.codec';
import { CopyableFenComponent } from '../../../shared/ui/copyable-fen/copyable-fen.component';
import { buildCourseEndingBuilderLaunchQueryParams } from '../../repertoire-builder/helpers/repertoire-builder-launch';
import type {
  CourseReviewFindingExampleViewModel,
  CourseReviewFindingLineReferenceViewModel,
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
  readonly courseId = input<number | null>(null);
  readonly courseName = input('');
  readonly endingFilters = input<CourseExtensionCandidatesResponse['filters'] | null>(null);
  readonly filterSummary = input('');

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

  protected builderQueryParams(
    lineRef: CourseReviewFindingLineReferenceViewModel,
  ): Params | null {
    const finding = this.finding();
    const builderContext = finding.courseEndingBuilderContext;
    const courseId = this.courseId();
    const courseName = this.courseName().trim();
    const filters = this.endingFilters();
    if (finding.kind !== 'COURSE_ENDING' || !builderContext || !courseId || !courseName || !filters) {
      return null;
    }

    const { courseId: _courseId, minGames, ...gameFilters } = filters;
    return buildCourseEndingBuilderLaunchQueryParams({
      courseId,
      courseName,
      chapterId: lineRef.chapterId,
      lineId: lineRef.lineId,
      lineName: lineRef.lineName,
      nodeId: lineRef.nodeId,
      startingFen: finding.positionFen,
      side: builderContext.side,
      observedMoveUci: builderContext.observedMoveUci,
      observedMoveSan: builderContext.observedMoveSan,
      observedGameCount: finding.count,
      minGames,
      sourceKey: builderContext.sourceKey,
      sequence: lineRef.moveSequenceSan,
      results: finding.results,
      filterSummary: this.filterSummary(),
      sourceFilters: serializeImportedGameSearchQuery({
        ...gameFilters,
        sort: 'endedAtDesc',
        limit: 50,
      }).toString(),
    });
  }
}
