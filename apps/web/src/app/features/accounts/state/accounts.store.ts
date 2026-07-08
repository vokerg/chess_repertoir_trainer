import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AccountsApiService } from '../data-access/accounts-api.service';
import {
  AccountForm,
  ExternalAccount,
  ImportedGameWorkflowCandidates,
  ImportRunSummary,
  LichessConnectionStatus,
} from '../data-access/accounts.models';
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
  readonly settingDefaultProgressAccountId = signal<number | null>(null);
  readonly disconnectingLichess = signal(false);
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);
  readonly syncResults = signal<Record<number, ImportRunSummary>>({});
  readonly workflowCandidates = signal<Record<number, ImportedGameWorkflowCandidates>>({});
  readonly indexingWorkflowAccountId = signal<number | null>(null);
  readonly indexWorkflowCompleted = signal(0);
  readonly indexWorkflowTotal = signal(0);
  readonly analysingWorkflowAccountId = signal<number | null>(null);
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
      await this.loadWorkflowCandidates(account.id);
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

  async connectLichess(): Promise<void> {
    this.clearMessages();
    try {
      const response = await firstValueFrom(this.api.startLichessConnection());
      this.document.defaultView?.location.assign(response.url);
    } catch (error) {
      this.error.set(readApiError(error, 'Could not start Lichess connection.'));
    }
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
          await this.loadWorkflowCandidates(account.id);
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

  async setDefaultProgressAccount(account: ExternalAccount): Promise<void> {
    this.settingDefaultProgressAccountId.set(account.id);
    this.clearMessages();
    const nextAccountId = account.isDefaultProgressAccount ? null : account.id;
    try {
      const response = await firstValueFrom(this.api.setDefaultProgressAccount(nextAccountId));
      this.accounts.set(response.accounts);
      this.notice.set(
        response.defaultProgressAccountId
          ? `${accountSummary(account)} is now the default progress account.`
          : 'Default progress account cleared.',
      );
    } catch (error) {
      this.error.set(readApiError(error, 'Could not update default progress account.'));
    } finally {
      this.settingDefaultProgressAccountId.set(null);
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
      this.workflowCandidates.update((candidates) => {
        const next = { ...candidates };
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

  async refreshWorkflowCandidates(accountId: number): Promise<ImportedGameWorkflowCandidates> {
    return this.loadWorkflowCandidates(accountId);
  }

  async indexEligibleAccountGames(account: ExternalAccount, gameIds?: readonly number[]): Promise<void> {
    const candidates = gameIds ? null : await this.ensureWorkflowCandidates(account.id);
    const selectedGameIds = Array.from(new Set(gameIds ?? candidates?.eligibleUnindexedGameIds ?? []));
    if (!selectedGameIds.length || this.indexingWorkflowAccountId()) return;

    await this.indexAccountGames(account, selectedGameIds);
  }

  async analyseEligibleAccountGames(account: ExternalAccount, gameIds?: readonly number[]): Promise<void> {
    const candidates = gameIds ? null : await this.ensureWorkflowCandidates(account.id);
    const selectedGameIds = Array.from(new Set(gameIds ?? candidates?.eligibleIndexedGameIds ?? []));
    if (!selectedGameIds.length || this.analysingWorkflowAccountId()) return;

    await this.analyseAccountGames(account, selectedGameIds);
  }

  private async indexAccountGames(account: ExternalAccount, gameIds: number[]): Promise<void> {
    if (!gameIds.length || this.indexingWorkflowAccountId()) return;

    this.clearMessages();
    this.indexingWorkflowAccountId.set(account.id);
    this.indexWorkflowCompleted.set(0);
    this.indexWorkflowTotal.set(gameIds.length);
    const failures: string[] = [];

    try {
      for (const gameId of gameIds) {
        try {
          const result = await firstValueFrom(this.api.runIndexWorkflow(gameId));
          if (!result.eligible || result.plyIndex?.status === 'FAILED') {
            failures.push(result.plyIndex?.error || `Could not index game #${gameId}.`);
          }
        } catch (error) {
          failures.push(readApiError(error, `Could not index game #${gameId}.`));
        } finally {
          this.indexWorkflowCompleted.update((completed) => completed + 1);
        }
      }

      await this.loadWorkflowCandidates(account.id);
      if (failures.length) {
        this.error.set(failures[0]);
      } else {
        this.notice.set(`Indexed ${gameIds.length} blitz/rapid ${gameIds.length === 1 ? 'game' : 'games'}.`);
      }
    } finally {
      this.indexingWorkflowAccountId.set(null);
    }
  }

  private async analyseAccountGames(account: ExternalAccount, gameIds: number[]): Promise<void> {
    this.clearMessages();
    this.analysingWorkflowAccountId.set(account.id);
    try {
      const result = await firstValueFrom(this.api.startBatchAnalysis(gameIds));
      this.notice.set(`Submitted ${result.gameIds.length} indexed blitz/rapid ${result.gameIds.length === 1 ? 'game' : 'games'} for analysis.`);
      await this.loadWorkflowCandidates(account.id);
    } catch (error) {
      this.error.set(readApiError(error, 'Could not submit standard analysis workflow.'));
    } finally {
      this.analysingWorkflowAccountId.set(null);
    }
  }

  private patchAccount(updated: ExternalAccount): void {
    this.accounts.update((accounts) => accounts.map((account) => (account.id === updated.id ? updated : account)));
  }

  private clearMessages(): void {
    this.error.set(null);
    this.notice.set(null);
  }

  private async ensureWorkflowCandidates(accountId: number): Promise<ImportedGameWorkflowCandidates> {
    const existing = this.workflowCandidates()[accountId];
    if (existing) return existing;
    return this.loadWorkflowCandidates(accountId);
  }

  private async loadWorkflowCandidates(accountId: number): Promise<ImportedGameWorkflowCandidates> {
    const candidates = await firstValueFrom(this.api.getWorkflowCandidates(accountId));
    this.workflowCandidates.update((items) => ({ ...items, [accountId]: candidates }));
    return candidates;
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
