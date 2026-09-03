import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import type {
  OnboardingActionCode,
  OnboardingReadinessResponse,
} from '@chess-trainer/contracts/onboarding';
import { firstValueFrom } from 'rxjs';
import { AccountsApiService } from '../../accounts/data-access/accounts-api.service';
import type { ExternalAccount } from '../../accounts/data-access/accounts.models';
import { OnboardingApiService } from '../data-access/onboarding-api.service';

const POLL_MS = 3_000;
const ACTIVE_RUN_STATUSES = new Set([
  'QUEUED',
  'RUNNING',
  'PAUSE_REQUESTED',
  'CANCEL_REQUESTED',
  'NEEDS_ATTENTION',
]);

@Injectable()
export class OnboardingStore {
  private readonly api = inject(OnboardingApiService);
  private readonly accountsApi = inject(AccountsApiService);
  private readonly destroyRef = inject(DestroyRef);
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private refreshRequestId = 0;

  readonly readiness = signal<OnboardingReadinessResponse | null>(null);
  readonly accounts = signal<ExternalAccount[]>([]);
  readonly selectedAccountId = signal<number | null>(null);
  readonly loading = signal(false);
  readonly mutating = signal(false);
  readonly error = signal<string | null>(null);
  readonly accountsError = signal<string | null>(null);
  readonly notice = signal<string | null>(null);

  readonly selectedAccount = computed(() =>
    this.accounts().find((account) => account.id === this.selectedAccountId()) ?? null,
  );

  readonly activeRunId = computed(() => this.readiness()?.preparation?.runId ?? null);
  readonly presentationState = computed(() => this.readiness()?.presentationState ?? 'NOT_STARTED');
  readonly canStart = computed(() => this.hasAction('START_ONBOARDING'));
  readonly hasConnectedAccount = computed(() => this.accounts().length > 0);

  constructor() {
    this.destroyRef.onDestroy(() => this.stopPolling());
  }

  async initialize(): Promise<void> {
    const requestId = ++this.refreshRequestId;
    this.loading.set(true);
    this.error.set(null);
    this.accountsError.set(null);

    const [readinessResult, accountsResult] = await Promise.allSettled([
      firstValueFrom(this.api.getReadiness()),
      firstValueFrom(this.accountsApi.getAccounts()),
    ]);
    if (requestId !== this.refreshRequestId) return;

    try {
      if (readinessResult.status === 'rejected') throw readinessResult.reason;
      const readiness = readinessResult.value;
      this.readiness.set(readiness);

      if (accountsResult.status === 'fulfilled') {
        this.accounts.set(accountsResult.value);
        this.selectDefaultAccount(accountsResult.value, readiness);
      } else {
        this.accounts.set([]);
        this.selectedAccountId.set(null);
        this.accountsError.set(readApiError(accountsResult.reason, 'Could not load connected accounts.'));
      }

      this.syncPolling();
    } catch (error) {
      this.error.set(readApiError(error, 'Could not load onboarding state.'));
    } finally {
      if (requestId === this.refreshRequestId) this.loading.set(false);
    }
  }

  async refresh(): Promise<void> {
    const requestId = ++this.refreshRequestId;
    try {
      const readiness = await firstValueFrom(this.api.getReadiness());
      if (requestId !== this.refreshRequestId) return;
      this.readiness.set(readiness);
      this.error.set(null);
      this.syncPolling();
    } catch (error) {
      if (requestId !== this.refreshRequestId) return;
      this.error.set(readApiError(error, 'Could not refresh onboarding progress.'));
    }
  }

  selectAccount(accountId: number): void {
    if (this.accounts().some((account) => account.id === accountId)) {
      this.selectedAccountId.set(accountId);
    }
  }

  hasAction(code: OnboardingActionCode): boolean {
    return this.readiness()?.actions.some((action) => action.code === code) ?? false;
  }

  actionDestination(code: OnboardingActionCode): string | null {
    return this.readiness()?.actions.find((action) => action.code === code)?.destination ?? null;
  }

