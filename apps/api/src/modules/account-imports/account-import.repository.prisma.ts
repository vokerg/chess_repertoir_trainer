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
import { canonicalizeAccountImportScope } from './account-import.scope';
import type {
  CreateAccountImportRunInput,
  ExtendAccountImportCoverageInput,
  PersistAccountImportGamesInput,
  PersistAccountImportGamesResult,
  StoredAccountImportCoverage,
  StoredAccountImportRun,
} from './account-import.types';

const NON_TERMINAL_IMPORT_STATUSES = [
  'QUEUED',
  'RUNNING',
  'PAUSE_REQUESTED',
  'PAUSED',
  'CANCEL_REQUESTED',
] as const;
const DEFAULT_MAX_WRITE_BATCH_SIZE = 100;

interface AccountRow {
  id: number;
  provider: string;
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

interface RetryRunRow {
  id: number;
  mode: string;
  status: string;
  scopeHash: string | null;
  requestedFrom: Date | null;
  requestedTo: Date | null;
}

interface CoverageRow {
  id: number;
  accountId: number;
  scopeVersion: number;
  scopeHash: string;
  scopeJson: unknown;
  coveredFrom: Date | null;
  coveredThrough: Date | null;
  lastCompletedImportRunId: number | null;
  createdAt: Date;
  updatedAt: Date;
}

interface IdRow {
  id: number;
}

export interface AccountImportRepositoryOptions {
  maxWriteBatchSize?: number;
}

export class AccountImportAccountNotFoundError extends Error {
  constructor() {
    super('Owned external account not found.');
    this.name = 'AccountImportAccountNotFoundError';
  }
}

export class AccountImportRunNotFoundError extends Error {
  constructor() {
    super('Owned account import run not found.');
    this.name = 'AccountImportRunNotFoundError';
  }
}

export class AccountImportActiveRunError extends Error {
  constructor(public readonly activeImportRunId: number) {
    super(`Account already has active import run ${activeImportRunId}.`);
    this.name = 'AccountImportActiveRunError';
  }
}

export class AccountImportInvalidRetryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AccountImportInvalidRetryError';
  }
}

export class AccountImportCoverageGapError extends Error {
  constructor() {
    super('Proved account import coverage cannot jump across an unproved gap.');
    this.name = 'AccountImportCoverageGapError';
  }
}

export class AccountImportRunNotWritableError extends Error {
  constructor(status: string) {
    super(`Account import run is not writable in status ${status}.`);
    this.name = 'AccountImportRunNotWritableError';
  }
}

export class AccountImportClaimLostError extends Error {
  constructor() {
    super('Account import claim no longer matches the active work key.');
    this.name = 'AccountImportClaimLostError';
  }
}

export class AccountImportWriteBatchTooLargeError extends Error {
  constructor(maxWriteBatchSize: number) {
    super(`Account import write batch exceeds the configured maximum of ${maxWriteBatchSize}.`);
    this.name = 'AccountImportWriteBatchTooLargeError';
  }
}

export interface AccountImportRepository {
  createRun(input: CreateAccountImportRunInput): Promise<StoredAccountImportRun>;
  getRun(userId: number, importRunId: number): Promise<StoredAccountImportRun | null>;
  getActiveRunForAccount(userId: number, accountId: number): Promise<StoredAccountImportRun | null>;
  getCoverage(
    userId: number,
    accountId: number,
    scope: CreateAccountImportRunInput['scope'],
  ): Promise<StoredAccountImportCoverage | null>;
  extendCoverage(input: ExtendAccountImportCoverageInput): Promise<StoredAccountImportCoverage>;
  clearCoverageForAccount(userId: number, accountId: number): Promise<number>;
  hasActiveClaimForAccount(userId: number, accountId: number): Promise<boolean>;
  persistGames(input: PersistAccountImportGamesInput): Promise<PersistAccountImportGamesResult>;
}

