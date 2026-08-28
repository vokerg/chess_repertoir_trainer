import { Prisma } from '@prisma/client';
import type { CreateAccountImportRunInput } from './account-import.types';
import { allowAccountImportAdmission } from './account-import-admission.guard';
import { canonicalizeAccountImportScope } from './account-import.scope';
import {
  AccountImportAccountNotFoundError,
  AccountImportActiveRunError,
  AccountImportInvalidRetryError,
} from './account-import.repository.prisma';

const NON_TERMINAL_IMPORT_STATUSES = [
  'QUEUED',
  'RUNNING',
  'PAUSE_REQUESTED',
  'PAUSED',
  'CANCEL_REQUESTED',
] as const;

interface AccountRow {
  id: number;
  provider: string;
}

interface IdRow {
  id: number;
}

interface ActiveImportRow extends IdRow {
  mode: string;
  source: string;
  scopeHash: string | null;
  requestedFrom: Date | null;
  requestedTo: Date | null;
  retryOfImportRunId: number | null;
}

interface RetryRunRow extends IdRow {
  mode: string;
  status: string;
  scopeHash: string | null;
  requestedFrom: Date | null;
  requestedTo: Date | null;
}

export interface AccountImportTransactionAdmissionOptions {
  reuseEquivalentActive?: boolean;
}

export interface AccountImportTransactionAdmissionResult {
  importRunId: number;
  created: boolean;
}

/**
 * Transaction-scoped durable import admission for cross-module coordinators.
 * Account-import owns validation, account locking, lifecycle admission, retry
 * lineage and the ImportRun insert; callers own only the surrounding workflow.
 */
export async function admitAccountImportRunInTransaction(
  transaction: Prisma.TransactionClient,
  input: CreateAccountImportRunInput,
  options: AccountImportTransactionAdmissionOptions = {},
): Promise<AccountImportTransactionAdmissionResult> {
  validateCreateInput(input);
  const canonical = canonicalizeAccountImportScope(input.scope);
  const accountRows = await transaction.$queryRaw<AccountRow[]>(Prisma.sql`
    SELECT "id", "provider"
    FROM "ExternalAccount"
    WHERE "id" = ${input.accountId}
      AND "userId" = ${input.userId}
    FOR UPDATE
  `);
  const account = accountRows[0];
  if (!account) throw new AccountImportAccountNotFoundError();

  await allowAccountImportAdmission.assertAllowed(transaction, {
    userId: input.userId,
    accountId: input.accountId,
  });

  if (input.retryOfImportRunId != null) {
    await assertValidRetry(transaction, input, canonical.scopeHash);
  }

  const activeRows = await transaction.$queryRaw<ActiveImportRow[]>(Prisma.sql`
    SELECT
      "id",
      "mode",
      "source",
      "scopeHash",
      "requestedFrom",
      "requestedTo",
      "retryOfImportRunId"
    FROM "ImportRun"
    WHERE "accountId" = ${input.accountId}
      AND "status" IN (${Prisma.join(NON_TERMINAL_IMPORT_STATUSES.map((status) => Prisma.sql`${status}`))})
    ORDER BY "createdAt" DESC, "id" DESC
    LIMIT 1
  `);
  const active = activeRows[0];
  if (active) {
    if (
      options.reuseEquivalentActive === true
      && active.mode === input.mode
      && active.source === input.source
      && active.scopeHash === canonical.scopeHash
      && sameDate(active.requestedFrom, input.requestedFrom)
      && sameDate(active.requestedTo, input.requestedTo)
      && active.retryOfImportRunId === (input.retryOfImportRunId ?? null)
    ) {
      return { importRunId: active.id, created: false };
    }
    throw new AccountImportActiveRunError(active.id);
  }

  const rows = await transaction.$queryRaw<IdRow[]>(Prisma.sql`
    INSERT INTO "ImportRun" (
      "userId",
      "accountId",
      "provider",
      "mode",
      "source",
      "status",
      "scopeVersion",
      "scopeHash",
      "scopeJson",
      "requestedFrom",
      "requestedTo",
      "retryOfImportRunId",
      "priority",
      "windowsTotal",
      "windowsCompleted",
      "gamesSeen",
      "gamesMatchedScope",
      "gamesImported",
      "gamesDuplicate",
      "gamesSkippedOutOfScope",
      "gamesFailed",
      "lastProgressAt",
      "workKey",
      "claimedAt",
      "heartbeatAt",
      "retryAt",
      "rateLimitUntil",
      "completedAt",
      "errorCode",
      "error",
      "createdAt",
      "updatedAt"
    ) VALUES (
      ${input.userId},
      ${input.accountId},
      ${account.provider},
      ${input.mode},
      ${input.source},
      'QUEUED',
      ${canonical.scopeVersion},
      ${canonical.scopeHash},
      ${JSON.stringify(canonical.scope)}::jsonb,
      ${input.requestedFrom},
      ${input.requestedTo},
      ${input.retryOfImportRunId ?? null},
      ${input.priority},
      ${input.windowsTotal ?? null},
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      NULL,
      NULL,
      NULL,
      NULL,
      NULL,
      NULL,
      NULL,
      NULL,
      NULL,
      NOW(),
      NOW()
    )
    RETURNING "id"
  `);
  const row = rows[0];
  if (!row) throw new Error('Account import transaction admission did not return a run.');
  return { importRunId: row.id, created: true };
}

