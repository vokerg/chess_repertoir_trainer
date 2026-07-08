import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { PageHeaderComponent } from '../../../shared/ui/page-header/page-header.component';
import { PanelComponent } from '../../../shared/ui/panel/panel.component';
import { AccountsApiService } from '../data-access/accounts-api.service';
import { type ExternalAccount } from '../data-access/accounts.models';

@Component({
  selector: 'app-progress-entry-page',
  standalone: true,
  imports: [PageHeaderComponent, PanelComponent, RouterLink],
  providers: [AccountsApiService],
  template: `
    <section class="stack">
      <app-page-header title="Progress" subtitle="Opening your player dashboard." />

      <app-panel title="Finding your dashboard">
        @if (loading()) {
          <p class="status-note">Loading connected accounts...</p>
        } @else if (error(); as error) {
          <p class="status-error">{{ error }}</p>
          <a class="compact-action secondary" routerLink="/accounts">Manage accounts</a>
        }
      </app-panel>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProgressEntryPageComponent implements OnInit {
  private readonly accountsApi = inject(AccountsApiService);
  private readonly router = inject(Router);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    void this.openProgress();
  }

  private async openProgress(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const accounts = await firstValueFrom(this.accountsApi.getAccounts());
      const account = this.progressAccount(accounts);
      if (account) {
        await this.router.navigate(['/accounts', account.id], { replaceUrl: true });
      } else {
        await this.router.navigate(['/accounts'], { replaceUrl: true });
      }
    } catch (error) {
      this.error.set(this.errorMessage(error));
      this.loading.set(false);
    }
  }

  private progressAccount(accounts: readonly ExternalAccount[]): ExternalAccount | undefined {
    return accounts.find((account) => account.isActive) ?? accounts[0];
  }

  private errorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const message = error.error?.message || error.error?.error;
      if (typeof message === 'string') return message;
    }
    return 'Unable to load accounts. You can still manage import sources from Accounts.';
  }
}
