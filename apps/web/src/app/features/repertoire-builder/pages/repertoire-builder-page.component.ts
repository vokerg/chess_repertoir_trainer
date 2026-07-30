import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  PageHeaderComponent,
  type PageHeaderAction,
  type PageHeaderStat,
} from '../../../shared/ui/page-header/page-header.component';
import { PanelComponent } from '../../../shared/ui/panel/panel.component';
import { RepertoireBuilderApiService } from '../data-access/repertoire-builder-api.service';
import { RepertoireBuilderCourseDialogComponent } from '../components/repertoire-builder-course-dialog.component';
import { RepertoireBuilderSetupDialogComponent } from '../components/repertoire-builder-setup-dialog.component';
import {
  RepertoireBuilderWorkbenchComponent,
  type RepertoireBuilderQueueMove,
} from '../components/repertoire-builder-workbench.component';
import {
  builderLaunchReturnUrl,
  parseRepertoireBuilderLaunch,
  type RepertoireBuilderCourseFindingLaunch,
} from '../helpers/repertoire-builder-launch';
import { RepertoireBuilderCourseStore } from '../state/repertoire-builder-course.store';
import type { RepertoireBuilderSetup } from '../state/repertoire-builder.models';
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
  providers: [RepertoireBuilderApiService, RepertoireBuilderStore, RepertoireBuilderCourseStore],
  templateUrl: './repertoire-builder-page.component.html',
  styleUrl: './repertoire-builder-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RepertoireBuilderPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly store = inject(RepertoireBuilderStore);
  protected readonly courseStore = inject(RepertoireBuilderCourseStore);
  protected readonly launchContext = signal<RepertoireBuilderCourseFindingLaunch | null>(null);
  protected readonly launchError = signal<string | null>(null);

  protected readonly initialSetup = computed<RepertoireBuilderSetup>(() => {
    const setup = this.store.setup();
    const launch = this.launchContext();
    return launch && !this.store.session() ? { ...setup, side: launch.side } : setup;
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
        id: 'back-to-course-finding',
        label: this.backLabel(launch),
        run: () => void this.backToSource(),
      });
    }
    if (!this.store.session()) return actions;
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

  protected backLabel(launch: RepertoireBuilderCourseFindingLaunch): string {
    return launch.source === 'COURSE_ENDING' ? 'Back to course endings' : 'Back to opponent gaps';
  }

  protected reorderQueue(change: RepertoireBuilderQueueMove): void {
    this.store.reorderQueue(change.branchId, change.targetIndex);
  }

  protected startBuilder(setup: RepertoireBuilderSetup): void {
    void this.store.start(setup, this.launchContext());
  }

  protected startNewDraft(): void {
    this.launchContext.set(null);
    this.launchError.set(null);
    this.store.startNewDraft();
    void this.router.navigate(['/builder'], { replaceUrl: true });
  }

  protected async backToSource(): Promise<void> {
    const launch = this.launchContext();
    if (!launch) return;
    await this.router.navigateByUrl(builderLaunchReturnUrl(launch));
  }

  protected async openCourseReview(): Promise<void> {
    const session = this.store.session();
    if (!session || session.lifecycle !== 'COMPLETED') return;
    await this.courseStore.openFor(session, this.launchContext());
  }
}
