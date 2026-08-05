import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import type { AiBuilderCompletionSummaryRequest } from '@chess-trainer/contracts/ai';
import type { CandidateDecisionRequest } from '@chess-trainer/contracts/candidate-decision';
import {
  PageHeaderComponent,
  type PageHeaderAction,
  type PageHeaderStat,
} from '../../../shared/ui/page-header/page-header.component';
import { PanelComponent } from '../../../shared/ui/panel/panel.component';
import { RepertoireBuilderAiApiService } from '../data-access/repertoire-builder-ai-api.service';
import { RepertoireBuilderApiService } from '../data-access/repertoire-builder-api.service';
import { RepertoireBuilderCourseDialogComponent } from '../components/repertoire-builder-course-dialog.component';
import { RepertoireBuilderSetupDialogComponent } from '../components/repertoire-builder-setup-dialog.component';
import {
  RepertoireBuilderWorkbenchComponent,
  type RepertoireBuilderQueueMove,
} from '../components/repertoire-builder-workbench.component';
import {
  builderLaunchReturnUrl,
  isRepertoireBuilderCourseFindingLaunch,
  parseRepertoireBuilderLaunch,
  type RepertoireBuilderCourseFindingLaunch,
  type RepertoireBuilderLaunchContext,
} from '../helpers/repertoire-builder-launch';
import {
  isRepertoireBuilderProfileLaunch,
  type RepertoireBuilderProfileLaunch,
} from '../profile-launch';
import { RepertoireBuilderCandidateExplanationStore } from '../state/repertoire-builder-candidate-explanation.store';
import { RepertoireBuilderCompletionSummaryStore } from '../state/repertoire-builder-completion-summary.store';
import { RepertoireBuilderCourseStore } from '../state/repertoire-builder-course.store';
import {
  REPERTOIRE_BUILDER_CANDIDATE_LIMIT,
  type RepertoireBuilderSetup,
} from '../state/repertoire-builder.models';
import { RepertoireBuilderStore } from '../state/repertoire-builder.store';