export function createAccountImportRepository(
  database: PrismaClient = prisma,
  admissionGuard: AccountImportAdmissionGuard = allowAccountImportAdmission,
  options: AccountImportRepositoryOptions = {},
): AccountImportRepository {
  const maxWriteBatchSize = resolveMaxWriteBatchSize(options.maxWriteBatchSize);

  return {
    async createRun(input) {
      validateCreateRunInput(input);
      const canonical = canonicalizeAccountImportScope(input.scope);

      return database.$transaction(async (transaction) => {
        const account = await lockOwnedAccount(transaction, input.userId, input.accountId);
        await admissionGuard.assertAllowed(transaction, {
          userId: input.userId,
          accountId: input.accountId,
        });

        if (input.retryOfImportRunId !== undefined && input.retryOfImportRunId !== null) {
          await assertValidRetry(transaction, input, canonical.scopeHash);
        }

        const rows = await transaction.$queryRaw<ImportRunRow[]>(Prisma.sql`
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
            "createdAt",
            "updatedAt"
          )
          VALUES (
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
            NOW(),
            NOW()
          )
          ON CONFLICT DO NOTHING
          RETURNING ${importRunColumns()}
        `);

        const created = rows[0];
        if (created) return toStoredRun(created);

        const activeRows = await selectActiveRun(
          transaction,
          input.userId,
          input.accountId,
        );
        const active = activeRows[0];
        if (active) {
          throw new AccountImportActiveRunError(active.id);
        }
        throw new Error('Account import run creation was rejected by a database uniqueness invariant.');
      });
    },

    async getRun(userId, importRunId) {
      const rows = await database.$queryRaw<ImportRunRow[]>(Prisma.sql`
        SELECT ${importRunColumns('run')}
        FROM "ImportRun" AS run
        WHERE run."id" = ${importRunId}
          AND run."userId" = ${userId}
        LIMIT 1
      `);
      return rows[0] ? toStoredRun(rows[0]) : null;
    },

    async getActiveRunForAccount(userId, accountId) {
      const rows = await selectActiveRun(database, userId, accountId);
      return rows[0] ? toStoredRun(rows[0]) : null;
    },

    async getCoverage(userId, accountId, scope) {
      await assertOwnedAccount(database, userId, accountId);
      const canonical = canonicalizeAccountImportScope(scope);
      const rows = await database.$queryRaw<CoverageRow[]>(Prisma.sql`
        SELECT ${coverageColumns('coverage')}
        FROM "AccountImportCoverage" AS coverage
        WHERE coverage."accountId" = ${accountId}
          AND coverage."scopeHash" = ${canonical.scopeHash}
        LIMIT 1
      `);
      return rows[0] ? toStoredCoverage(rows[0]) : null;
    },

    async extendCoverage(input) {
      validateCoverageRange(input.coveredFrom, input.coveredThrough);

      return database.$transaction(async (transaction) => {
        const runRows = await transaction.$queryRaw<ImportRunRow[]>(Prisma.sql`
          SELECT ${importRunColumns('run')}
          FROM "ImportRun" AS run
          WHERE run."id" = ${input.importRunId}
            AND run."userId" = ${input.userId}
          FOR UPDATE
        `);
        const run = runRows[0];
        if (!run) throw new AccountImportRunNotFoundError();
        if (
          run.mode === 'LEGACY_SYNC'
          || run.scopeVersion === null
          || run.scopeHash === null
          || run.scopeJson === null
          || run.requestedFrom === null
          || run.requestedTo === null
        ) {
          throw new Error('Legacy import history cannot establish exact durable coverage.');
        }
        if (
          input.coveredFrom < run.requestedFrom
          || input.coveredThrough > run.requestedTo
        ) {
          throw new Error('Proved coverage must stay within the immutable import request range.');
        }

        await lockOwnedAccount(transaction, input.userId, run.accountId);

        const existingRows = await transaction.$queryRaw<CoverageRow[]>(Prisma.sql`
          SELECT ${coverageColumns('coverage')}
          FROM "AccountImportCoverage" AS coverage
          WHERE coverage."accountId" = ${run.accountId}
            AND coverage."scopeHash" = ${run.scopeHash}
          FOR UPDATE
        `);
        const existing = existingRows[0];

        if (!existing) {
          const createdRows = await transaction.$queryRaw<CoverageRow[]>(Prisma.sql`
            INSERT INTO "AccountImportCoverage" (
              "accountId",
              "scopeVersion",
              "scopeHash",
              "scopeJson",
              "coveredFrom",
              "coveredThrough",
              "createdAt",
              "updatedAt"
            )
            VALUES (
              ${run.accountId},
              ${run.scopeVersion},
              ${run.scopeHash},
              ${JSON.stringify(accountImportScopeSchema.parse(run.scopeJson))}::jsonb,
              ${input.coveredFrom},
              ${input.coveredThrough},
              NOW(),
              NOW()
            )
            RETURNING ${coverageColumns()}
          `);
          const created = createdRows[0];
          if (!created) throw new Error('Coverage creation did not return a row.');
          return toStoredCoverage(created);
        }

        const merged = mergeCoverage(existing, input.coveredFrom, input.coveredThrough);
        const updatedRows = await transaction.$queryRaw<CoverageRow[]>(Prisma.sql`
          UPDATE "AccountImportCoverage"
          SET "coveredFrom" = ${merged.coveredFrom},
              "coveredThrough" = ${merged.coveredThrough},
              "updatedAt" = NOW()
          WHERE "id" = ${existing.id}
          RETURNING ${coverageColumns()}
        `);
        const updated = updatedRows[0];
        if (!updated) throw new Error('Coverage update did not return a row.');
        return toStoredCoverage(updated);
      });
    },

    async clearCoverageForAccount(userId, accountId) {
      return database.$transaction(async (transaction) => {
        await lockOwnedAccount(transaction, userId, accountId);
        return transaction.$executeRaw(Prisma.sql`
          DELETE FROM "AccountImportCoverage"
          WHERE "accountId" = ${accountId}
        `);
      });
    },

    async hasActiveClaimForAccount(userId, accountId) {
      const rows = await database.$queryRaw<IdRow[]>(Prisma.sql`
        SELECT run."id"
        FROM "ImportRun" AS run
        JOIN "ExternalAccount" AS account ON account."id" = run."accountId"
        WHERE account."id" = ${accountId}
          AND account."userId" = ${userId}
          AND run."workKey" IS NOT NULL
          AND run."status" IN (${nonTerminalStatusSql()})
        LIMIT 1
      `);
      return rows.length === 1;
    },

    async persistGames(input) {
      validatePersistGamesInput(input, maxWriteBatchSize);
      if (input.games.length === 0) {
        return { attempted: 0, inserted: 0, duplicate: 0 };
      }

      return database.$transaction(async (transaction) => {
        const runRows = await transaction.$queryRaw<ImportRunRow[]>(Prisma.sql`
          SELECT ${importRunColumns('run')}
          FROM "ImportRun" AS run
          WHERE run."id" = ${input.importRunId}
            AND run."userId" = ${input.userId}
          FOR UPDATE
        `);
        const run = runRows[0];
        if (!run) throw new AccountImportRunNotFoundError();
        if (run.mode === 'LEGACY_SYNC' || run.status !== 'RUNNING') {
          throw new AccountImportRunNotWritableError(run.status);
        }
        if (run.workKey !== (input.workKey ?? null)) {
          throw new AccountImportClaimLostError();
        }

        await admissionGuard.assertAllowed(transaction, {
          userId: input.userId,
          accountId: run.accountId,
        });

        const write = await transaction.importedGame.createMany({
          data: input.games.map((game) => ({
            userId: input.userId,
            accountId: run.accountId,
            provider: run.provider,
            providerGameId: game.providerGameId,
            providerUrl: game.providerUrl ?? null,
            pgn: game.pgn ?? null,
            rated: game.rated ?? null,
            variant: game.variant ?? null,
            speedCategory: game.speedCategory ?? null,
            timeControlRaw: game.timeControlRaw ?? null,
            timeControlInitial: game.timeControlInitial ?? null,
            timeControlIncrement: game.timeControlIncrement ?? null,
            startedAt: game.startedAt ?? null,
            endedAt: game.endedAt ?? null,
            whiteUsername: game.whiteUsername ?? null,
            blackUsername: game.blackUsername ?? null,
            whiteRating: game.whiteRating ?? null,
            blackRating: game.blackRating ?? null,
            userColor: game.userColor ?? null,
            opponentUsername: game.opponentUsername ?? null,
            result: game.result ?? null,
            resultForUser: game.resultForUser ?? null,
            status: game.status ?? null,
            openingName: game.openingName ?? null,
            openingEco: game.openingEco ?? null,
          })),
          skipDuplicates: true,
        });
        const attempted = input.games.length;
        const inserted = write.count;
        const duplicate = attempted - inserted;

        await transaction.$executeRaw(Prisma.sql`
          UPDATE "ImportRun"
          SET "gamesMatchedScope" = "gamesMatchedScope" + ${attempted},
              "gamesImported" = "gamesImported" + ${inserted},
              "gamesDuplicate" = "gamesDuplicate" + ${duplicate},
              "lastProgressAt" = NOW(),
              "updatedAt" = NOW()
          WHERE "id" = ${run.id}
        `);

        return { attempted, inserted, duplicate };
      });
    },
  };
}

