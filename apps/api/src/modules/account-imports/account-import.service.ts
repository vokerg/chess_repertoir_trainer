import {
  accountImportRunSchema,
  type AccountImportRun,
  type AccountImportRunListResponse,
  type AccountImportRunResponse,
  type AccountImportScope,
  type CreateAccountImportRunBody,
  type CreateAccountImportRunResponse,
} from '@chess-trainer/contracts';
import {
  AccountImportRepository,
  AccountImportInvalidRetryError,
} from './account-import.repository.prisma';
import {
  AccountImportLifecycleRepository,
  AccountImportInvalidStateError,
} from './account-import.lifecycle.repository.prisma';
import type { StoredAccountImportRun } from './account-import.types';

export const USER_ACTION_ACCOUNT_IMPORT_PRIORITY = 100;
export const NORMAL_ACCOUNT_REFRESH_SCOPE: AccountImportScope = {
  variant: 'STANDARD',
  speeds: ['BLITZ', 'RAPID'],
  rated: 'BOTH',
};
export const NORMAL_ACCOUNT_REFRESH_MONTHS = 3;

export class AccountImportNotFoundError extends Error {
  readonly code = 'ACCOUNT_IMPORT_NOT_FOUND' as const;

  constructor() {
    super('Account import run not found.');
    this.name = 'AccountImportNotFoundError';
  }
}

export class AccountImportNotControllableError extends Error {
  readonly code = 'ACCOUNT_IMPORT_INVALID_STATE' as const;

  constructor(message: string) {
    super(message);
    this.name = 'AccountImportNotControllableError';
  }
}

export class AccountImportRangeUnavailableError extends Error {
  readonly code = 'ACCOUNT_IMPORT_INVALID_RANGE' as const;

  constructor(message: string) {
    super(message);
    this.name = 'AccountImportRangeUnavailableError';
  }
}

export const AccountImportService = {
  async createUserAction(
    userId: number,
    body: CreateAccountImportRunBody,
  ): Promise<CreateAccountImportRunResponse> {
    return createRun({
      userId,
      accountId: body.accountId,
      mode: body.mode,
      scope: body.scope,
      requestedFrom: new Date(body.requestedFrom),
      requestedTo: new Date(body.requestedTo),
    });
  },

  async createNormalRefreshForUser(
    userId: number,
    accountId: number,
    requestedTo = new Date(),
  ): Promise<CreateAccountImportRunResponse> {
    const coverage = await AccountImportRepository.getCoverage(
      userId,
      accountId,
      NORMAL_ACCOUNT_REFRESH_SCOPE,
    );
    const requestedFrom = coverage?.coveredThrough
      ?? shiftUtcMonths(requestedTo, -NORMAL_ACCOUNT_REFRESH_MONTHS);

    if (requestedFrom >= requestedTo) {
      throw new AccountImportRangeUnavailableError('Account import coverage is already current.');
    }

    return createRun({
      userId,
      accountId,
      mode: coverage?.coveredThrough ? 'INCREMENTAL_FORWARD' : 'BOUNDED_INITIAL',
      scope: NORMAL_ACCOUNT_REFRESH_SCOPE,
      requestedFrom,
      requestedTo,
    });
  },

  async createHistoricalBackfillForUser(
    userId: number,
    accountId: number,
  ): Promise<CreateAccountImportRunResponse> {
    const coverage = await AccountImportRepository.getCoverage(
      userId,
      accountId,
      NORMAL_ACCOUNT_REFRESH_SCOPE,
    );
    if (!coverage?.coveredFrom) {
      throw new AccountImportRangeUnavailableError(
        'Import the recent account range before requesting older history.',
      );
    }

    const requestedTo = coverage.coveredFrom;
    const requestedFrom = shiftUtcMonths(requestedTo, -NORMAL_ACCOUNT_REFRESH_MONTHS);
    return createRun({
      userId,
      accountId,
      mode: 'HISTORICAL_BACKFILL',
      scope: NORMAL_ACCOUNT_REFRESH_SCOPE,
      requestedFrom,
      requestedTo,
    });
  },

  async listForUser(
    userId: number,
    active: boolean,
    limit: number,
  ): Promise<AccountImportRunListResponse> {
    const runs = await AccountImportLifecycleRepository.listRunsForUser(userId, limit, active);
    return { items: runs.map(toAccountImportRun) };
  },

  async getForUser(userId: number, importRunId: number): Promise<AccountImportRunResponse> {
    return { importRun: toAccountImportRun(await requireRun(userId, importRunId)) };
  },

  async pauseForUser(userId: number, importRunId: number): Promise<AccountImportRunResponse> {
    await control(async () => AccountImportLifecycleRepository.requestPause(userId, importRunId));
    return { importRun: toAccountImportRun(await requireRun(userId, importRunId)) };
  },

  async resumeForUser(userId: number, importRunId: number): Promise<AccountImportRunResponse> {
    await control(async () => AccountImportLifecycleRepository.resume(userId, importRunId));
    return { importRun: toAccountImportRun(await requireRun(userId, importRunId)) };
  },

  async cancelForUser(userId: number, importRunId: number): Promise<AccountImportRunResponse> {
    await control(async () => AccountImportLifecycleRepository.requestCancel(userId, importRunId));
    return { importRun: toAccountImportRun(await requireRun(userId, importRunId)) };
  },

  async retryForUser(userId: number, importRunId: number): Promise<CreateAccountImportRunResponse> {
    const source = await requireRun(userId, importRunId);
    if (source.status !== 'FAILED' && source.status !== 'CANCELLED') {
      throw new AccountImportNotControllableError(
        'Only failed or cancelled account imports can be retried.',
      );
    }
    if (
      source.mode === 'LEGACY_SYNC'
      || source.scope === null
      || source.requestedFrom === null
      || source.requestedTo === null
    ) {
      throw new AccountImportNotControllableError('Legacy account import history cannot be retried.');
    }

    try {
      const retry = await AccountImportRepository.createRun({
        userId,
        accountId: source.accountId,
        mode: source.mode,
        source: 'USER_ACTION',
        scope: source.scope,
        requestedFrom: source.requestedFrom,
        requestedTo: source.requestedTo,
        priority: USER_ACTION_ACCOUNT_IMPORT_PRIORITY,
        windowsTotal: null,
        retryOfImportRunId: source.id,
      });
      return { importRun: toAccountImportRun(retry) };
    } catch (error) {
      if (error instanceof AccountImportInvalidRetryError) {
        throw new AccountImportNotControllableError(error.message);
      }
      throw error;
    }
  },

  async hasActiveClaimForAccount(userId: number, accountId: number): Promise<boolean> {
    return AccountImportRepository.hasActiveClaimForAccount(userId, accountId);
  },
};