async function assertValidRetry(
  transaction: Prisma.TransactionClient,
  input: CreateAccountImportRunInput,
  scopeHash: string,
): Promise<void> {
  const rows = await transaction.$queryRaw<RetryRunRow[]>(Prisma.sql`
    SELECT "id", "mode", "status", "scopeHash", "requestedFrom", "requestedTo"
    FROM "ImportRun"
    WHERE "id" = ${input.retryOfImportRunId ?? -1}
      AND "userId" = ${input.userId}
      AND "accountId" = ${input.accountId}
    FOR SHARE
  `);
  const retryOf = rows[0];
  if (!retryOf) throw new AccountImportInvalidRetryError('Retry source import run not found.');
  if (retryOf.mode === 'LEGACY_SYNC') {
    throw new AccountImportInvalidRetryError('Legacy import history cannot be retried as durable work.');
  }
  if (retryOf.status !== 'FAILED' && retryOf.status !== 'CANCELLED') {
    throw new AccountImportInvalidRetryError('Only failed or cancelled import runs can be retried.');
  }
  if (
    retryOf.mode !== input.mode
    || retryOf.scopeHash !== scopeHash
    || retryOf.requestedFrom?.getTime() !== input.requestedFrom.getTime()
    || retryOf.requestedTo?.getTime() !== input.requestedTo.getTime()
  ) {
    throw new AccountImportInvalidRetryError(
      'Retry must preserve the source import mode, immutable scope, and requested range.',
    );
  }
}

function validateCreateInput(input: CreateAccountImportRunInput): void {
  validatePositiveInteger(input.userId, 'userId');
  validatePositiveInteger(input.accountId, 'accountId');
  if (Number.isNaN(input.requestedFrom.getTime()) || Number.isNaN(input.requestedTo.getTime())) {
    throw new Error('Account import requested range must contain valid timestamps.');
  }
  if (input.requestedFrom >= input.requestedTo) {
    throw new Error('Account import requested range must be a non-empty half-open interval.');
  }
  if (!Number.isSafeInteger(input.priority) || input.priority < 0) {
    throw new Error('Account import priority must be a non-negative integer.');
  }
}

function sameDate(left: Date | null, right: Date): boolean {
  return left !== null && left.getTime() === right.getTime();
}

function validatePositiveInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`${label} must be a positive integer.`);
}