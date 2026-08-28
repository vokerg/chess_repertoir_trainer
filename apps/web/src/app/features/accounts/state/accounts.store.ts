import { DOCUMENT } from '@angular/common';
import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AccountsApiService } from '../data-access/accounts-api.service';
import type {
  AccountForm,
  AccountImportRun,
  AccountImportStatus,
  ExternalAccount,
  LichessConnectionStatus,
} from '../data-access/accounts.models';
import { providerLabel } from '../helpers/account-labels';

const IMPORT_POLL_INTERVAL_MS = 2_000;
const ACTIVE_IMPORT_STATUSES = new Set<AccountImportStatus>([
  'QUEUED',
  'RUNNING',
  'PAUSE_REQUESTED',
  'PAUSED',
  'CANCEL_REQUESTED',
]);

@Injectable()
export class AccountsStore {
  private readonly api = inject(AccountsApiService);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private importPollTimer: number | null = null;
  private importRefreshInFlight = false;

  readonly accounts = signal<ExternalAccount[]>([]);
  readonly importRuns = signal<Record<number, AccountImportRun>>({});
  readonly lichessConnection = signal<LichessConnectionStatus | null>(null);
  readonly loading = signal(false);
  readonly loadingLichessConnection = signal(false);
  readonly saving = signal(false);
  readonly syncingAllAccounts = signal(false);
  readonly syncingAccountId = signal<number | null>(null);
  readonly backfillingAccountId = signal<number | null>(null);
  readonly importingAllHistoryAccountId = signal<number | null>(null);
  readonly controllingImportRunId = signal<number | null>(null);
  readonly settingDefaultProgressAccountId = signal<number | null>(null);
  readonly disconnectingLichess = signal(false);
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);
  readonly form = signal<AccountForm>(defaultForm());

  constructor() {
    this.destroyRef.onDestroy(() => this.stopImportPolling());
  }

  async initialize(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      await Promise.all([this.loadAccounts(false), this.loadImportRuns(false)]);
    } catch (error) {
      this.error.set(readApiError(error, 'Could not load account settings.'));
    } finally {
      this.loading.set(false);
      this.syncImportPolling();
    }
  }

  async loadAccounts(manageLoading = true): Promise<void> {
    if (manageLoading) this.loading.set(true);
    this.error.set(null);
    try {
      this.accounts.set((await firstValueFrom(this.api.getAccounts())) || []);
    } catch (error) {
      this.error.set(readApiError(error, 'Could not load accounts.'));
      throw error;
    } finally {
      if (manageLoading) this.loading.set(false);
    }
  }

  async loadImportRuns(managePolling = true): Promise<void> {
    this.importRuns.set(await this.fetchImportRuns());
    if (managePolling) this.syncImportPolling();
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
        this.api.createAccount({
          provider: form.provider,
          username,
          ...(displayName ? { displayName } : {}),
        }),
      );
      this.accounts.update((accounts) =>
        [account, ...accounts.filter((item) => item.id !== account.id)].sort(
          (left, right) =>
            providerLabel(left.provider).localeCompare(providerLabel(right.provider))
            || left.username.localeCompare(right.username),
        ),
      );
      this.notice.set(`Account ${account.username} is ready to refresh.`);
      this.resetForm();
    } catch (error) {
      this.error.set(readApiError(error, 'Could not add account.'));
    } finally {
      this.saving.set(false);
    }
  }

  async syncAccount(account: ExternalAccount): Promise<void> {
    if (this.isImportActive(account.id)) return;
    this.syncingAccountId.set(account.id);
    this.clearMessages();
    try {
      const response = await firstValueFrom(this.api.syncAccount(account.id));
      this.patchImportRun(response.importRun);
      this.notice.set(`${providerLabel(account.provider)} account ${account.username} refresh queued.`);
      this.syncImportPolling();
    } catch (error) {
      this.error.set(readApiError(error, `Could not queue ${account.username}.`));
      await this.loadImportRuns().catch(() => undefined);
    } finally {
      this.syncingAccountId.set(null);
    }
  }

  async syncActiveAccounts(): Promise<void> {
    const activeAccounts = this.accounts().filter(
      (account) => account.isActive && !this.isImportActive(account.id),
    );
    this.clearMessages();

    if (activeAccounts.length === 0) {
      this.notice.set('No active accounts are available for a new game refresh.');
      return;
    }

    this.syncingAllAccounts.set(true);
    try {
      const results = await Promise.allSettled(
        activeAccounts.map(async (account) => ({
          account,
          response: await firstValueFrom(this.api.syncAccount(account.id)),
        })),
      );
      const failures: string[] = [];
      let queued = 0;
      for (const result of results) {
        if (result.status === 'fulfilled') {
          queued += 1;
          this.patchImportRun(result.value.response.importRun);
        } else {
          failures.push(readApiError(result.reason, 'refresh could not be queued'));
        }
      }
      if (failures.length > 0) {
        this.error.set(
          `Queued ${queued} account ${queued === 1 ? 'refresh' : 'refreshes'}. Failed: ${failures.join('; ')}.`,
        );
        await this.loadImportRuns().catch(() => undefined);
      } else {
        this.notice.set(`Queued game refresh for ${queued} active ${queued === 1 ? 'account' : 'accounts'}.`);
      }
      this.syncImportPolling();
    } finally {
      this.syncingAllAccounts.set(false);
    }
  }

  async backfillAccount(account: ExternalAccount): Promise<void> {
    if (this.isImportActive(account.id)) return;
    this.backfillingAccountId.set(account.id);
    this.clearMessages();
    try {
      const response = await firstValueFrom(this.api.backfillAccount(account.id));
      this.patchImportRun(response.importRun);
      this.notice.set(`Queued three older months for ${account.username}.`);
      this.syncImportPolling();
    } catch (error) {
      this.error.set(readApiError(error, `Could not queue older history for ${account.username}.`));
      await this.loadImportRuns().catch(() => undefined);
    } finally {
      this.backfillingAccountId.set(null);
    }
  }

  async importAllHistory(account: ExternalAccount): Promise<void> {
    if (this.isImportActive(account.id)) return;
    this.importingAllHistoryAccountId.set(account.id);
    this.clearMessages();
    try {
      const response = await firstValueFrom(this.api.importAllHistory(account.id));
      this.patchImportRun(response.importRun);
      this.notice.set(`Queued all supported Lichess history for ${account.username}. This may take a while and continues in the background.`);
      this.syncImportPolling();
    } catch (error) {
      this.error.set(readApiError(error, `Could not queue all history for ${account.username}.`));
      await this.loadImportRuns().catch(() => undefined);
    } finally {
      this.importingAllHistoryAccountId.set(null);
    }
  }

  async pauseImport(run: AccountImportRun): Promise<void> {
    await this.controlImport(run, 'pause');
  }

  async resumeImport(run: AccountImportRun): Promise<void> {
    await this.controlImport(run, 'resume');
  }

  async cancelImport(run: AccountImportRun): Promise<void> {
    await this.controlImport(run, 'cancel');
  }

  async retryImport(run: AccountImportRun): Promise<void> {
    this.controllingImportRunId.set(run.id);
    this.clearMessages();
    try {
      const response = await firstValueFrom(this.api.retryImport(run.id));
      this.patchImportRun(response.importRun);
      this.notice.set('Account import retry queued.');
      this.syncImportPolling();
    } catch (error) {
      this.error.set(readApiError(error, 'Could not retry account import.'));
      await this.loadImportRuns().catch(() => undefined);
    } finally {
      this.controllingImportRunId.set(null);
    }
  }

  importRunForAccount(accountId: number): AccountImportRun | null {
    return this.importRuns()[accountId] ?? null;
  }

  isImportActive(accountId: number): boolean {
    const run = this.importRuns()[accountId];
    return Boolean(run && ACTIVE_IMPORT_STATUSES.has(run.status));
  }

  isImportControlling(runId: number): boolean {
    return this.controllingImportRunId() === runId;
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

  resetForm(): void {
    this.form.set(defaultForm());
  }

  private async controlImport(
    run: AccountImportRun,
    action: 'pause' | 'resume' | 'cancel',
  ): Promise<void> {
    this.controllingImportRunId.set(run.id);
    this.clearMessages();
    try {
      const response = action === 'pause'
        ? await firstValueFrom(this.api.pauseImport(run.id))
        : action === 'resume'
          ? await firstValueFrom(this.api.resumeImport(run.id))
          : await firstValueFrom(this.api.cancelImport(run.id));
      this.patchImportRun(response.importRun);
      this.notice.set(`Account import ${action} request accepted.`);
      this.syncImportPolling();
    } catch (error) {
      this.error.set(readApiError(error, `Could not ${action} account import.`));
      await this.loadImportRuns().catch(() => undefined);
    } finally {
      this.controllingImportRunId.set(null);
    }
  }

  private patchAccount(updated: ExternalAccount): void {
    this.accounts.update((accounts) =>
      accounts.map((account) => (account.id === updated.id ? updated : account)),
    );
  }

  private patchImportRun(run: AccountImportRun): void {
    this.importRuns.update((runs) => ({ ...runs, [run.accountId]: run }));
  }

  private async refreshImportRuns(): Promise<void> {
    if (this.importRefreshInFlight) return;
    this.importRefreshInFlight = true;
    const previous = this.importRuns();
    try {
      const next = await this.fetchImportRuns();
      this.importRuns.set(next);
      const settled = Object.values(previous).some((prior) => {
        if (!ACTIVE_IMPORT_STATUSES.has(prior.status)) return false;
        const current = next[prior.accountId];
        return current === undefined || !ACTIVE_IMPORT_STATUSES.has(current.status);
      });
      if (settled) await this.loadAccounts(false).catch(() => undefined);
    } catch (error) {
      this.error.set(readApiError(error, 'Could not refresh account import progress.'));
    } finally {
      this.importRefreshInFlight = false;
      this.syncImportPolling();
    }
  }

  private async fetchImportRuns(): Promise<Record<number, AccountImportRun>> {
    const [active, recent] = await Promise.all([
      firstValueFrom(this.api.getActiveAccountImports()),
      firstValueFrom(this.api.getAccountImports()),
    ]);
    return latestRunByAccount([...active.items, ...recent.items]);
  }

  private syncImportPolling(): void {
    const shouldPoll = Object.values(this.importRuns()).some((run) => ACTIVE_IMPORT_STATUSES.has(run.status));
    if (shouldPoll && this.importPollTimer === null) {
      this.importPollTimer = this.document.defaultView?.setInterval(
        () => void this.refreshImportRuns(),
        IMPORT_POLL_INTERVAL_MS,
      ) ?? null;
    } else if (!shouldPoll) {
      this.stopImportPolling();
    }
  }

  private stopImportPolling(): void {
    if (this.importPollTimer === null) return;
    this.document.defaultView?.clearInterval(this.importPollTimer);
    this.importPollTimer = null;
  }

  private clearMessages(): void {
    this.error.set(null);
    this.notice.set(null);
  }
}

function latestRunByAccount(runs: readonly AccountImportRun[]): Record<number, AccountImportRun> {
  const latest: Record<number, AccountImportRun> = {};
  for (const run of runs) {
    if (!latest[run.accountId]) latest[run.accountId] = run;
  }
  return latest;
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
    return structured.error
      .map((item) => (item as { message?: string })?.message || String(item))
      .join(', ');
  }
  if (typeof structured?.error === 'string') return structured.error;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
