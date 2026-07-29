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
  type RepertoireBuilderCourseEndingLaunch,
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
  protected readonly launchContext = signal<RepertoireBuilderCourseEndingLaunch | null>(null);
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
    if (this.launchContext()) {
      actions.push({
        id: 'back-to-course-ending',
        label: 'Back to course endings',
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
