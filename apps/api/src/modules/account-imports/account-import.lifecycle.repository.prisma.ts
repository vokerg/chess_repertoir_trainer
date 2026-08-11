import { randomUUID } from 'node:crypto';
import { Prisma, PrismaClient } from '@prisma/client';
import {
  accountImportScopeSchema,
  type AccountImportMode,
  type AccountImportSource,
  type AccountImportStatus,
} from '@chess-trainer/contracts';
import prisma from '../../prisma';
import {
  allowAccountImportAdmission,
  type AccountImportAdmissionGuard,
} from './account-import-admission.guard';
import type { StoredAccountImportRun } from './account-import.types';

const ACCOUNT_IMPORT_CLAIM_LOCK_KEY = 17_000_312;
const ACTIVE_STATUSES = [
  'QUEUED',
  'RUNNING',
  'PAUSE_REQUESTED',
  'PAUSED',
  'CANCEL_REQUESTED',
] as const;

interface ImportRunLifecycleRow {
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
  gamesUpdated: number;
  gamesSkipped: number;
  gamesSkippedOutOfScope: number;
  gamesFailed: number;
  lastProgressAt: Date | null;
  workKey: string | null;
  claimedAt: Date | null;
  heartbeatAt: Date | null;
  pauseRequestedAt: Date | null;
  cancelRequestedAt: Date | null;
  retryAt: Date | null;
  rateLimitUntil: Date | null;
  startedAt: Date;
  completedAt: Date | null;
  errorCode: string | null;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface IdRow {
  id: number;
}

interface QueueStatsRow {
  queuedCount: number;
  oldestQueuedAt: Date | null;
}

interface StatusRow {
  status: string;
}

interface CoverageBoundsRow {
  id: number;
  coveredFrom: Date | null;
  coveredThrough: Date | null;
}

export interface AccountImportCheckpointInput {
  checkpoint?: unknown;
  windowsCompleted?: number;
  gamesSeenDelta?: number;
  gamesSkippedDelta?: number;
  gamesSkippedOutOfScopeDelta?: number;
  gamesFailedDelta?: number;
}

export interface AccountImportQueueStats {
  queuedCount: number;
  oldestQueuedAt: Date | null;
}

export class AccountImportInvalidStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AccountImportInvalidStateError';
  }
}

export class AccountImportIncompleteCoverageError extends Error {
  constructor() {
    super('Account import cannot complete before its immutable requested range is proved covered.');
    this.name = 'AccountImportIncompleteCoverageError';
  }
}

export interface AccountImportLifecycleRepository {
  listRunsForUser(
    userId: number,
    limit: number,
    activeOnly?: boolean,
  ): Promise<StoredAccountImportRun[]>;
  getRunForUser(userId: number, importRunId: number): Promise<StoredAccountImportRun | null>;
  requestPause(userId: number, importRunId: number): Promise<boolean>;
  resume(userId: number, importRunId: number): Promise<boolean>;
  requestCancel(userId: number, importRunId: number): Promise<boolean>;
  claimNextRun(supportedProviders: string[]): Promise<(StoredAccountImportRun & { workKey: string }) | null>;
  heartbeatRun(importRunId: number, workKey: string): Promise<AccountImportStatus | null>;
  checkpointRun(
    importRunId: number,
    workKey: string,
    input: AccountImportCheckpointInput,
  ): Promise<boolean>;
  completeRun(importRunId: number, workKey: string): Promise<boolean>;
  failRun(importRunId: number, workKey: string, errorCode: string, error: string): Promise<boolean>;
  deferRun(input: {
    importRunId: number;
    workKey: string;
    retryAt: Date;
    rateLimitUntil?: Date | null;
    errorCode?: string | null;
    error?: string | null;
  }): Promise<boolean>;
  acknowledgeRequestedControl(importRunId: number, workKey: string): Promise<AccountImportStatus | null>;
  releaseRun(importRunId: number, workKey: string): Promise<boolean>;
  recoverStaleClaims(staleBefore: Date): Promise<number>;
  getQueueStats(): Promise<AccountImportQueueStats>;
}

