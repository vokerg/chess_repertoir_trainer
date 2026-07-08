import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PageHeaderComponent } from '../../../shared/ui/page-header/page-header.component';
import { PanelComponent } from '../../../shared/ui/panel/panel.component';
import { ConfirmDialogService } from '../../../shared/ui/confirm-dialog/confirm-dialog.service';
import { AccountsApiService } from '../data-access/accounts-api.service';
import { dateLabel } from '../helpers/account-labels';
import { AccountsStore } from '../state/accounts.store';

@Component({
  selector: 'app-lichess-settings-page',
  standalone: true,
  imports: [PageHeaderComponent, PanelComponent],
  providers: [AccountsApiService, AccountsStore],
  templateUrl: './lichess-settings-page.component.html',
  styleUrl: './lichess-settings-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LichessSettingsPageComponent implements OnInit {
  protected readonly store = inject(AccountsStore);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly route = inject(ActivatedRoute);
  protected readonly dateLabel = dateLabel;

  ngOnInit(): void {
    void this.store.loadLichessConnection();
    this.showLichessCallbackNotice();
  }

  protected async confirmDisconnectLichess(): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Disconnect Lichess?',
      message: 'This revokes the OAuth connection. It will not delete tracked accounts or imported games.',
      tone: 'warning',
      confirmLabel: 'Disconnect',
      cancelLabel: 'Cancel',
    });

    if (confirmed) void this.store.disconnectLichess();
  }

  protected hasChallengeWriteScope(account: { scopes: string[] }): boolean {
    return account.scopes.includes('challenge:write');
  }

  private showLichessCallbackNotice(): void {
    const status = this.route.snapshot.queryParamMap.get('lichessConnected');
    if (status === '1') {
      this.store.showNotice('Lichess connected.');
    } else if (status === 'cancelled') {
      this.store.showNotice('Lichess connection cancelled.');
    } else if (status === 'error') {
      this.store.showError('Could not connect Lichess.');
    }
  }
}
