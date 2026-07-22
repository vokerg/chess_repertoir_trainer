import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { CourseExtensionCandidate } from '@chess-trainer/contracts/lab';
import { BoardImageComponent } from '../../../../shared/chess/board-image/board-image.component';
import { CopyableFenComponent } from '../../../../shared/ui/copyable-fen/copyable-fen.component';
import { CourseDetailApiService } from '../../../courses/data-access/course-detail-api.service';
import { CourseExtensionCandidatesApiService } from './data-access/course-extension-candidates-api.service';
import { CourseExtensionCandidatesStore } from './state/course-extension-candidates.store';

@Component({
  selector: 'app-lab-course-extension-candidates',
  standalone: true,
  imports: [BoardImageComponent, CopyableFenComponent, DatePipe, RouterLink],
  providers: [CourseDetailApiService, CourseExtensionCandidatesApiService, CourseExtensionCandidatesStore],
  templateUrl: './course-extension-candidates-experiment.component.html',
  styleUrl: './course-extension-candidates-experiment.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CourseExtensionCandidatesExperimentComponent implements OnInit {
  protected readonly store = inject(CourseExtensionCandidatesStore);

  ngOnInit(): void {
    void this.store.initialize();
  }

  protected selectedNumber(event: Event): number {
    return Number((event.target as HTMLSelectElement | HTMLInputElement).value);
  }

  protected boardPov(candidate: CourseExtensionCandidate): 'white' | 'black' {
    return candidate.userColor === 'WHITE' ? 'white' : 'black';
  }

  protected analysisQueryParams(candidate: CourseExtensionCandidate) {
    const example = candidate.examples[0];
    return {
      fen: candidate.normalizedFen,
      gameId: example?.gameId ?? null,
      ply: example?.plyNumber ?? null,
    };
  }
}