export function createAccountImportLifecycleRepository(
  database: PrismaClient = prisma,
  admissionGuard: AccountImportAdmissionGuard = allowAccountImportAdmission,
): AccountImportLifecycleRepository {
  return {
    async listRunsForUser(userId, limit, activeOnly = false) {
      const boundedLimit = validateLimit(limit);
      const activeFilter = activeOnly
        ? Prisma.sql`AND run."status" IN (${activeStatusSql()})`
        : Prisma.empty;
      const rows = await database.$queryRaw<ImportRunLifecycleRow[]>(Prisma.sql`
        SELECT ${lifecycleColumns('run')}
        FROM "ImportRun" AS run
        WHERE run."userId" = ${userId}
          AND run."mode" <> 'LEGACY_SYNC'
          ${activeFilter}
        ORDER BY run."createdAt" DESC, run."id" DESC
        LIMIT ${boundedLimit}
      `);
      return rows.map(toStoredRun);
    },

    async getRunForUser(userId, importRunId) {
      const rows = await database.$queryRaw<ImportRunLifecycleRow[]>(Prisma.sql`
        SELECT ${lifecycleColumns('run')}
        FROM "ImportRun" AS run
        WHERE run."id" = ${importRunId}
          AND run."userId" = ${userId}
          AND run."mode" <> 'LEGACY_SYNC'
        LIMIT 1
      `);
      return rows[0] ? toStoredRun(rows[0]) : null;
    },

    async requestPause(userId, importRunId) {
      return database.$transaction(async (transaction) => {
        const row = await lockOwnedRun(transaction, userId, importRunId);
        if (!row) return false;

        if (row.status === 'PAUSED' || row.status === 'PAUSE_REQUESTED') return true;
        if (row.status === 'QUEUED') {
          await transaction.$executeRaw(Prisma.sql`
            UPDATE "ImportRun"
            SET "status" = 'PAUSED',
                "pauseRequestedAt" = COALESCE("pauseRequestedAt", NOW()),
                "updatedAt" = NOW()
            WHERE "id" = ${importRunId}
          `);
          return true;
        }
        if (row.status === 'RUNNING') {
          await transaction.$executeRaw(Prisma.sql`
            UPDATE "ImportRun"
            SET "status" = 'PAUSE_REQUESTED',
                "pauseRequestedAt" = COALESCE("pauseRequestedAt", NOW()),
                "updatedAt" = NOW()
            WHERE "id" = ${importRunId}
          `);
          return true;
        }

        throw new AccountImportInvalidStateError(
          `Account import cannot be paused from status ${row.status}.`,
        );
      });
    },

    async resume(userId, importRunId) {
      return database.$transaction(async (transaction) => {
        const row = await lockOwnedRun(transaction, userId, importRunId);
        if (!row) return false;
        if (row.status === 'QUEUED') return true;
        if (row.status !== 'PAUSED') {
          throw new AccountImportInvalidStateError(
            `Account import cannot be resumed from status ${row.status}.`,
          );
        }

        await admissionGuard.assertAllowed(transaction, {
          userId: row.userId,
          accountId: row.accountId,
        });
        await transaction.$executeRaw(Prisma.sql`
          UPDATE "ImportRun"
          SET "status" = 'QUEUED',
              "pauseRequestedAt" = NULL,
              "updatedAt" = NOW()
          WHERE "id" = ${importRunId}
        `);
        return true;
      });
    },

    async requestCancel(userId, importRunId) {
      return database.$transaction(async (transaction) => {
        const row = await lockOwnedRun(transaction, userId, importRunId);
        if (!row) return false;

        if (row.status === 'CANCEL_REQUESTED' || row.status === 'CANCELLED') return true;
        if (row.status === 'QUEUED' || row.status === 'PAUSED') {
          await transaction.$executeRaw(Prisma.sql`
            UPDATE "ImportRun"
            SET "status" = 'CANCELLED',
                "cancelRequestedAt" = COALESCE("cancelRequestedAt", NOW()),
                "workKey" = NULL,
                "claimedAt" = NULL,
                "heartbeatAt" = NULL,
                "completedAt" = NOW(),
                "updatedAt" = NOW()
            WHERE "id" = ${importRunId}
          `);
          return true;
        }
        if (row.status === 'RUNNING' || row.status === 'PAUSE_REQUESTED') {
          await transaction.$executeRaw(Prisma.sql`
            UPDATE "ImportRun"
            SET "status" = 'CANCEL_REQUESTED',
                "cancelRequestedAt" = COALESCE("cancelRequestedAt", NOW()),
                "updatedAt" = NOW()
            WHERE "id" = ${importRunId}
          `);
          return true;
        }

        throw new AccountImportInvalidStateError(
          `Account import cannot be cancelled from status ${row.status}.`,
        );
      });
    },

    async claimNextRun(supportedProviders) {
      if (supportedProviders.length === 0) return null;
      const providers = Prisma.join(supportedProviders.map((provider) => Prisma.sql`${normalizeProvider(provider)}`));
      const candidateAdmissionPredicate = admissionGuard.claimCandidatePredicate({
        userId: Prisma.sql`run."userId"`,
        accountId: Prisma.sql`run."accountId"`,
      });

      return database.$transaction(async (transaction) => {
        await transaction.$executeRaw(Prisma.sql`
          SELECT pg_advisory_xact_lock(${ACCOUNT_IMPORT_CLAIM_LOCK_KEY})
        `);

        const active = await transaction.$queryRaw<IdRow[]>(Prisma.sql`
          SELECT "id"
          FROM "ImportRun"
          WHERE "workKey" IS NOT NULL
            AND "status" IN ('RUNNING', 'PAUSE_REQUESTED', 'CANCEL_REQUESTED')
          LIMIT 1
        `);
        if (active.length > 0) return null;

        const candidateRows = await transaction.$queryRaw<ImportRunLifecycleRow[]>(Prisma.sql`
          SELECT ${lifecycleColumns('run')}
          FROM "ImportRun" AS run
          WHERE run."status" = 'QUEUED'
            AND run."mode" <> 'LEGACY_SYNC'
            AND run."provider" IN (${providers})
            AND (${candidateAdmissionPredicate})
            AND (run."retryAt" IS NULL OR run."retryAt" <= NOW())
            AND (run."rateLimitUntil" IS NULL OR run."rateLimitUntil" <= NOW())
          ORDER BY run."priority" DESC, run."createdAt" ASC, run."id" ASC
          FOR UPDATE SKIP LOCKED
          LIMIT 1
        `);
        const candidate = candidateRows[0];
        if (!candidate) return null;

        await admissionGuard.assertAllowed(transaction, {
          userId: candidate.userId,
          accountId: candidate.accountId,
        });

        const workKey = `ACCOUNT_IMPORT:${randomUUID()}`;
        const claimedRows = await transaction.$queryRaw<ImportRunLifecycleRow[]>(Prisma.sql`
          UPDATE "ImportRun" AS run
          SET "status" = 'RUNNING',
              "workKey" = ${workKey},
              "claimedAt" = NOW(),
              "heartbeatAt" = NOW(),
              "retryAt" = NULL,
              "rateLimitUntil" = NULL,
              "errorCode" = NULL,
              "error" = NULL,
              "completedAt" = NULL,
              "updatedAt" = NOW()
          WHERE run."id" = ${candidate.id}
            AND run."status" = 'QUEUED'
            AND run."workKey" IS NULL
          RETURNING ${lifecycleColumns()}
        `);
        const claimed = claimedRows[0];
        if (!claimed || claimed.workKey === null) return null;
        return { ...toStoredRun(claimed), workKey: claimed.workKey };
      });
    },

    async heartbeatRun(importRunId, workKey) {
      const rows = await database.$queryRaw<StatusRow[]>(Prisma.sql`
        UPDATE "ImportRun"
        SET "heartbeatAt" = NOW(),
            "updatedAt" = NOW()
        WHERE "id" = ${importRunId}
          AND "workKey" = ${workKey}
          AND "status" IN ('RUNNING', 'PAUSE_REQUESTED', 'CANCEL_REQUESTED')
        RETURNING "status"
      `);
      return rows[0] ? rows[0].status as AccountImportStatus : null;
    },

    async checkpointRun(importRunId, workKey, input) {
      validateCheckpoint(input);
      const checkpointJson = input.checkpoint === undefined
        ? Prisma.sql`"checkpointJson"`
        : input.checkpoint === null
          ? Prisma.sql`NULL`
          : Prisma.sql`${JSON.stringify(input.checkpoint)}::jsonb`;
      const windowsCompleted = input.windowsCompleted === undefined
        ? Prisma.sql`"windowsCompleted"`
        : Prisma.sql`${input.windowsCompleted}`;

      const updated = await database.$executeRaw(Prisma.sql`
        UPDATE "ImportRun"
        SET "checkpointJson" = ${checkpointJson},
            "windowsCompleted" = ${windowsCompleted},
            "gamesSeen" = "gamesSeen" + ${input.gamesSeenDelta ?? 0},
            "gamesSkipped" = "gamesSkipped" + ${input.gamesSkippedDelta ?? 0},
            "gamesSkippedOutOfScope" = "gamesSkippedOutOfScope" + ${input.gamesSkippedOutOfScopeDelta ?? 0},
            "gamesFailed" = "gamesFailed" + ${input.gamesFailedDelta ?? 0},
            "lastProgressAt" = NOW(),
            "updatedAt" = NOW()
        WHERE "id" = ${importRunId}
          AND "workKey" = ${workKey}
          AND "status" = 'RUNNING'
          AND (${input.windowsCompleted ?? null}::int IS NULL OR "windowsTotal" IS NULL OR ${input.windowsCompleted ?? null} <= "windowsTotal")
      `);
      return updated === 1;
    },

    async completeRun(importRunId, workKey) {
      return database.$transaction(async (transaction) => {
        const rows = await transaction.$queryRaw<ImportRunLifecycleRow[]>(Prisma.sql`
          SELECT ${lifecycleColumns('run')}
          FROM "ImportRun" AS run
          WHERE run."id" = ${importRunId}
            AND run."workKey" = ${workKey}
            AND run."status" = 'RUNNING'
          FOR UPDATE
        `);
        const run = rows[0];
        if (!run) return false;
        if (run.scopeHash === null || run.requestedFrom === null || run.requestedTo === null) {
          throw new AccountImportIncompleteCoverageError();
        }

        const coverageRows = await transaction.$queryRaw<CoverageBoundsRow[]>(Prisma.sql`
          SELECT "id", "coveredFrom", "coveredThrough"
          FROM "AccountImportCoverage"
          WHERE "accountId" = ${run.accountId}
            AND "scopeHash" = ${run.scopeHash}
          FOR UPDATE
        `);
        const coverage = coverageRows[0];
        if (
          !coverage
          || coverage.coveredFrom === null
          || coverage.coveredThrough === null
          || coverage.coveredFrom > run.requestedFrom
          || coverage.coveredThrough < run.requestedTo
        ) {
          throw new AccountImportIncompleteCoverageError();
        }

        const settled = await transaction.$executeRaw(Prisma.sql`
          UPDATE "ImportRun"
          SET "status" = 'COMPLETED',
              "workKey" = NULL,
              "claimedAt" = NULL,
              "heartbeatAt" = NULL,
              "completedAt" = NOW(),
              "lastProgressAt" = COALESCE("lastProgressAt", NOW()),
              "updatedAt" = NOW()
          WHERE "id" = ${importRunId}
            AND "workKey" = ${workKey}
            AND "status" = 'RUNNING'
        `);
        if (settled !== 1) return false;

        await transaction.$executeRaw(Prisma.sql`
          UPDATE "AccountImportCoverage"
          SET "lastCompletedImportRunId" = ${importRunId},
              "updatedAt" = NOW()
          WHERE "id" = ${coverage.id}
        `);
        return true;
      });
    },

    async failRun(importRunId, workKey, errorCode, error) {
      const updated = await database.$executeRaw(Prisma.sql`
        UPDATE "ImportRun"
        SET "status" = 'FAILED',
            "workKey" = NULL,
            "claimedAt" = NULL,
            "heartbeatAt" = NULL,
            "completedAt" = NOW(),
            "errorCode" = ${truncate(errorCode, 120)},
            "error" = ${truncate(error, 2_000)},
            "updatedAt" = NOW()
        WHERE "id" = ${importRunId}
          AND "workKey" = ${workKey}
          AND "status" = 'RUNNING'
      `);
      return updated === 1;
    },

    async deferRun(input) {
      validateDate(input.retryAt, 'retryAt');
      if (input.rateLimitUntil !== undefined && input.rateLimitUntil !== null) {
        validateDate(input.rateLimitUntil, 'rateLimitUntil');
      }
      const updated = await database.$executeRaw(Prisma.sql`
        UPDATE "ImportRun"
        SET "status" = 'QUEUED',
            "workKey" = NULL,
            "claimedAt" = NULL,
            "heartbeatAt" = NULL,
            "retryAt" = ${input.retryAt},
            "rateLimitUntil" = ${input.rateLimitUntil ?? null},
            "errorCode" = ${input.errorCode ? truncate(input.errorCode, 120) : null},
            "error" = ${input.error ? truncate(input.error, 2_000) : null},
            "updatedAt" = NOW()
        WHERE "id" = ${input.importRunId}
          AND "workKey" = ${input.workKey}
          AND "status" = 'RUNNING'
      `);
      return updated === 1;
    },

    async acknowledgeRequestedControl(importRunId, workKey) {
      const rows = await database.$queryRaw<StatusRow[]>(Prisma.sql`
        UPDATE "ImportRun"
        SET "status" = CASE
              WHEN "status" = 'PAUSE_REQUESTED' THEN 'PAUSED'
              WHEN "status" = 'CANCEL_REQUESTED' THEN 'CANCELLED'
              ELSE "status"
            END,
            "workKey" = NULL,
            "claimedAt" = NULL,
            "heartbeatAt" = NULL,
            "completedAt" = CASE
              WHEN "status" = 'CANCEL_REQUESTED' THEN NOW()
              ELSE "completedAt"
            END,
            "updatedAt" = NOW()
        WHERE "id" = ${importRunId}
          AND "workKey" = ${workKey}
          AND "status" IN ('PAUSE_REQUESTED', 'CANCEL_REQUESTED')
        RETURNING "status"
      `);
      return rows[0] ? rows[0].status as AccountImportStatus : null;
    },

    async releaseRun(importRunId, workKey) {
      const updated = await database.$executeRaw(Prisma.sql`
        UPDATE "ImportRun"
        SET "status" = CASE
              WHEN "status" = 'PAUSE_REQUESTED' THEN 'PAUSED'
              WHEN "status" = 'CANCEL_REQUESTED' THEN 'CANCELLED'
              ELSE 'QUEUED'
            END,
            "workKey" = NULL,
            "claimedAt" = NULL,
            "heartbeatAt" = NULL,
            "completedAt" = CASE
              WHEN "status" = 'CANCEL_REQUESTED' THEN NOW()
              ELSE "completedAt"
            END,
            "updatedAt" = NOW()
        WHERE "id" = ${importRunId}
          AND "workKey" = ${workKey}
          AND "status" IN ('RUNNING', 'PAUSE_REQUESTED', 'CANCEL_REQUESTED')
      `);
      return updated === 1;
    },

    async recoverStaleClaims(staleBefore) {
      validateDate(staleBefore, 'staleBefore');
      return database.$transaction(async (transaction) => {
        const rows = await transaction.$queryRaw<IdRow[]>(Prisma.sql`
          UPDATE "ImportRun"
          SET "status" = CASE
                WHEN "status" = 'PAUSE_REQUESTED' THEN 'PAUSED'
                WHEN "status" = 'CANCEL_REQUESTED' THEN 'CANCELLED'
                ELSE 'QUEUED'
              END,
              "workKey" = NULL,
              "claimedAt" = NULL,
              "heartbeatAt" = NULL,
              "completedAt" = CASE
                WHEN "status" = 'CANCEL_REQUESTED' THEN NOW()
                ELSE "completedAt"
              END,
              "updatedAt" = NOW()
          WHERE "workKey" IS NOT NULL
            AND "status" IN ('RUNNING', 'PAUSE_REQUESTED', 'CANCEL_REQUESTED')
            AND COALESCE("heartbeatAt", "claimedAt", "updatedAt") < ${staleBefore}
          RETURNING "id"
        `);
        return rows.length;
      });
    },

    async getQueueStats() {
      const rows = await database.$queryRaw<QueueStatsRow[]>(Prisma.sql`
        SELECT
          COUNT(*)::int AS "queuedCount",
          MIN("createdAt") AS "oldestQueuedAt"
        FROM "ImportRun"
        WHERE "status" = 'QUEUED'
          AND "mode" <> 'LEGACY_SYNC'
      `);
      return rows[0] ?? { queuedCount: 0, oldestQueuedAt: null };
    },
  };
}

