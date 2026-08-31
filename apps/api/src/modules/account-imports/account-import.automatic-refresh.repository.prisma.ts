import { Prisma, PrismaClient } from '@prisma/client';
import {
  accountImportScopeSchema,
  type AccountImportMode,
  type AccountImportSource,
  type AccountImportStatus,
} from '@chess-trainer/contracts';
import prisma from '../../prisma';
import { AccountImportAccountNotFoundError } from './account-import.repository.prisma';
import { accountImportRefreshAdmissionGuard } from './account-import.refresh-policy.repository.prisma';
import { NORMAL_ACCOUNT_REFRESH_SCOPE } from './account-import.service';
import { canonicalizeAccountImportScope } from './account-import.scope';
import { admitAccountImportRunInTransaction } from './account-import.transaction.repository.prisma';
import type { StoredAccountImportRun } from './account-import.types';

export const AUTOMATIC_ACCOUNT_REFRESH_PRIORITY = 10;

const NON_TERMINAL_IMPORT_STATUSES = [
  'QUEUED',
  'RUNNING',
  'PAUSE_REQUESTED',
  'PAUSED',
  'CANCEL_REQUESTED',
] as const;

interface AccountRow {
  id: number;
  isActive: boolean;
}

interface CoverageRow {
  coveredThrough: Date | null;
  createdAt: Date;
}

interface SnapshotRow {
  latestSuccessfulForwardAt: Date | null;
  lastAutomaticFailureRunId: number | null;
  lastAutomaticFailureAt: Date | null;
  automaticFailureCount: number;
}