async function createRun(input: {
  userId: number;
  accountId: number;
  mode: 'BOUNDED_INITIAL' | 'INCREMENTAL_FORWARD' | 'HISTORICAL_BACKFILL';
  scope: AccountImportScope;
  requestedFrom: Date;
  requestedTo: Date;
}): Promise<CreateAccountImportRunResponse> {
  const run = await AccountImportRepository.createRun({
    ...input,
    source: 'USER_ACTION',
    priority: USER_ACTION_ACCOUNT_IMPORT_PRIORITY,
    windowsTotal: null,
  });
  return { importRun: toAccountImportRun(run) };
}

function shiftUtcMonths(value: Date, months: number): Date {
  if (Number.isNaN(value.getTime())) throw new AccountImportRangeUnavailableError('Invalid import date.');
  const result = new Date(value.getTime());
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}

async function requireRun(userId: number, importRunId: number): Promise<StoredAccountImportRun> {
  const run = await AccountImportLifecycleRepository.getRunForUser(userId, importRunId);
  if (!run) throw new AccountImportNotFoundError();
  return run;
}

async function control(action: () => Promise<boolean>): Promise<void> {
  try {
    const found = await action();
    if (!found) throw new AccountImportNotFoundError();
  } catch (error) {
    if (error instanceof AccountImportInvalidStateError) {
      throw new AccountImportNotControllableError(error.message);
    }
    throw error;
  }
}

export function toAccountImportRun(run: StoredAccountImportRun): AccountImportRun {
  const common = {
    id: run.id,
    accountId: run.accountId,
    provider: run.provider,
    status: run.status,
    priority: run.priority,
    retryOfImportRunId: run.retryOfImportRunId,
    windows: {
      total: run.windowsTotal,
      completed: run.windowsCompleted,
    },
    games: {
      seen: run.gamesSeen,
      matchedScope: run.gamesMatchedScope,
      imported: run.gamesImported,
      duplicate: run.gamesDuplicate,
      updated: run.gamesUpdated ?? 0,
      skipped: run.gamesSkipped ?? 0,
      skippedOutOfScope: run.gamesSkippedOutOfScope,
      failed: run.gamesFailed,
    },
    lastProgressAt: run.lastProgressAt?.toISOString() ?? null,
    retryAt: run.retryAt?.toISOString() ?? null,
    rateLimitUntil: run.rateLimitUntil?.toISOString() ?? null,
    createdAt: run.createdAt.toISOString(),
    updatedAt: run.updatedAt.toISOString(),
    startedAt: (run.startedAt ?? run.createdAt).toISOString(),
    completedAt: run.completedAt?.toISOString() ?? null,
    errorCode: run.errorCode,
    error: run.error,
  };

  if (run.mode === 'LEGACY_SYNC') {
    return accountImportRunSchema.parse({
      ...common,
      mode: 'LEGACY_SYNC',
      source: 'LEGACY_SYNC',
      scopeVersion: null,
      scopeHash: null,
      scope: null,
      requestedFrom: null,
      requestedTo: null,
    });
  }

  if (
    run.scopeVersion === null
    || run.scopeHash === null
    || run.scope === null
    || run.requestedFrom === null
    || run.requestedTo === null
  ) {
    throw new Error(`Durable account import ${run.id} has an invalid scope snapshot.`);
  }

  return accountImportRunSchema.parse({
    ...common,
    mode: run.mode,
    source: run.source,
    scopeVersion: run.scopeVersion,
    scopeHash: run.scopeHash,
    scope: run.scope,
    requestedFrom: run.requestedFrom.toISOString(),
    requestedTo: run.requestedTo.toISOString(),
  });
}
