import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AccountsApiService } from '../data-access/accounts-api.service';
import { AccountForm, ExternalAccount, ImportRunSummary, LichessConnectionStatus } from '../data-access/accounts.models';
import { providerLabel } from '../helpers/account-labels';

@Injectable()
export class AccountsStore {
  private readonly api = inject(AccountsApiService);
  private readonly document = inject(DOCUMENT);

  readonly accounts = signal<ExternalAccount[]>([]);
  readonly lichessConnection = signal<LichessConnectionStatus | null>(null);
  readonly loading = signal(false);
  readonly loadingLichessConnection = signal(false);
  readonly saving = signal(false);
  readonly syncingAllAccounts = signal(false);
  readonly syncingAccountId = signal<number | null>(null);
  readonly resettingCursorAccountId = signal<number | null>(null);
  readonly deletingAccountId = signal<number | null>(null);
  readonly disconnectingLichess = signal(false);
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);
  readonly syncResults = signal<Record<number, ImportRunSummary>>({});
  readonly form = signal<AccountForm>(defaultForm());

  async loadAccounts(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.accounts.set((await firstValueFrom(this.api.getAccounts())) || []);
    } catch (error) {
      this.error.set(readApiError(error, 'Could not load accounts.'));
    } finally {
      this.loading.set(false);
    }
  }

  updateForm<K extends keyof AccountForm>(key: K, value: AccountForm[K]): void {
    this.form.update((form) => ({ ...form, [key]: value }));
  }

  async createAccount(): Promise<void> {
    const form = this.form();
    const username = form.username.trim();
    if (!username) return;
    this.saving.set(true);
    this.clearMessages();
    try {
      const displayName = form.displayName.trim();
      const account = await firstValueFrom(
        this.api.createAccount({ provider: form.provider, username, ...(displayName ? { displayName } : {}) }),
      );
      this.accounts.update((accounts) =>
        [account, ...accounts.filter((item) => item.id !== account.id)].sort(
          (a, b) => providerLabel(a.provider).localeCompare(providerLabel(b.provider)) || a.username.localeCompare(b.username),
        ),
      );
      this.notice.set(`Account ${account.username} is ready to sync.`);
      this.resetForm();
    } catch (error) {
      this.error.set(readApiError(error, 'Could not add account.'));
    } finally {
      this.saving.set(false);
    }
  }

  async syncAccount(account: ExternalAccount): Promise<void> {
    this.syncingAccountId.set(account.id);
    this.clearMessages();
    try {
      const result = await firstValueFrom(this.api.syncAccount(account.id));
      this.syncResults.update((results) => ({ ...results, [account.id]: result }));
      this.notice.set(`${providerLabel(account.provider)} account ${account.username} synced.`);
      await this.loadAccounts();
    } catch (error) {
      this.error.set(readApiError(error, `Could not sync ${account.username}.`));
    } finally {
      this.syncingAccountId.set(null);
    }
  }

  async loadLichessConnection(): Promise<void> {
    this.loadingLichessConnection.set(true);
    try {
      this.lichessConnection.set(await firstValueFrom(this.api.getLichessConnection()));
    } catch (error) {
      this.error.set(readApiError(error, 'Could not load Lichess connection.'));
    } finally {
      this.loadingLichessConnection.set(false);
    }
  }

  connectLichess(): void {
    this.document.defaultView?.location.assign(this.api.getLichessConnectUrl());
  }

  async disconnectLichess(): Promise<void> {
    this.disconnectingLichess.set(true);
    this.clearMessages();
    try {
      await firstValueFrom(this.api.disconnectLichess());
      await this.loadLichessConnection();
      this.notice.set('Lichess disconnected.');
    } catch (error) {
      this.error.set(readApiError(error, 'Could not disconnect Lichess.'));
    } finally {
      this.disconnectingLichess.set(false);
    }
  }

  showNotice(message: string): void {
    this.error.set(null);
    this.notice.set(message);
  }

  showError(message: string): void {
    this.notice.set(null);
    this.error.set(message);
  }

  async syncActiveAccounts(): Promise<void> {
    const activeAccounts = this.accounts().filter((account) => account.isActive);
    this.clearMessages();

    if (activeAccounts.length === 0) {
      this.notice.set('No active accounts are enabled for game refresh.');
      return;
    }

    this.syncingAllAccounts.set(true);
    const failedAccounts: string[] = [];
    let syncedCount = 0;

    try {
      for (const account of activeAccounts) {
        this.syncingAccountId.set(account.id);
        try {
          const result = await firstValueFrom(this.api.syncAccount(account.id));
          this.syncResults.update((results) => ({ ...results, [account.id]: result }));
          syncedCount += 1;
        } catch (error) {
          failedAccounts.push(`${accountSummary(account)} (${readApiError(error, 'sync failed')})`);
        }
      }

      await this.loadAccounts();

      if (failedAccounts.length > 0) {
        const summary = `Refreshed games for ${syncedCount} ${syncedCount === 1 ? 'account' : 'accounts'}.`;
        this.error.set(`${summary} Failed: ${failedAccounts.join('; ')}.`);
      } else {
        this.notice.set(
          `Refreshed games for ${syncedCount} active ${syncedCount === 1 ? 'account' : 'accounts'}.`,
        );
      }
    } finally {
      this.syncingAccountId.set(null);
      this.syncingAllAccounts.set(false);
    }
  }

  async resetCursor(account: ExternalAccount): Promise<void> {
    this.resettingCursorAccountId.set(account.id);
    this.clearMessages();
    try {
      const updated = await firstValueFrom(this.api.resetCursor(account.id));
      this.patchAccount(updated);
      this.notice.set(`${providerLabel(updated.provider)} account ${updated.username} will fully re-scan on the next sync.`);
    } catch (error) {
      this.error.set(readApiError(error, `Could not reset ${account.username}'s cursor.`));
    } finally {
      this.resettingCursorAccountId.set(null);
    }
  }

  async toggleActive(account: ExternalAccount): Promise<void> {
    this.clearMessages();
    try {
      const updated = await firstValueFrom(this.api.setActive(account.id, !account.isActive));
      this.patchAccount(updated);
      this.notice.set(`${updated.username} is now ${updated.isActive ? 'active' : 'inactive'}.`);
    } catch (error) {
      this.error.set(readApiError(error, 'Could not update account.'));
    }
  }

  async deleteAccount(account: ExternalAccount): Promise<void> {
    this.deletingAccountId.set(account.id);
    this.clearMessages();
    try {
      const result = await firstValueFrom(this.api.deleteAccount(account.id));
      this.accounts.update((accounts) => accounts.filter((item) => item.id !== account.id));
      this.syncResults.update((results) => {
        const next = { ...results };
        delete next[account.id];
        return next;
      });
      this.notice.set(`${providerLabel(result.account.provider)} account ${result.account.username} was deleted with its imported data.`);
    } catch (error) {
      this.error.set(readApiError(error, `Could not delete ${account.username}.`));
    } finally {
      this.deletingAccountId.set(null);
    }
  }

  resetForm(): void {
    this.form.set(defaultForm());
  }

  private patchAccount(updated: ExternalAccount): void {
    this.accounts.update((accounts) => accounts.map((account) => (account.id === updated.id ? updated : account)));
  }

  private clearMessages(): void {
    this.error.set(null);
    this.notice.set(null);
  }
}

function defaultForm(): AccountForm {
  return { provider: 'LICHESS', username: '', displayName: '' };
}

function accountSummary(account: ExternalAccount): string {
  return `${providerLabel(account.provider)} @${account.username}`;
}

function readApiError(error: unknown, fallback: string): string {
  const payload = (error as { error?: unknown })?.error;
  if (typeof payload === 'string') return payload;
  const structured = payload as { message?: string; error?: unknown } | undefined;
  if (structured?.message) return structured.message;
  if (Array.isArray(structured?.error)) {
    return structured.error.map((item) => (item as { message?: string })?.message || String(item)).join(', ');
  }
  if (typeof structured?.error === 'string') return structured.error;
  return fallback;
}
