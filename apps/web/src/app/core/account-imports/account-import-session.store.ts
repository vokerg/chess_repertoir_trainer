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
  private initializedUserId: number | null = null;
  private sessionGeneration = 0;

  private readonly runsState = signal<Record<number, AccountImportRun>>({});
  private readonly responseState = signal<AutomaticAccountRefreshResponse | null>(null);
  private readonly errorState = signal<string | null>(null);

  readonly runs = this.runsState.asReadonly();
  readonly response = this.responseState.asReadonly();
  readonly error = this.errorState.asReadonly();

  async initialize(userId: number): Promise<void> {
    if (this.initializedUserId === userId) return;
    if (this.initializationInFlight) return this.initializationInFlight;

    if (this.initializedUserId !== null && this.initializedUserId !== userId) {
      this.reset();
    }

    const generation = this.sessionGeneration;
    const task = this.performInitialization(userId, generation);
    this.initializationInFlight = task;
    try {
      await task;
    } finally {
      if (this.initializationInFlight === task) this.initializationInFlight = null;
      if (this.isCurrent(userId, generation)) this.initializedUserId = userId;
    }
  }

  reset(): void {
    this.sessionGeneration += 1;
    this.initializationInFlight = null;
    this.initializedUserId = null;
    this.runsState.set({});
    this.responseState.set(null);
    this.errorState.set(null);
  }

  private async performInitialization(userId: number, generation: number): Promise<void> {
    this.errorState.set(null);
    try {
      const response = await firstValueFrom(this.api.refreshStaleAccounts());
      if (!this.isCurrent(userId, generation)) return;

      this.responseState.set(response);
      const runs: Record<number, AccountImportRun> = {};
      for (const item of response.items) {
        if (item.status === 'accepted' || item.status === 'alreadyActive') {
          runs[item.accountId] = item.importRun;
        }
      }
      this.runsState.set(runs);
    } catch (error) {
      if (this.isCurrent(userId, generation)) {
        this.errorState.set(readError(error));
      }
    }
  }

  private isCurrent(userId: number, generation: number): boolean {
    return generation === this.sessionGeneration
      && (this.initializedUserId === null || this.initializedUserId === userId);
  }
}

function readError(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return 'Automatic account refresh could not be evaluated.';
}