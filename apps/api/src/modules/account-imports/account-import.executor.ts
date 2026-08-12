import type { AccountImportCheckpointInput } from './account-import.lifecycle.repository.prisma';
import type { StoredAccountImportRun } from './account-import.types';

export type AccountImportExecutionResult =
  | { kind: 'COMPLETED' }
  | {
      kind: 'FAILED';
      errorCode: string;
      safeError: string;
    }
  | {
      kind: 'RETRY_AT';
      retryAt: Date;
      rateLimitUntil?: Date | null;
      errorCode?: string | null;
      safeError?: string | null;
    };

export type AccountImportExecutionStage =
  | 'DISCOVERY'
  | 'PROVIDER'
  | 'PARSE'
  | 'WRITE'
  | 'CHECKPOINT'
  | 'WINDOW';

export interface AccountImportExecutionContext {
  signal: AbortSignal;
  checkpoint(input: AccountImportCheckpointInput): Promise<void>;
  recordStageTiming(stage: AccountImportExecutionStage, durationMs: number): void;
}

export interface AccountImportExecutor {
  readonly provider: string;
  execute(
    run: StoredAccountImportRun & { workKey: string },
    context: AccountImportExecutionContext,
  ): Promise<AccountImportExecutionResult>;
}

export class AccountImportExecutorRegistry {
  private readonly executors = new Map<string, AccountImportExecutor>();

  constructor(executors: AccountImportExecutor[] = []) {
    for (const executor of executors) this.register(executor);
  }

  register(executor: AccountImportExecutor): void {
    const provider = normalizeProvider(executor.provider);
    if (this.executors.has(provider)) {
      throw new Error(`Account import executor already registered for provider ${provider}.`);
    }
    this.executors.set(provider, executor);
  }

  get(provider: string): AccountImportExecutor | undefined {
    return this.executors.get(normalizeProvider(provider));
  }

  supportedProviders(): string[] {
    return Array.from(this.executors.keys()).sort();
  }
}

export const defaultAccountImportExecutorRegistry = new AccountImportExecutorRegistry();

function normalizeProvider(provider: string): string {
  const normalized = provider.trim().toUpperCase();
  if (normalized.length === 0) throw new Error('Account import executor provider is required.');
  return normalized;
}
