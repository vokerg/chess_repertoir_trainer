import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import {
  PageHeaderComponent,
  type PageHeaderAction,
  type PageHeaderStat,
} from '../../../shared/ui/page-header/page-header.component';
import { RepertoireBuilderApiService } from '../data-access/repertoire-builder-api.service';
import { RepertoireBuilderSetupDialogComponent } from '../components/repertoire-builder-setup-dialog.component';
import {
  RepertoireBuilderWorkbenchComponent,
  type RepertoireBuilderQueueMove,
} from '../components/repertoire-builder-workbench.component';
import { RepertoireBuilderStore } from '../state/repertoire-builder.store';

@Component({
  selector: 'app-repertoire-builder-page',
  standalone: true,
  imports: [
    PageHeaderComponent,
    RepertoireBuilderSetupDialogComponent,
    RepertoireBuilderWorkbenchComponent,
  ],
  providers: [RepertoireBuilderApiService, RepertoireBuilderStore],
  templateUrl: './repertoire-builder-page.component.html',
  styleUrl: './repertoire-builder-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RepertoireBuilderPageComponent {
  protected readonly store = inject(RepertoireBuilderStore);

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
    if (!this.store.session()) return [];
    return [
      {
        id: 'restart-setup',
        label: 'Restart setup',
        run: () => this.store.openSetup(),
      },
      {
        id: 'new-draft',
        label: 'New draft',
        run: () => this.store.startNewDraft(),
      },
    ];
  });

  protected reorderQueue(change: RepertoireBuilderQueueMove): void {
    this.store.reorderQueue(change.branchId, change.targetIndex);
  }
}
