import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import type { LichessConnectionAccount } from '@chess-trainer/contracts/lichess';
import { ConfirmDialogService } from '../../../shared/ui/confirm-dialog/confirm-dialog.service';
import {
  FactGridComponent,
  type UiFactItem,
} from '../../../shared/ui/fact-grid/fact-grid.component';
import { PageHeaderComponent } from '../../../shared/ui/page-header/page-header.component';
import { PanelComponent } from '../../../shared/ui/panel/panel.component';
import { AccountsApiService } from '../data-access/accounts-api.service';
import { dateLabel } from '../helpers/account-labels';
import { missingLichessScopeLabels } from '../helpers/account-settings-view';
import { AccountsStore } from '../state/accounts.store';

@Component({
  selector: 'app-lichess-settings-page',
  standalone: true,
  imports: [PageHeaderComponent, PanelComponent, FactGridComponent],
  providers: [AccountsApiService, AccountsStore],
  templateUrl: './lichess-settings-page.component.html',
  styleUrl: './lichess-settings-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LichessSettingsPageComponent implements OnInit {
  protected readonly store = inject(AccountsStore);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly route = inject(ActivatedRoute);
  protected readonly missingLichessScopeLabels = missingLichessScopeLabels;
  protected readonly connectedAccount = computed(() => {
    const connection = this.store.lichessConnection();
    return connection?.connected ? connection.account : null;
  });

  ngOnInit(): void {
    void this.store.loadLichessConnection();
    this.showLichessCallbackNotice();
  }

  protected connectionFacts(account: LichessConnectionAccount): readonly UiFactItem[] {
    const facts: UiFactItem[] = [
      { id: 'connected', label: 'Connected', value: dateLabel(account.connectedAt) },
    ];

    if (account.expiresAt) {
      facts.push({ id: 'expires', label: 'Expires', value: dateLabel(account.expiresAt) });
    }

    if (account.externalAccountId) {
      facts.push({ id: 'tracked-account', label: 'Tracked account', value: 'Linked for imports' });
    }

    facts.push(
      {
        id: 'bot-challenges',
        label: 'Bot challenges',
        value: this.hasScope(account, 'challenge:write') ? 'Ready' : 'Missing',
      },
      {
        id: 'read-puzzles',
        label: 'Read puzzles',
        value: this.hasScope(account, 'puzzle:read') ? 'Ready' : 'Missing',
      },
      {
        id: 'submit-puzzles',
        label: 'Submit puzzle results',
        value: this.hasScope(account, 'puzzle:write') ? 'Ready' : 'Missing',
      },
    );

    return facts;
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

  protected hasScope(account: { scopes: string[] }, scope: string): boolean {
    return account.scopes.includes(scope);
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