  async start(): Promise<void> {
    const accountId = this.selectedAccountId();
    if (accountId === null) return;
    await this.runMutation(
      () => firstValueFrom(this.api.start(accountId)),
      'Preparation started. You can leave this page while work continues.',
    );
  }

  async skip(): Promise<void> {
    await this.runMutation(
      () => firstValueFrom(this.api.skip()),
      'Onboarding guidance skipped. Existing preparation continues independently.',
    );
  }

  async expandOlderHistory(): Promise<void> {
    const readiness = this.readiness();
    const runId = readiness?.preparation?.runId ?? null;
    const targetAccountId = readiness?.preparation?.targets.find((target) => target.accountId !== null)?.accountId;
    const accountId = targetAccountId ?? this.selectedAccountId();
    if (runId === null || accountId === null || accountId === undefined) return;
    await this.runMutation(
      () => firstValueFrom(this.api.expand(runId, { kind: 'OLDER_HISTORY', accountId })),
      'Older game history expansion started.',
    );
  }

  async finish(): Promise<void> {
    const runId = this.activeRunId();
    if (runId === null) return;
    await this.runMutation(() => firstValueFrom(this.api.finish(runId)), 'Onboarding completed.');
  }

  async runAction(code: OnboardingActionCode): Promise<void> {
    const runId = this.activeRunId();
    if (runId === null) return;

    switch (code) {
      case 'PAUSE_PREPARATION':
        await this.runMutation(() => firstValueFrom(this.api.pause(runId)), 'Pause requested.');
        return;
      case 'RESUME_PREPARATION':
        await this.runMutation(() => firstValueFrom(this.api.resume(runId)), 'Preparation resumed.');
        return;
      case 'CANCEL_PREPARATION':
        await this.runMutation(() => firstValueFrom(this.api.cancel(runId)), 'Cancellation requested.');
        return;
      case 'RETRY_PREPARATION':
        await this.runMutation(() => firstValueFrom(this.api.retry(runId)), 'Retry accepted.');
        return;
      case 'RESTART_PREPARATION':
        await this.runMutation(() => firstValueFrom(this.api.restart(runId)), 'Recovery preparation started.');
        return;
      case 'FINISH_ONBOARDING':
        await this.finish();
        return;
      default:
        return;
    }
  }

  private async runMutation<T>(work: () => Promise<T>, notice: string): Promise<void> {
    this.mutating.set(true);
    this.error.set(null);
    this.notice.set(null);
    try {
      await work();
      this.notice.set(notice);
      await this.refresh();
    } catch (error) {
      this.error.set(readApiError(error, 'Could not update onboarding state.'));
    } finally {
      this.mutating.set(false);
    }
  }

  private selectDefaultAccount(
    accounts: readonly ExternalAccount[],
    readiness: OnboardingReadinessResponse,
  ): void {
    const targetAccountId = readiness.preparation?.targets.find((target) => target.accountId !== null)?.accountId;
    const preferred = accounts.find((account) => account.id === targetAccountId)
      ?? accounts.find((account) => account.isDefaultProgressAccount)
      ?? accounts.find((account) => account.isActive)
      ?? accounts[0];
    this.selectedAccountId.set(preferred?.id ?? null);
  }

  private syncPolling(): void {
    const runStatus = this.readiness()?.preparation?.status ?? null;
    const shouldPoll = runStatus !== null && ACTIVE_RUN_STATUSES.has(runStatus);
    if (shouldPoll && this.pollTimer === null) {
      this.pollTimer = setInterval(() => void this.refresh(), POLL_MS);
    } else if (!shouldPoll) {
      this.stopPolling();
    }
  }

  private stopPolling(): void {
    if (this.pollTimer === null) return;
    clearInterval(this.pollTimer);
    this.pollTimer = null;
  }
}

function readApiError(error: unknown, fallback: string): string {
  const payload = (error as { error?: unknown })?.error;
  if (typeof payload === 'string') return payload;
  const structured = payload as { error?: string; message?: string } | undefined;
  return structured?.error ?? structured?.message ?? fallback;
}
