import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PageHeaderAction, PageHeaderComponent } from '../../../shared/ui/page-header/page-header.component';
import { PanelComponent } from '../../../shared/ui/panel/panel.component';
import { ConfirmDialogService } from '../../../shared/ui/confirm-dialog/confirm-dialog.service';
import { type UiShellStat } from '../../../shared/ui/ui-shell.model';
import { AccountsApiService } from '../data-access/accounts-api.service';
import { ExternalAccount, ImportRunSummary } from '../data-access/accounts.models';
import { dateLabel, providerClass, providerLabel, syncStatusLabel } from '../helpers/account-labels';
import { AccountsStore } from '../state/accounts.store';

@Component({
  selector: 'app-accounts-page',
  standalone: true,
  imports: [NgClass, FormsModule, RouterLink, PageHeaderComponent, PanelComponent],
  providers: [AccountsApiService, AccountsStore],
  templateUrl: './accounts-page.component.html',
  styleUrl: './accounts-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountsPageComponent implements OnInit {
  protected readonly store = inject(AccountsStore);
  private readonly confirmDialog = inject(ConfirmDialogService);
  protected readonly providerLabel = providerLabel;
  protected readonly providerClass = providerClass;
  protected readonly syncStatusLabel = syncStatusLabel;
  protected readonly dateLabel = dateLabel;
  protected readonly headerActions = computed<readonly PageHeaderAction[]>(() => [
    {
      id: 'refresh-games',
      label: this.store.syncingAllAccounts() ? 'Refreshing games...' : 'Refresh games',
      disabled:
        this.store.loading() ||
        this.store.saving() ||
        this.store.syncingAllAccounts() ||
        this.store.syncingAccountId() !== null ||
        this.store.resettingCursorAccountId() !== null ||
        this.store.deletingAccountId() !== null,
      run: () => this.store.syncActiveAccounts(),
    },
  ]);
  protected readonly accountStats = computed<readonly UiShellStat[]>(() => [
    { id: 'accounts', label: 'Accounts', value: this.store.accounts().length },
  ]);

  ngOnInit(): void {
    void this.store.loadAccounts();
  }

  protected async confirmResetCursor(account: ExternalAccount): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Reset import cursor?',
      message: `The next sync will re-scan the full history for ${providerLabel(account.provider)} @${account.username}. Already imported games will be skipped rather than duplicated.`,
      tone: 'warning',
      confirmLabel: 'Reset cursor',
      cancelLabel: 'Cancel',
    });

    if (confirmed) void this.store.resetCursor(account);
  }

  protected async confirmDeleteAccount(account: ExternalAccount): Promise<void> {
    const accountLabel = account.username ? `@${account.username}` : `account #${account.id}`;
    const confirmed = await this.confirmDialog.confirm({
      title: 'Delete account and imported data?',
      message: `Delete ${providerLabel(account.provider)} ${accountLabel} and all imported games, ply indexes, analysis, and sync history linked to it? This cannot be undone.`,
      tone: 'danger',
      confirmLabel: 'Delete account',
      cancelLabel: 'Cancel',
      requireTypedConfirmation: accountLabel,
    });

    if (confirmed) void this.store.deleteAccount(account);
  }

  protected async confirmIndexEligibleAccountGames(account: ExternalAccount): Promise<void> {
    const candidates = await this.store.refreshWorkflowCandidates(account.id);
    const gameIds = candidates.eligibleUnindexedGameIds;
    if (!gameIds.length) {
      this.store.showNotice('No unindexed blitz/rapid games found for this account.');
      return;
    }

    const confirmed = await this.confirmDialog.confirm({
      title: 'Index blitz/rapid games?',
      message: `Index ${gameIds.length} blitz/rapid ${gameIds.length === 1 ? 'game' : 'games'} for ${providerLabel(account.provider)} @${account.username}?`,
      tone: 'warning',
      confirmLabel: 'Index games',
      cancelLabel: 'Cancel',
    });

    if (confirmed) void this.store.indexEligibleAccountGames(account, gameIds);
  }

  protected async confirmAnalyseEligibleAccountGames(account: ExternalAccount): Promise<void> {
    const candidates = await this.store.refreshWorkflowCandidates(account.id);
    const gameIds = candidates.eligibleIndexedGameIds;
    if (!gameIds.length) {
      this.store.showNotice('No indexed blitz/rapid games found for this account.');
      return;
    }

    const confirmed = await this.confirmDialog.confirm({
      title: 'Analyse indexed blitz/rapid games?',
      message: `Submit ${gameIds.length} indexed blitz/rapid ${gameIds.length === 1 ? 'game' : 'games'} for ${providerLabel(account.provider)} @${account.username}?`,
      tone: 'warning',
      confirmLabel: 'Analyse games',
      cancelLabel: 'Cancel',
    });

    if (confirmed) void this.store.analyseEligibleAccountGames(account, gameIds);
  }

  protected async confirmIndexNewImportedGames(account: ExternalAccount, result: ImportRunSummary): Promise<void> {
    await this.store.refreshWorkflowCandidates(account.id);
    const gameIds = this.newImportedUnindexedGameIds(account.id, result);
    if (!gameIds.length) {
      this.store.showNotice('No newly imported blitz/rapid games need indexing.');
      return;
    }

    const confirmed = await this.confirmDialog.confirm({
      title: 'Index newly imported games?',
      message: `Index ${gameIds.length} newly imported blitz/rapid ${gameIds.length === 1 ? 'game' : 'games'} for ${providerLabel(account.provider)} @${account.username}?`,
      tone: 'warning',
      confirmLabel: 'Index new games',
      cancelLabel: 'Cancel',
    });

    if (confirmed) void this.store.indexEligibleAccountGames(account, gameIds);
  }

  protected async confirmAnalyseNewImportedGames(account: ExternalAccount, result: ImportRunSummary): Promise<void> {
    await this.store.refreshWorkflowCandidates(account.id);
    const gameIds = this.newImportedIndexedGameIds(account.id, result);
    if (!gameIds.length) {
      this.store.showNotice('Index the newly imported blitz/rapid games before analysing them.');
      return;
    }

    const confirmed = await this.confirmDialog.confirm({
      title: 'Analyse newly imported games?',
      message: `Submit ${gameIds.length} newly imported indexed blitz/rapid ${gameIds.length === 1 ? 'game' : 'games'} for analysis?`,
      tone: 'warning',
      confirmLabel: 'Analyse new games',
      cancelLabel: 'Cancel',
    });

    if (confirmed) void this.store.analyseEligibleAccountGames(account, gameIds);
  }

  protected newImportedEligibleCount(result: ImportRunSummary): number {
    return result.eligibleImportedGameIds?.length ?? 0;
  }

  protected newImportedIndexedGameIds(accountId: number, result: ImportRunSummary): number[] {
    const indexedIds = new Set(this.store.workflowCandidates()[accountId]?.eligibleIndexedGameIds ?? []);
    return (result.eligibleImportedGameIds ?? []).filter((id) => indexedIds.has(id));
  }

  protected newImportedUnindexedGameIds(accountId: number, result: ImportRunSummary): number[] {
    const unindexedIds = new Set(this.store.workflowCandidates()[accountId]?.eligibleUnindexedGameIds ?? []);
    return (result.eligibleUnindexedGameIds ?? []).filter((id) => unindexedIds.has(id));
  }

}
