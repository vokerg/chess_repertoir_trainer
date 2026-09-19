import { Injectable, inject, signal } from '@angular/core';
import type {
  AccountImportRun,
  AutomaticAccountRefreshResponse,
} from '@chess-trainer/contracts';
import { firstValueFrom } from 'rxjs';
import { AccountImportBootstrapApiService } from './account-import-bootstrap-api.service';

@Injectable({ providedIn: 'root' })
export class AccountImportSessionStore {
  private readonly api = inject(AccountImportBootstrapApiService);
  private initializationInFlight: Promise<void> | null = null;
  private initializingSessionKey: string | null = null;
  private initializedSessionKey: string | null = null;
  private storeGeneration = 0;

  private readonly runsState = signal<Record<number, AccountImportRun>>({});
  private readonly responseState = signal<AutomaticAccountRefreshResponse | null>(null);
  private readonly errorState = signal<string | null>(null);

  readonly runs = this.runsState.asReadonly();
  readonly response = this.responseState.asReadonly();
  readonly error = this.errorState.asReadonly();

  async initialize(userId: number, authSessionGeneration: number): Promise<void> {
    const sessionKey = `${userId}:${authSessionGeneration}`;
    if (this.initializedSessionKey === sessionKey) return;

    if (this.initializedSessionKey !== null && this.initializedSessionKey !== sessionKey) {
      this.reset();
    }

    if (this.initializationInFlight) {
      if (this.initializingSessionKey === sessionKey) return this.initializationInFlight;
      this.reset();
    }

    const generation = this.storeGeneration;
    const task = this.performInitialization(sessionKey, generation);
    this.initializationInFlight = task;
    this.initializingSessionKey = sessionKey;
    try {
      await task;
    } finally {
      if (this.initializationInFlight === task) {
        this.initializationInFlight = null;
        this.initializingSessionKey = null;
      }
      if (this.isCurrent(sessionKey, generation)) this.initializedSessionKey = sessionKey;
    }
  }

  reset(): void {
    this.storeGeneration += 1;
    this.initializationInFlight = null;
    this.initializingSessionKey = null;
    this.initializedSessionKey = null;
    this.runsState.set({});
    this.responseState.set(null);
    this.errorState.set(null);
  }

  private async performInitialization(sessionKey: string, generation: number): Promise<void> {
    this.errorState.set(null);
    try {
      const response = await firstValueFrom(this.api.refreshStaleAccounts());
      if (!this.isCurrent(sessionKey, generation)) return;

      this.responseState.set(response);
      const runs: Record<number, AccountImportRun> = {};
      for (const item of response.items) {
        if (item.status === 'accepted' || item.status === 'alreadyActive') {
          runs[item.accountId] = item.importRun;
        }
      }
      this.runsState.set(runs);
    } catch (error) {
      if (this.isCurrent(sessionKey, generation)) {
        this.errorState.set(readError(error));
      }
    }
  }

  private isCurrent(sessionKey: string, generation: number): boolean {
    return generation === this.storeGeneration
      && (this.initializedSessionKey === null || this.initializedSessionKey === sessionKey);
  }
}

function readError(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return 'Automatic account refresh could not be evaluated.';
}