@Component({
  selector: 'app-repertoire-builder-page',
  standalone: true,
  imports: [
    PageHeaderComponent,
    PanelComponent,
    RepertoireBuilderSetupDialogComponent,
    RepertoireBuilderWorkbenchComponent,
    RepertoireBuilderCourseDialogComponent,
  ],
  providers: [
    RepertoireBuilderApiService,
    RepertoireBuilderAiApiService,
    RepertoireBuilderStore,
    RepertoireBuilderCandidateExplanationStore,
    RepertoireBuilderCompletionSummaryStore,
    RepertoireBuilderCourseStore,
  ],
  templateUrl: './repertoire-builder-page.component.html',
  styleUrl: './repertoire-builder-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RepertoireBuilderPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly store = inject(RepertoireBuilderStore);
  protected readonly candidateExplanationStore = inject(RepertoireBuilderCandidateExplanationStore);
  protected readonly completionSummaryStore = inject(RepertoireBuilderCompletionSummaryStore);
  protected readonly courseStore = inject(RepertoireBuilderCourseStore);
  protected readonly launchContext = signal<RepertoireBuilderLaunchContext | null>(null);
  protected readonly launchError = signal<string | null>(null);
  protected readonly courseLaunchContext = computed<RepertoireBuilderCourseFindingLaunch | null>(() => {
    const launch = this.launchContext();
    return isRepertoireBuilderCourseFindingLaunch(launch) ? launch : null;
  });
  protected readonly profileLaunchContext = computed<RepertoireBuilderProfileLaunch | null>(() => {
    const launch = this.launchContext();
    return isRepertoireBuilderProfileLaunch(launch) ? launch : null;
  });
  private readonly synchronizeCandidateExplanation = effect(() => {
    this.candidateExplanationStore.sync(
      this.store.candidateResponse(),
      this.store.previewCandidate()?.moveUci ?? null,
    );
  });
  private readonly synchronizeCompletionSummary = effect(() => {
    this.completionSummaryStore.sync(this.currentCompletionSummaryRequest());
  });

  protected readonly initialSetup = computed<RepertoireBuilderSetup>(() => {
    const setup = this.store.setup();
    const launch = this.launchContext();
    if (this.store.session() || !launch) return setup;
    if (isRepertoireBuilderProfileLaunch(launch)) {
      return {
        ...launch.setup,
        profileDefaults: {
          source: launch.profileSource,
          setup: launch.setup,
        },
      };
    }
    return { ...setup, side: launch.side };
  });

  protected readonly headerStats = computed<readonly PageHeaderStat[]>(() => {
    if (!this.store.session()) return [];
    return [
      { id: 'decisions', label: 'Decisions', value: this.store.acceptedDecisionCount() },
      { id: 'queue', label: 'Queue', value: this.store.queue().length },
      { id: 'deferred', label: 'Deferred', value: this.store.deferredBranches().length },
      { id: 'branches', label: 'Branches', value: this.store.session()?.branches.length ?? 0 },
    ];
  });

  protected readonly headerActions = computed<readonly PageHeaderAction[]>(() => {
    const actions: PageHeaderAction[] = [];
    const launch = this.launchContext();
    if (launch) {
      actions.push({
        id: 'back-to-builder-source',
        label: this.backLabel(launch),
        run: () => void this.backToSource(),
      });
    }
    if (!this.store.session()) {
      actions.push({
        id: 'start-setup',
        label: 'Start setup',
        run: () => this.store.openSetup(),
      });
      return actions;
    }
    if (this.store.isCompleted()) {
      actions.push({
        id: 'review-course-output',
        label: 'Review course output',
        run: () => void this.openCourseReview(),
      });
    }
    actions.push(
      {
        id: 'restart-setup',
        label: 'Restart setup',
        run: () => this.store.openSetup(),
      },
      {
        id: 'new-draft',
        label: 'New draft',
        run: () => this.startNewDraft(),
      },
    );
    return actions;
  });

  ngOnInit(): void {
    const parsed = parseRepertoireBuilderLaunch(this.route.snapshot.queryParamMap);
    this.launchContext.set(parsed.context);
    this.launchError.set(parsed.error);
    void this.candidateExplanationStore.initialize();
    void this.completionSummaryStore.initialize();
  }

  protected sourceTitle(launch: RepertoireBuilderCourseFindingLaunch): string {
    return launch.source === 'COURSE_ENDING' ? 'Course ending source' : 'Opponent gap source';
  }

  protected sourceSubtitle(launch: RepertoireBuilderCourseFindingLaunch): string {
    return launch.source === 'COURSE_ENDING'
      ? 'This builder draft extends one exact terminal course position. The source evidence remains visible while you adjust the target setup.'
      : 'This builder draft covers one observed opponent move from an exact course position. The source evidence remains visible while you adjust the target setup.';
  }

  protected pathFallback(launch: RepertoireBuilderCourseFindingLaunch): string {
    if (launch.sequence) return launch.sequence;
    return launch.anchorKind === 'LINE_START' ? 'Course start position' : 'Course position';
  }

  protected evidenceLabel(launch: RepertoireBuilderCourseFindingLaunch): string {
    const threshold = launch.source === 'COURSE_ENDING'
      ? `minimum ${launch.minGames}`
      : `minimum overlap ${launch.minCoveredPlies} plies`;
    return `${launch.observedGameCount} games · ${threshold} · ${launch.results.win}W ${launch.results.draw}D ${launch.results.loss}L`;
  }

  protected sourceBoundary(launch: RepertoireBuilderCourseFindingLaunch): string {
    return launch.source === 'COURSE_ENDING'
      ? 'Consequence: extend this existing line only. Replacement, a separate line, and another destination are not treated as equivalent actions.'
      : 'Consequence: add coverage for this observed opponent move on this exact line only. Replacement, an alternate line, and another destination are not treated as equivalent actions.';
  }

  protected backLabel(launch: RepertoireBuilderLaunchContext): string {
    if (isRepertoireBuilderProfileLaunch(launch)) return 'Back to Chess profile';
    return launch.source === 'COURSE_ENDING' ? 'Back to course endings' : 'Back to opponent gaps';
  }

  protected reorderQueue(change: RepertoireBuilderQueueMove): void {
    this.store.reorderQueue(change.branchId, change.targetIndex);
  }

  protected startBuilder(setup: RepertoireBuilderSetup): void {
    void this.store.start(setup, this.courseLaunchContext());
  }

  protected startNewDraft(): void {
    this.courseStore.close();
    this.completionSummaryStore.sync(null);
    this.launchContext.set(null);
    this.launchError.set(null);
    this.store.startNewDraft();
    void this.router.navigate(['/builder'], { replaceUrl: true });
  }

  protected discardProfileSuggestion(): void {
    if (this.store.session() || !this.profileLaunchContext()) return;
    this.launchContext.set(null);
    this.launchError.set(null);
    this.store.startNewDraft();
    void this.router.navigate(['/builder'], { replaceUrl: true });
  }

  protected requestCandidateExplanation(): void {
    const request = this.currentCandidateDecisionRequest();
    const response = this.store.candidateResponse();
    const selected = this.store.previewCandidate();
    if (!request || !response || !selected) return;
    void this.candidateExplanationStore.request(request, response, selected.moveUci);
  }

  protected setCandidateExplanationComparison(moveUci: string | null): void {
    this.candidateExplanationStore.setComparison(
      moveUci,
      this.store.candidateResponse(),
      this.store.previewCandidate()?.moveUci ?? null,
    );
  }

  protected requestCompletionSummary(): void {
    void this.completionSummaryStore.request(this.currentCompletionSummaryRequest());
  }

  protected async backToSource(): Promise<void> {
    const launch = this.launchContext();
    if (!launch) return;
    await this.router.navigateByUrl(builderLaunchReturnUrl(launch));
  }

  protected async openCourseReview(): Promise<void> {
    const session = this.store.session();
    if (!session || session.lifecycle !== 'COMPLETED') return;
    await this.courseStore.openFor(session, this.courseLaunchContext());
  }

  private currentCandidateDecisionRequest(): CandidateDecisionRequest | null {
    const session = this.store.session();
    const branch = this.store.activeBranch();
    if (!session || !branch || session.lifecycle !== 'ACTIVE') return null;
    return {
      fen: branch.fen,
      decisionRole: branch.role,
      target: session.targetSnapshot.value,
      candidateLimit: REPERTOIRE_BUILDER_CANDIDATE_LIMIT,
    };
  }

  private currentCompletionSummaryRequest(): AiBuilderCompletionSummaryRequest | null {
    if (!this.courseStore.open()) return null;
    const draft = this.courseStore.draft();
    const selectedTarget = this.courseStore.selectedTarget();
    const applyResult = this.courseStore.result();
    const course = this.courseStore.courses().find((item) => item.id === applyResult?.courseId);
    const chapter = this.courseStore.chapters().find((item) => item.id === applyResult?.chapterId);
    if (!draft || !selectedTarget || !applyResult || !course || !chapter) return null;
    return {
      draft,
      selectedTarget,
      applyResult,
      destination: {
        courseId: course.id,
        courseName: course.name,
        chapterId: chapter.id,
        chapterName: chapter.name,
      },
    };
  }
}
