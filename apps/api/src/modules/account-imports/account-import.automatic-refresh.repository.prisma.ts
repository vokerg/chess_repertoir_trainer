import { Prisma, PrismaClient } from '@prisma/client';
import prisma from '../../prisma';
import {
  AccountImportAccountNotFoundError,
  createAccountImportRepository,
} from './account-import.repository.prisma';
import {
  accountImportRefreshAdmissionGuard,
} from './account-import.refresh-policy.repository.prisma';
import {
  AUTOMATIC_ACCOUNT_REFRESH_PRIORITY,
  NORMAL_ACCOUNT_REFRESH_SCOPE,
} from './account-import.service';
import { canonicalizeAccountImportScope } from './account-import.scope';
import type { StoredAccountImportRun } from './account-import.types';

interface AccountRow {
  id: number;
  isActive: boolean;
}

interface SnapshotRow {
  latestSuccessfulForwardAt: Date | null;
  lastAutomaticFailureRunId: number | null;
  lastAutomaticFailureAt: Date | null;
  automaticFailureCount: number;
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

        const repository = createAccountImportRepository(
          transactionBoundClient(transaction),
          accountImportRefreshAdmissionGuard,
        );

        const active = await repository.getActiveRunForAccount(userId, accountId);
        if (active) return { kind: 'alreadyActive', run: active };

        const coverage = await repository.getCoverage(
          userId,
          accountId,
          NORMAL_ACCOUNT_REFRESH_SCOPE,
        );
        if (!coverage?.coveredThrough) return { kind: 'missingCoverage' };

        const canonical = canonicalizeAccountImportScope(NORMAL_ACCOUNT_REFRESH_SCOPE);
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

          const failed = await repository.getRun(
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
            const retry = await repository.createRun({
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
            return { kind: 'accepted', run: retry };
          }
        }

        if (coverage.coveredThrough >= options.evaluatedAt) {
          return { kind: 'missingCoverage' };
        }

        const run = await repository.createRun({
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
        return { kind: 'accepted', run };
      });
    },
  };
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
      SELECT "id", "completedAt"
      FROM automatic_failures
      ORDER BY "completedAt" DESC, "id" DESC
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

function transactionBoundClient(transaction: Prisma.TransactionClient): PrismaClient {
  return {
    $transaction: async <T>(callback: (tx: Prisma.TransactionClient) => Promise<T>) => callback(transaction),
    $queryRaw: transaction.$queryRaw.bind(transaction),
    $executeRaw: transaction.$executeRaw.bind(transaction),
  } as unknown as PrismaClient;
}

export const AccountImportAutomaticRefreshRepository =
  createAccountImportAutomaticRefreshRepository();
