import type {
  AutomaticAccountRefreshFailureCode,
  AutomaticAccountRefreshResponse,
  AutomaticAccountRefreshResult,
  CreateAccountImportRunResponse,
} from '@chess-trainer/contracts';
import { AccountImportAdmissionBlockedError } from './account-import-admission.guard';
import {
  AccountImportAccountNotFoundError,
  AccountImportActiveRunError,
  AccountImportRepository,
  type AccountImportRepository as AccountImportRepositoryBoundary,
} from './account-import.repository.prisma';
import {
  AUTOMATIC_ACCOUNT_REFRESH_PRIORITY,
  AccountImportRangeUnavailableError,
  AccountImportService,
  toAccountImportRun,
} from './account-import.service';
import {
  AccountImportAutomaticRefreshRepository,
  type AccountImportAutomaticRefreshRepository as AutomaticRefreshRepositoryBoundary,
} from './account-import.automatic-refresh.repository.prisma';

export const DEFAULT_AUTOMATIC_ACCOUNT_REFRESH_COOLDOWN_MS = 24 * 60 * 60 * 1_000;
export const DEFAULT_AUTOMATIC_ACCOUNT_REFRESH_RETRY_BASE_MS = 15 * 60 * 1_000;
export const DEFAULT_AUTOMATIC_ACCOUNT_REFRESH_RETRY_MAX_MS = 6 * 60 * 60 * 1_000;

interface AccountImportCommandBoundary {
  createAutomaticRefreshForUser(
    userId: number,
    accountId: number,
    requestedTo?: Date,
  ): Promise<CreateAccountImportRunResponse>;
}

export interface AccountImportAutomaticRefreshServiceOptions {
  cooldownMs?: number;
  retryBaseMs?: number;
  retryMaxMs?: number;
  now?: () => Date;
}

export function createAccountImportAutomaticRefreshService(
  dependencies: {
    repository?: AutomaticRefreshRepositoryBoundary;
    accountImports?: Pick<AccountImportRepositoryBoundary, 'getActiveRunForAccount'>;
    commands?: AccountImportCommandBoundary;
  } = {},
  options: AccountImportAutomaticRefreshServiceOptions = {},
) {
  const repository = dependencies.repository ?? AccountImportAutomaticRefreshRepository;
  const accountImports = dependencies.accountImports ?? AccountImportRepository;
  const commands = dependencies.commands ?? AccountImportService;
  const cooldownMs = resolveDuration(
    options.cooldownMs,
    'ACCOUNT_AUTOMATIC_REFRESH_COOLDOWN_MS',
    DEFAULT_AUTOMATIC_ACCOUNT_REFRESH_COOLDOWN_MS,
  );
  const retryBaseMs = resolveDuration(
    options.retryBaseMs,
    'ACCOUNT_AUTOMATIC_REFRESH_RETRY_BASE_MS',
    DEFAULT_AUTOMATIC_ACCOUNT_REFRESH_RETRY_BASE_MS,
  );
  const retryMaxMs = Math.max(
    retryBaseMs,
    resolveDuration(
      options.retryMaxMs,
      'ACCOUNT_AUTOMATIC_REFRESH_RETRY_MAX_MS',
      DEFAULT_AUTOMATIC_ACCOUNT_REFRESH_RETRY_MAX_MS,
    ),
  );
  const now = options.now ?? (() => new Date());

  return {
    async refreshForUser(userId: number): Promise<AutomaticAccountRefreshResponse> {
      const evaluatedAt = now();
      const accountIds = await repository.listActiveAccountIds(userId);
      const items: AutomaticAccountRefreshResult[] = [];
      for (const accountId of accountIds) {
        items.push(await evaluateAccount(userId, accountId, evaluatedAt));
      }
      return { items };
    },
  };

  async function evaluateAccount(
    userId: number,
    accountId: number,
    evaluatedAt: Date,
  ): Promise<AutomaticAccountRefreshResult> {
    const active = await accountImports.getActiveRunForAccount(userId, accountId);
    if (active) {
      return {
        accountId,
        status: 'alreadyActive',
        importRun: toAccountImportRun(active),
      };
    }

    const snapshot = await repository.getSnapshot(
      userId,
      accountId,
      AUTOMATIC_ACCOUNT_REFRESH_PRIORITY,
    );
    if (snapshot.latestSuccessfulForwardAt) {
      const nextEligibleAt = new Date(
        snapshot.latestSuccessfulForwardAt.getTime() + cooldownMs,
      );
      if (nextEligibleAt.getTime() > evaluatedAt.getTime()) {
        return {
          accountId,
          status: 'fresh',
          lastSuccessfulRefreshAt: snapshot.latestSuccessfulForwardAt.toISOString(),
          nextEligibleAt: nextEligibleAt.toISOString(),
        };
      }
    }

    if (snapshot.lastAutomaticFailureAt && snapshot.automaticFailureCount > 0) {
      const retryAt = new Date(
        snapshot.lastAutomaticFailureAt.getTime()
          + retryDelayMs(snapshot.automaticFailureCount, retryBaseMs, retryMaxMs),
      );
      if (retryAt.getTime() > evaluatedAt.getTime()) {
        return failure(
          accountId,
          'ACCOUNT_IMPORT_RETRY_THROTTLED',
          'Automatic account refresh is temporarily throttled after a failed attempt.',
          retryAt,
        );
      }
    }

    try {
      const response = await commands.createAutomaticRefreshForUser(
        userId,
        accountId,
        evaluatedAt,
      );
      return { accountId, status: 'accepted', importRun: response.importRun };
    } catch (error) {
      if (error instanceof AccountImportActiveRunError) {
        const concurrent = await accountImports.getActiveRunForAccount(userId, accountId);
        if (concurrent) {
          return {
            accountId,
            status: 'alreadyActive',
            importRun: toAccountImportRun(concurrent),
          };
        }
      }
      if (error instanceof AccountImportAdmissionBlockedError) {
        return failure(accountId, error.code, error.message, null);
      }
      if (error instanceof AccountImportRangeUnavailableError) {
        return failure(accountId, error.code, error.message, null);
      }
      if (error instanceof AccountImportAccountNotFoundError) {
        return failure(
          accountId,
          'ACCOUNT_IMPORT_NOT_FOUND',
          'Owned external account is no longer available.',
          null,
        );
      }
      return failure(
        accountId,
        'ACCOUNT_IMPORT_UNEXPECTED',
        'Automatic account refresh could not be evaluated.',
        null,
      );
    }
  }
}

function retryDelayMs(failureCount: number, baseMs: number, maxMs: number): number {
  const exponent = Math.min(Math.max(failureCount - 1, 0), 20);
  return Math.min(baseMs * (2 ** exponent), maxMs);
}

function failure(
  accountId: number,
  code: AutomaticAccountRefreshFailureCode,
  error: string,
  retryAt: Date | null,
): AutomaticAccountRefreshResult {
  return {
    accountId,
    status: 'failed',
    code,
    error,
    retryAt: retryAt?.toISOString() ?? null,
  };
}

function resolveDuration(
  explicit: number | undefined,
  envName: string,
  fallback: number,
): number {
  if (explicit !== undefined) return positiveInteger(explicit, fallback);
  const raw = process.env[envName];
  if (!raw) return fallback;
  return positiveInteger(Number(raw), fallback);
}

function positiveInteger(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

export const AccountImportAutomaticRefreshService =
  createAccountImportAutomaticRefreshService();