export const AccountImportRepository = createAccountImportRepository();

async function lockOwnedAccount(
  transaction: Prisma.TransactionClient,
  userId: number,
  accountId: number,
): Promise<AccountRow> {
  const rows = await transaction.$queryRaw<AccountRow[]>(Prisma.sql`
    SELECT "id", "provider"
    FROM "ExternalAccount"
    WHERE "id" = ${accountId}
      AND "userId" = ${userId}
    FOR UPDATE
  `);
  const account = rows[0];
  if (!account) throw new AccountImportAccountNotFoundError();
  return account;
}

async function assertOwnedAccount(
  database: Pick<PrismaClient, '$queryRaw'>,
  userId: number,
  accountId: number,
): Promise<void> {
  const rows = await database.$queryRaw<IdRow[]>(Prisma.sql`
    SELECT "id"
    FROM "ExternalAccount"
    WHERE "id" = ${accountId}
      AND "userId" = ${userId}
    LIMIT 1
  `);
  if (rows.length !== 1) throw new AccountImportAccountNotFoundError();
}

async function assertValidRetry(
  transaction: Prisma.TransactionClient,
  input: CreateAccountImportRunInput,
  scopeHash: string,
): Promise<void> {
  const rows = await transaction.$queryRaw<RetryRunRow[]>(Prisma.sql`
    SELECT
      "id",
      "mode",
      "status",
      "scopeHash",
      "requestedFrom",
      "requestedTo"
    FROM "ImportRun"
    WHERE "id" = ${input.retryOfImportRunId ?? null}
      AND "userId" = ${input.userId}
      AND "accountId" = ${input.accountId}
    FOR SHARE
  `);
  const retry = rows[0];
  if (!retry) {
    throw new AccountImportInvalidRetryError('Retry source is not owned by the user/account.');
  }
  if (retry.status !== 'FAILED' && retry.status !== 'CANCELLED') {
    throw new AccountImportInvalidRetryError('Only failed or cancelled imports can be retried.');
  }
  if (
    retry.mode !== input.mode
    || retry.scopeHash !== scopeHash
    || retry.requestedFrom?.getTime() !== input.requestedFrom.getTime()
    || retry.requestedTo?.getTime() !== input.requestedTo.getTime()
  ) {
    throw new AccountImportInvalidRetryError(
      'Retry must preserve the source import mode, exact scope, and immutable range.',
    );
  }
}

