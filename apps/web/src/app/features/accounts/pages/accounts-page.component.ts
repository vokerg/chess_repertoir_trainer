import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PageHeaderAction, PageHeaderComponent } from '../../../shared/ui/page-header/page-header.component';
import { PanelComponent } from '../../../shared/ui/panel/panel.component';
import { ConfirmDialogService } from '../../../shared/ui/confirm-dialog/confirm-dialog.service';
import { type UiShellStat } from '../../../shared/ui/ui-shell.model';
import { AccountsApiService } from '../data-access/accounts-api.service';
import { ExternalAccount } from '../data-access/accounts.models';
import { dateLabel, providerClass, providerLabel, syncStatusLabel } from '../helpers/account-labels';
import { AccountsStore } from '../state/accounts.store';

@Component({
  selector: 'app-accounts-page',
  standalone: true,
  imports: [NgClass, FormsModule, PageHeaderComponent, PanelComponent],
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
}
