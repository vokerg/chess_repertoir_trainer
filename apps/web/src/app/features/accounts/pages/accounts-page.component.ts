import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  FactGridComponent,
  type UiFactItem,
} from '../../../shared/ui/fact-grid/fact-grid.component';
import {
  PageHeaderAction,
  PageHeaderComponent,
} from '../../../shared/ui/page-header/page-header.component';
import { PanelComponent } from '../../../shared/ui/panel/panel.component';
import { StateMessageComponent } from '../../../shared/ui/state-message/state-message.component';
import { type UiShellStat } from '../../../shared/ui/ui-shell.model';
import { AccountsApiService } from '../data-access/accounts-api.service';
import type {
  AccountImportRun,
  AccountImportStatus,
} from '../data-access/accounts.models';
import { dateLabel, providerClass, providerLabel } from '../helpers/account-labels';
import { AccountsStore } from '../state/accounts.store';

@Component({
  selector: 'app-accounts-page',
  standalone: true,
  imports: [
    NgClass,
    FormsModule,
    RouterLink,
    PageHeaderComponent,
    PanelComponent,
    FactGridComponent,
    StateMessageComponent,
  ],
  providers: [AccountsApiService, AccountsStore],
  templateUrl: './accounts-page.component.html',
  styleUrl: './accounts-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountsPageComponent implements OnInit {
  protected readonly store = inject(AccountsStore);
  protected readonly providerLabel = providerLabel;
  protected readonly providerClass = providerClass;
  protected readonly headerActions = computed<readonly PageHeaderAction[]>(() => [
    {
      id: 'refresh-games',
      label: this.store.syncingAllAccounts() ? 'Queueing refreshes...' : 'Refresh games',
      disabled:
        this.store.loading()
        || this.store.saving()
        || this.store.syncingAllAccounts()
        || this.store.syncingAccountId() !== null
        || this.store.backfillingAccountId() !== null
        || this.store.controllingImportRunId() !== null,
      run: () => this.store.syncActiveAccounts(),
    },
  ]);
  protected readonly accountStats = computed<readonly UiShellStat[]>(() => [
    { id: 'accounts', label: 'Accounts', value: this.store.accounts().length },
    {
      id: 'active-accounts',
      label: 'Active',
      value: this.store.accounts().filter((account) => account.isActive).length,
    },
    {
      id: 'imports-running',
      label: 'Importing',
      value: this.store.accounts().filter((account) => this.store.isImportActive(account.id)).length,
    },
  ]);
  protected readonly accountFactsById = computed<
    Readonly<Record<number, readonly UiFactItem[]>>
  >(() =>
    Object.fromEntries(
      this.store.accounts().map((account) => {
        const run = this.store.importRunForAccount(account.id);
        return [
          account.id,
          [
            {
              id: 'import-status',
              label: 'Import status',
              value: run ? this.importStatusLabel(run.status) : 'Not started',
            },
            {
              id: 'last-import',
              label: 'Last completed',
              value: dateLabel(run?.completedAt ?? account.lastSyncAt),
            },
            { id: 'created', label: 'Created', value: dateLabel(account.createdAt) },
          ] satisfies readonly UiFactItem[],
        ];
      }),
    ),
  );

  ngOnInit(): void {
    void this.store.initialize();
  }

  protected importStatusLabel(status: AccountImportStatus): string {
    switch (status) {
      case 'QUEUED': return 'Queued';
      case 'RUNNING': return 'Importing';
      case 'PAUSE_REQUESTED': return 'Pausing';
      case 'PAUSED': return 'Paused';
      case 'CANCEL_REQUESTED': return 'Cancelling';
      case 'CANCELLED': return 'Cancelled';
      case 'COMPLETED': return 'Completed';
      case 'FAILED': return 'Failed';
    }
  }

  protected importModeLabel(run: AccountImportRun): string {
    switch (run.mode) {
      case 'BOUNDED_INITIAL': return 'Recent history';
      case 'INCREMENTAL_FORWARD': return 'Forward refresh';
      case 'HISTORICAL_BACKFILL': return 'Older history';
      case 'LEGACY_SYNC': return 'Legacy sync';
    }
  }

  protected importRangeLabel(run: AccountImportRun): string {
    if (!run.requestedFrom || !run.requestedTo) return 'Legacy range';
    return `${dateLabel(run.requestedFrom)} – ${dateLabel(run.requestedTo)}`;
  }

  protected importProgressLabel(run: AccountImportRun): string {
    const windowProgress = run.windows.total === null
      ? ''
      : ` · ${run.windows.completed}/${run.windows.total} windows`;
    return `${run.games.seen} seen · ${run.games.imported} imported · ${run.games.duplicate} already present · ${run.games.failed} failed${windowProgress}`;
  }

  protected canPause(run: AccountImportRun): boolean {
    return run.status === 'QUEUED' || run.status === 'RUNNING';
  }

  protected canResume(run: AccountImportRun): boolean {
    return run.status === 'PAUSED';
  }

  protected canCancel(run: AccountImportRun): boolean {
    return ['QUEUED', 'RUNNING', 'PAUSE_REQUESTED', 'PAUSED'].includes(run.status);
  }

  protected canRetry(run: AccountImportRun): boolean {
    return run.status === 'FAILED' || run.status === 'CANCELLED';
  }
}