async function selectActiveRun(
  database: Pick<PrismaClient, '$queryRaw'> | Prisma.TransactionClient,
  userId: number,
  accountId: number,
): Promise<ImportRunRow[]> {
  return database.$queryRaw<ImportRunRow[]>(Prisma.sql`
    SELECT ${importRunColumns('run')}
    FROM "ImportRun" AS run
    JOIN "ExternalAccount" AS account ON account."id" = run."accountId"
    WHERE run."accountId" = ${accountId}
      AND account."userId" = ${userId}
      AND run."status" IN (${nonTerminalStatusSql()})
    ORDER BY run."createdAt" DESC, run."id" DESC
    LIMIT 1
  `);
}

function validateCreateRunInput(input: CreateAccountImportRunInput): void {
  if (!Number.isSafeInteger(input.userId) || input.userId <= 0) {
    throw new Error('Account import userId must be a positive integer.');
  }
  if (!Number.isSafeInteger(input.accountId) || input.accountId <= 0) {
    throw new Error('Account import accountId must be a positive integer.');
  }
  if (!Number.isSafeInteger(input.priority) || input.priority < 0) {
    throw new Error('Account import priority must be a non-negative integer.');
  }
  if (
    input.windowsTotal !== undefined
    && input.windowsTotal !== null
    && (!Number.isSafeInteger(input.windowsTotal) || input.windowsTotal < 0)
  ) {
    throw new Error('Account import windowsTotal must be a non-negative integer or null.');
  }
  validateCoverageRange(input.requestedFrom, input.requestedTo);
}