export const AccountImportLifecycleRepository = createAccountImportLifecycleRepository();

async function lockOwnedRun(
  transaction: Prisma.TransactionClient,
  userId: number,
  importRunId: number,
): Promise<ImportRunLifecycleRow | null> {
  const rows = await transaction.$queryRaw<ImportRunLifecycleRow[]>(Prisma.sql`
    SELECT ${lifecycleColumns('run')}
    FROM "ImportRun" AS run
    WHERE run."id" = ${importRunId}
      AND run."userId" = ${userId}
      AND run."mode" <> 'LEGACY_SYNC'
    FOR UPDATE
  `);
  return rows[0] ?? null;
}

function activeStatusSql(): Prisma.Sql {
  return Prisma.join(ACTIVE_STATUSES.map((status) => Prisma.sql`${status}`));
}

function lifecycleColumns(alias?: string): Prisma.Sql {
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
    Prisma.sql`${prefix}"gamesUpdated"`,
    Prisma.sql`${prefix}"gamesSkipped"`,
    Prisma.sql`${prefix}"gamesSkippedOutOfScope"`,
    Prisma.sql`${prefix}"gamesFailed"`,
    Prisma.sql`${prefix}"lastProgressAt"`,
    Prisma.sql`${prefix}"workKey"`,
    Prisma.sql`${prefix}"claimedAt"`,
    Prisma.sql`${prefix}"heartbeatAt"`,
    Prisma.sql`${prefix}"pauseRequestedAt"`,
    Prisma.sql`${prefix}"cancelRequestedAt"`,
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

function toStoredRun(row: ImportRunLifecycleRow): StoredAccountImportRun {
  return {
    id: row.id,
    userId: row.userId,
    accountId: row.accountId,
    provider: row.provider,
    mode: row.mode as AccountImportMode,
    source: row.source as AccountImportSource,
    status: row.status as AccountImportStatus,
    scopeVersion: row.scopeVersion,
    scopeHash: row.scopeHash,
    scope: row.scopeJson === null ? null : accountImportScopeSchema.parse(row.scopeJson),
    requestedFrom: row.requestedFrom,
    requestedTo: row.requestedTo,
    retryOfImportRunId: row.retryOfImportRunId,
    priority: row.priority,
    windowsTotal: row.windowsTotal,
    windowsCompleted: row.windowsCompleted,
    gamesSeen: row.gamesSeen,
    gamesMatchedScope: row.gamesMatchedScope,
    gamesImported: row.gamesImported,
    gamesDuplicate: row.gamesDuplicate,
    gamesSkippedOutOfScope: row.gamesSkippedOutOfScope,
    gamesFailed: row.gamesFailed,
    lastProgressAt: row.lastProgressAt,
    workKey: row.workKey,
    claimedAt: row.claimedAt,
    heartbeatAt: row.heartbeatAt,
    retryAt: row.retryAt,
    rateLimitUntil: row.rateLimitUntil,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
    errorCode: row.errorCode,
    error: row.error,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    gamesUpdated: row.gamesUpdated,
    gamesSkipped: row.gamesSkipped,
    pauseRequestedAt: row.pauseRequestedAt,
    cancelRequestedAt: row.cancelRequestedAt,
  };
}

function validateLimit(limit: number): number {
  if (!Number.isSafeInteger(limit) || limit <= 0 || limit > 100) {
    throw new Error('Account import list limit must be an integer from 1 through 100.');
  }
  return limit;
}

function validateCheckpoint(input: AccountImportCheckpointInput): void {
  for (const [name, value] of Object.entries({
    windowsCompleted: input.windowsCompleted,
    gamesSeenDelta: input.gamesSeenDelta,
    gamesSkippedDelta: input.gamesSkippedDelta,
    gamesSkippedOutOfScopeDelta: input.gamesSkippedOutOfScopeDelta,
    gamesFailedDelta: input.gamesFailedDelta,
  })) {
    if (value !== undefined && (!Number.isSafeInteger(value) || value < 0)) {
      throw new Error(`Account import ${name} must be a non-negative integer.`);
    }
  }
  if (input.checkpoint !== undefined && input.checkpoint !== null) {
    JSON.stringify(input.checkpoint);
  }
}

function validateDate(value: Date, name: string): void {
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) {
    throw new Error(`Account import ${name} must be a valid Date.`);
  }
}

function normalizeProvider(provider: string): string {
  const normalized = provider.trim().toUpperCase();
  if (normalized.length === 0) throw new Error('Account import provider is required.');
  return normalized;
}

function truncate(value: string, maxLength: number): string {
  return value.length <= maxLength ? value : value.slice(0, maxLength);
}