interface ImportRunRow {
  id: number;
  userId: number;
  accountId: number;
  provider: string;
  mode: string;
  source: string;
  status: string;
  scopeVersion: number | null;
  scopeHash: string | null;
  scopeJson: unknown | null;
  requestedFrom: Date | null;
  requestedTo: Date | null;
  retryOfImportRunId: number | null;
  priority: number;
  windowsTotal: number | null;
  windowsCompleted: number;
  gamesSeen: number;
  gamesMatchedScope: number;
  gamesImported: number;
  gamesDuplicate: number;
  gamesSkippedOutOfScope: number;
  gamesFailed: number;
  lastProgressAt: Date | null;
  workKey: string | null;
  claimedAt: Date | null;
  heartbeatAt: Date | null;
  retryAt: Date | null;
  rateLimitUntil: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
  errorCode: string | null;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type AutomaticRefreshAdmissionDecision =
  | { kind: 'accepted'; run: StoredAccountImportRun }
  | { kind: 'alreadyActive'; run: StoredAccountImportRun }
  | {
      kind: 'fresh';
      lastSuccessfulRefreshAt: Date;
      nextEligibleAt: Date;
    }
  | { kind: 'retryThrottled'; retryAt: Date }
  | { kind: 'missingCoverage' }
  | { kind: 'inactive' };

export interface AutomaticRefreshAdmissionOptions {
  evaluatedAt: Date;
  cooldownMs: number;
  retryBaseMs: number;
  retryMaxMs: number;
}

export interface AccountImportAutomaticRefreshRepository {
  listActiveAccountIds(userId: number): Promise<number[]>;
  evaluateAndAccept(
    userId: number,
    accountId: number,
    options: AutomaticRefreshAdmissionOptions,
  ): Promise<AutomaticRefreshAdmissionDecision>;
}

export function createAccountImportAutomaticRefreshRepository(
  database: PrismaClient = prisma,
): AccountImportAutomaticRefreshRepository {
  return {
    async listActiveAccountIds(userId) {
      const accounts = await database.externalAccount.findMany({
        where: { userId, isActive: true },
        select: { id: true },
        orderBy: { id: 'asc' },
      });
      return accounts.map((account) => account.id);
    },

    async evaluateAndAccept(userId, accountId, options) {
      return database.$transaction(async (transaction) => {
        const accountRows = await transaction.$queryRaw<AccountRow[]>(Prisma.sql`
          SELECT "id", "isActive"
          FROM "ExternalAccount"
          WHERE "id" = ${accountId}
            AND "userId" = ${userId}
          FOR UPDATE
        `);
        const account = accountRows[0];
        if (!account) throw new AccountImportAccountNotFoundError();
        if (!account.isActive) return { kind: 'inactive' };

        const active = await readActiveRun(transaction, userId, accountId);
        if (active) return { kind: 'alreadyActive', run: active };

        const canonical = canonicalizeAccountImportScope(NORMAL_ACCOUNT_REFRESH_SCOPE);
        const coverageRows = await transaction.$queryRaw<CoverageRow[]>(Prisma.sql`
          SELECT "coveredThrough", "createdAt"
          FROM "AccountImportCoverage"
          WHERE "accountId" = ${accountId}
            AND "scopeHash" = ${canonical.scopeHash}
          LIMIT 1
        `);
        const coverage = coverageRows[0];
        if (!coverage?.coveredThrough) return { kind: 'missingCoverage' };

        const snapshot = await readSnapshot(
          transaction,
          userId,
          accountId,
          canonical.scopeHash,
          coverage.createdAt,
        );

        if (snapshot.latestSuccessfulForwardAt) {
          const nextEligibleAt = new Date(
            snapshot.latestSuccessfulForwardAt.getTime() + options.cooldownMs,
          );
          if (nextEligibleAt.getTime() > options.evaluatedAt.getTime()) {
            return {
              kind: 'fresh',
              lastSuccessfulRefreshAt: snapshot.latestSuccessfulForwardAt,
              nextEligibleAt,
            };
          }
        }

        if (
          snapshot.lastAutomaticFailureRunId !== null
          && snapshot.lastAutomaticFailureAt
          && snapshot.automaticFailureCount > 0
        ) {
          const retryAt = new Date(
            snapshot.lastAutomaticFailureAt.getTime()
              + retryDelayMs(
                snapshot.automaticFailureCount,
                options.retryBaseMs,
                options.retryMaxMs,
              ),
          );
          if (retryAt.getTime() > options.evaluatedAt.getTime()) {
            return { kind: 'retryThrottled', retryAt };
          }

          const failed = await readRun(
            transaction,
            userId,
            snapshot.lastAutomaticFailureRunId,
          );
          if (
            failed
            && failed.status === 'FAILED'
            && failed.mode !== 'LEGACY_SYNC'
            && failed.scope
            && failed.requestedFrom
            && failed.requestedTo
          ) {
            const admitted = await admitAccountImportRunInTransaction(transaction, {
              userId,
              accountId,
              mode: failed.mode,
              source: failed.source === 'ACCOUNT_REFRESH' ? 'ACCOUNT_REFRESH' : 'USER_ACTION',
              scope: failed.scope,
              requestedFrom: failed.requestedFrom,
              requestedTo: failed.requestedTo,
              priority: AUTOMATIC_ACCOUNT_REFRESH_PRIORITY,
              windowsTotal: null,
              retryOfImportRunId: failed.id,
            });
            return {
              kind: 'accepted',
              run: await requireRun(transaction, userId, admitted.importRunId),
            };
          }
        }

        if (coverage.coveredThrough >= options.evaluatedAt) {
          return { kind: 'missingCoverage' };
        }

        // Preserve ONB-015 refresh-specific recovery semantics before using the
        // generic transaction-owned admission helper, which still performs the
        // mandatory ONB-019 lifecycle admission and durable insert validation.
        await accountImportRefreshAdmissionGuard.assertAllowed(transaction, {
          userId,
          accountId,
        });
        const admitted = await admitAccountImportRunInTransaction(transaction, {
          userId,
          accountId,
          mode: 'INCREMENTAL_FORWARD',
          source: 'ACCOUNT_REFRESH',
          scope: NORMAL_ACCOUNT_REFRESH_SCOPE,
          requestedFrom: coverage.coveredThrough,
          requestedTo: options.evaluatedAt,
          priority: AUTOMATIC_ACCOUNT_REFRESH_PRIORITY,
          windowsTotal: null,
        });
        return {
          kind: 'accepted',
          run: await requireRun(transaction, userId, admitted.importRunId),
        };
      });
    },
  };
}

async function readActiveRun(
  transaction: Prisma.TransactionClient,
  userId: number,
  accountId: number,
): Promise<StoredAccountImportRun | null> {
  const rows = await transaction.$queryRaw<ImportRunRow[]>(Prisma.sql`
    SELECT ${runColumns('run')}
    FROM "ImportRun" AS run
    WHERE run."userId" = ${userId}
      AND run."accountId" = ${accountId}
      AND run."status" IN (${Prisma.join(
        NON_TERMINAL_IMPORT_STATUSES.map((status) => Prisma.sql`${status}`),
      )})
    ORDER BY run."createdAt" DESC, run."id" DESC
    LIMIT 1
  `);
  return rows[0] ? toStoredRun(rows[0]) : null;
}

async function readRun(
  transaction: Prisma.TransactionClient,
  userId: number,
  importRunId: number,
): Promise<StoredAccountImportRun | null> {
  const rows = await transaction.$queryRaw<ImportRunRow[]>(Prisma.sql`
    SELECT ${runColumns('run')}
    FROM "ImportRun" AS run
    WHERE run."id" = ${importRunId}
      AND run."userId" = ${userId}
    LIMIT 1
  `);
  return rows[0] ? toStoredRun(rows[0]) : null;
}

async function requireRun(
  transaction: Prisma.TransactionClient,
  userId: number,
  importRunId: number,
): Promise<StoredAccountImportRun> {
  const run = await readRun(transaction, userId, importRunId);
  if (!run) throw new Error(`Account import ${importRunId} disappeared after durable admission.`);
  return run;
}

async function readSnapshot(
  transaction: Prisma.TransactionClient,
  userId: number,
  accountId: number,
  scopeHash: string,
  coverageCreatedAt: Date,
): Promise<SnapshotRow> {
  const rows = await transaction.$queryRaw<SnapshotRow[]>(Prisma.sql`
    WITH latest_success AS (
      SELECT run."completedAt"
      FROM "ImportRun" AS run
      WHERE run."userId" = ${userId}
        AND run."accountId" = ${accountId}
        AND run."scopeHash" = ${scopeHash}
        AND run."source" = 'ACCOUNT_REFRESH'
        AND run."mode" IN ('BOUNDED_INITIAL', 'INCREMENTAL_FORWARD')
        AND run."status" = 'COMPLETED'
        AND run."completedAt" IS NOT NULL
        AND run."completedAt" >= ${coverageCreatedAt}
      ORDER BY run."completedAt" DESC, run."id" DESC
      LIMIT 1
    ),
    automatic_failures AS (
      SELECT run."id", run."completedAt"
      FROM "ImportRun" AS run
      WHERE run."userId" = ${userId}
        AND run."accountId" = ${accountId}
        AND run."scopeHash" = ${scopeHash}
        AND run."source" = 'ACCOUNT_REFRESH'
        AND run."mode" = 'INCREMENTAL_FORWARD'
        AND run."priority" = ${AUTOMATIC_ACCOUNT_REFRESH_PRIORITY}
        AND run."status" = 'FAILED'
        AND run."completedAt" IS NOT NULL
        AND run."completedAt" >= ${coverageCreatedAt}
        AND (
          NOT EXISTS (SELECT 1 FROM latest_success)
          OR run."completedAt" > (SELECT "completedAt" FROM latest_success)
        )
    ),
    latest_automatic_failure AS (
      SELECT failure."id", failure."completedAt"
      FROM automatic_failures AS failure
      WHERE NOT EXISTS (
        SELECT 1
        FROM "ImportRun" AS retry
        WHERE retry."retryOfImportRunId" = failure."id"
      )
      ORDER BY failure."completedAt" DESC, failure."id" DESC
      LIMIT 1
    )
    SELECT
      (SELECT "completedAt" FROM latest_success) AS "latestSuccessfulForwardAt",
      (SELECT "id" FROM latest_automatic_failure) AS "lastAutomaticFailureRunId",
      (SELECT "completedAt" FROM latest_automatic_failure) AS "lastAutomaticFailureAt",
      (SELECT COUNT(*)::integer FROM automatic_failures) AS "automaticFailureCount"
  `);
  return rows[0] ?? {
    latestSuccessfulForwardAt: null,
    lastAutomaticFailureRunId: null,
    lastAutomaticFailureAt: null,
    automaticFailureCount: 0,
  };
}

function retryDelayMs(failureCount: number, baseMs: number, maxMs: number): number {
  const exponent = Math.min(Math.max(failureCount - 1, 0), 20);
  return Math.min(baseMs * (2 ** exponent), maxMs);
}

function runColumns(alias?: string): Prisma.Sql {
  const prefix = alias ? Prisma.raw(`"${alias}".`) : Prisma.empty;
  return Prisma.join([
    Prisma.sql`${prefix}"id"`,
    Prisma.sql`${prefix}"userId"`,
    Prisma.sql`${prefix}"accountId"`,
    Prisma.sql`${prefix}"provider"`,
    Prisma.sql`${prefix}"mode"`,
    Prisma.sql`${prefix}"source"`,
    Prisma.sql`${prefix}"status"`,
    Prisma.sql`${prefix}"scopeVersion"`,
    Prisma.sql`${prefix}"scopeHash"`,
    Prisma.sql`${prefix}"scopeJson"`,
    Prisma.sql`${prefix}"requestedFrom"`,
    Prisma.sql`${prefix}"requestedTo"`,
    Prisma.sql`${prefix}"retryOfImportRunId"`,
    Prisma.sql`${prefix}"priority"`,
    Prisma.sql`${prefix}"windowsTotal"`,
    Prisma.sql`${prefix}"windowsCompleted"`,
    Prisma.sql`${prefix}"gamesSeen"`,
    Prisma.sql`${prefix}"gamesMatchedScope"`,
    Prisma.sql`${prefix}"gamesImported"`,
    Prisma.sql`${prefix}"gamesDuplicate"`,
    Prisma.sql`${prefix}"gamesSkippedOutOfScope"`,
    Prisma.sql`${prefix}"gamesFailed"`,
    Prisma.sql`${prefix}"lastProgressAt"`,
    Prisma.sql`${prefix}"workKey"`,
    Prisma.sql`${prefix}"claimedAt"`,
    Prisma.sql`${prefix}"heartbeatAt"`,
    Prisma.sql`${prefix}"retryAt"`,
    Prisma.sql`${prefix}"rateLimitUntil"`,
    Prisma.sql`${prefix}"startedAt"`,
    Prisma.sql`${prefix}"completedAt"`,
    Prisma.sql`${prefix}"errorCode"`,
    Prisma.sql`${prefix}"error"`,
    Prisma.sql`${prefix}"createdAt"`,
    Prisma.sql`${prefix}"updatedAt"`,
  ]);
}

function toStoredRun(row: ImportRunRow): StoredAccountImportRun {
  return {
    ...row,
    mode: row.mode as AccountImportMode,
    source: row.source as AccountImportSource,
    status: row.status as AccountImportStatus,
    scope: row.scopeJson === null ? null : accountImportScopeSchema.parse(row.scopeJson),
  };
}

export const AccountImportAutomaticRefreshRepository =
  createAccountImportAutomaticRefreshRepository();