function validatePersistGamesInput(
  input: PersistAccountImportGamesInput,
  maxWriteBatchSize: number,
): void {
  if (!Number.isSafeInteger(input.userId) || input.userId <= 0) {
    throw new Error('Account import userId must be a positive integer.');
  }
  if (!Number.isSafeInteger(input.importRunId) || input.importRunId <= 0) {
    throw new Error('Account import importRunId must be a positive integer.');
  }
  if (input.games.length > maxWriteBatchSize) {
    throw new AccountImportWriteBatchTooLargeError(maxWriteBatchSize);
  }
  for (const game of input.games) {
    if (typeof game.providerGameId !== 'string' || game.providerGameId.trim().length === 0) {
      throw new Error('Every normalized import game requires a providerGameId.');
    }
  }
}

function resolveMaxWriteBatchSize(value: number | undefined): number {
  if (value === undefined) return DEFAULT_MAX_WRITE_BATCH_SIZE;
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error('Account import maxWriteBatchSize must be a positive integer.');
  }
  return value;
}

function validateCoverageRange(from: Date, through: Date): void {
  if (
    !(from instanceof Date)
    || !(through instanceof Date)
    || !Number.isFinite(from.getTime())
    || !Number.isFinite(through.getTime())
    || from >= through
  ) {
    throw new Error('Account import range must be a non-empty half-open interval.');
  }
}

function mergeCoverage(
  existing: CoverageRow,
  newFrom: Date,
  newThrough: Date,
): { coveredFrom: Date; coveredThrough: Date } {
  if (existing.coveredFrom === null || existing.coveredThrough === null) {
    return { coveredFrom: newFrom, coveredThrough: newThrough };
  }
  if (newFrom > existing.coveredThrough || newThrough < existing.coveredFrom) {
    throw new AccountImportCoverageGapError();
  }
  return {
    coveredFrom: newFrom < existing.coveredFrom ? newFrom : existing.coveredFrom,
    coveredThrough: newThrough > existing.coveredThrough ? newThrough : existing.coveredThrough,
  };
}

function nonTerminalStatusSql(): Prisma.Sql {
  return Prisma.join(
    NON_TERMINAL_IMPORT_STATUSES.map((status) => Prisma.sql`${status}`),
  );
}

function importRunColumns(alias?: string): Prisma.Sql {
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

function coverageColumns(alias?: string): Prisma.Sql {
  const prefix = alias ? Prisma.raw(`"${alias}".`) : Prisma.empty;
  return Prisma.join([
    Prisma.sql`${prefix}"id"`,
    Prisma.sql`${prefix}"accountId"`,
    Prisma.sql`${prefix}"scopeVersion"`,
    Prisma.sql`${prefix}"scopeHash"`,
    Prisma.sql`${prefix}"scopeJson"`,
    Prisma.sql`${prefix}"coveredFrom"`,
    Prisma.sql`${prefix}"coveredThrough"`,
    Prisma.sql`${prefix}"lastCompletedImportRunId"`,
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

function toStoredCoverage(row: CoverageRow): StoredAccountImportCoverage {
  return {
    ...row,
    scope: accountImportScopeSchema.parse(row.scopeJson),
  };
}
