import type {
  AutomaticAccountRefreshFailureCode,
  AutomaticAccountRefreshResponse,
  AutomaticAccountRefreshResult,
} from '@chess-trainer/contracts';
import { AccountImportAdmissionBlockedError } from './account-import-admission.guard';
import {
  AccountImportAccountNotFoundError,
} from './account-import.repository.prisma';
import {
  AccountImportRefreshRetryRequiredError,
} from './account-import.refresh-policy.repository.prisma';
import { toAccountImportRun } from './account-import.service';
import {
  AccountImportAutomaticRefreshRepository,
  type AccountImportAutomaticRefreshRepository as AutomaticRefreshRepositoryBoundary,
} from './account-import.automatic-refresh.repository.prisma';

export const DEFAULT_AUTOMATIC_ACCOUNT_REFRESH_COOLDOWN_MS = 24 * 60 * 60 * 1_000;
export const DEFAULT_AUTOMATIC_ACCOUNT_REFRESH_RETRY_BASE_MS = 15 * 60 * 1_000;
export const DEFAULT_AUTOMATIC_ACCOUNT_REFRESH_RETRY_MAX_MS = 6 * 60 * 60 * 1_000;

export interface AccountImportAutomaticRefreshServiceOptions {
  cooldownMs?: number;
  retryBaseMs?: number;
  retryMaxMs?: number;
  now?: () => Date;
}

export function createAccountImportAutomaticRefreshService(
  dependencies: {
    repository?: AutomaticRefreshRepositoryBoundary;
  } = {},
  options: AccountImportAutomaticRefreshServiceOptions = {},
) {
  const repository = dependencies.repository ?? AccountImportAutomaticRefreshRepository;
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
    try {
      const decision = await repository.evaluateAndAccept(userId, accountId, {
        evaluatedAt,
        cooldownMs,
        retryBaseMs,
        retryMaxMs,
      });
      switch (decision.kind) {
        case 'accepted':
          return {
            accountId,
            status: 'accepted',
            importRun: toAccountImportRun(decision.run),
          };
        case 'alreadyActive':
          return {
            accountId,
            status: 'alreadyActive',
            importRun: toAccountImportRun(decision.run),
          };
        case 'fresh':
          return {
            accountId,
            status: 'fresh',
            lastSuccessfulRefreshAt: decision.lastSuccessfulRefreshAt.toISOString(),
            nextEligibleAt: decision.nextEligibleAt.toISOString(),
          };
        case 'retryThrottled':
          return failure(
            accountId,
            'ACCOUNT_IMPORT_RETRY_THROTTLED',
            'Automatic account refresh is temporarily throttled after a failed attempt.',
            decision.retryAt,
          );
        case 'missingCoverage':
          return failure(
            accountId,
            'ACCOUNT_IMPORT_INVALID_RANGE',
            'Automatic refresh requires existing recent account coverage.',
            null,
          );
        case 'inactive':
          return failure(
            accountId,
            'ACCOUNT_IMPORT_ADMISSION_BLOCKED',
            'Automatic account refresh is blocked for an inactive account.',
            null,
          );
      }
    } catch (error) {
      if (error instanceof AccountImportAdmissionBlockedError) {
        return failure(accountId, error.code, error.message, null);
      }
      if (error instanceof AccountImportRefreshRetryRequiredError) {
        return failure(accountId, 'ACCOUNT_IMPORT_INVALID_RANGE', error.message, null);
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
