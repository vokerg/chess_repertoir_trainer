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
    super('Coverage extension must overlap or touch the existing proved interval.');
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
    super('Account import worker claim is no longer active.');
    this.name = 'AccountImportClaimLostError';
  }
}

export class AccountImportWriteBatchTooLargeError extends Error {
  constructor(public readonly maxWriteBatchSize: number) {
    super(`Account import write batch exceeds the configured maximum of ${maxWriteBatchSize} games.`);
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
        const accountRows = await transaction.$queryRaw<AccountRow[]>(Prisma.sql`
          SELECT "id", "provider"
          FROM "ExternalAccount"
          WHERE "id" = ${input.accountId}
            AND "userId" = ${input.userId}
          FOR UPDATE
        `);
        const account = accountRows[0];
        if (!account) throw new AccountImportAccountNotFoundError();

        await admissionGuard.assertAllowed(transaction, {
          userId: input.userId,
          accountId: input.accountId,
        });

        if (input.retryOfImportRunId !== undefined && input.retryOfImportRunId !== null) {
          await assertValidRetry(transaction, input, canonical.scopeHash);
        }

        const activeRows = await transaction.$queryRaw<IdRow[]>(Prisma.sql`
          SELECT "id"
          FROM "ImportRun"
          WHERE "accountId" = ${input.accountId}
            AND "status" IN (${nonTerminalStatusSql()})
          ORDER BY "createdAt" DESC, "id" DESC
          LIMIT 1
        `);
        const active = activeRows[0];
        if (active) throw new AccountImportActiveRunError(active.id);

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
          RETURNING ${runColumns()}
        `);
        const run = rows[0];
        if (!run) throw new Error('Account import run insert did not return a row.');
        return toStoredRun(run);
      }).catch(async (error: unknown) => {
        if (isActiveRunConstraintError(error)) {
          const active = await findActiveRunId(database, input.accountId);
          if (active !== null) throw new AccountImportActiveRunError(active);
        }
        throw error;
      });
    },

    async getRun(userId, importRunId) {
      const rows = await database.$queryRaw<ImportRunRow[]>(Prisma.sql`
        SELECT ${runColumns('run')}
        FROM "ImportRun" AS run
        WHERE run."id" = ${importRunId}
          AND run."userId" = ${userId}
        LIMIT 1
      `);
      const row = rows[0];
      return row ? toStoredRun(row) : null;
    },

    async getActiveRunForAccount(userId, accountId) {
      const rows = await database.$queryRaw<ImportRunRow[]>(Prisma.sql`
        SELECT ${runColumns('run')}
        FROM "ImportRun" AS run
        WHERE run."userId" = ${userId}
          AND run."accountId" = ${accountId}
          AND run."status" IN (${nonTerminalStatusSql()})
        ORDER BY run."createdAt" DESC, run."id" DESC
        LIMIT 1
      `);
      const row = rows[0];
      return row ? toStoredRun(row) : null;
    },

    async getCoverage(userId, accountId, scope) {
      const canonical = canonicalizeAccountImportScope(scope);
      const rows = await database.$queryRaw<CoverageRow[]>(Prisma.sql`
        SELECT ${coverageColumns('coverage')}
        FROM "AccountImportCoverage" AS coverage
        INNER JOIN "ExternalAccount" AS account
          ON account."id" = coverage."accountId"
        WHERE coverage."accountId" = ${accountId}
          AND coverage."scopeHash" = ${canonical.scopeHash}
          AND account."userId" = ${userId}
        LIMIT 1
      `);
      const row = rows[0];
      return row ? toStoredCoverage(row) : null;
    },

    async extendCoverage(input) {
      validateCoverageRange(input.coveredFrom, input.coveredThrough);
      validateWorkKey(input.workKey);

      return database.$transaction(async (transaction) => {
        const runRows = await transaction.$queryRaw<ImportRunRow[]>(Prisma.sql`
          SELECT ${runColumns('run')}
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
        if (run.workKey === null || run.workKey !== input.workKey) {
          throw new AccountImportClaimLostError();
        }
        if (
          run.scopeVersion === null
          || run.scopeHash === null
          || run.scopeJson === null
          || run.requestedFrom === null
          || run.requestedTo === null
        ) {
          throw new Error('Durable account import is missing immutable scope metadata.');
        }
        if (
          input.coveredFrom < run.requestedFrom
          || input.coveredThrough > run.requestedTo
        ) {
          throw new Error('Coverage extension must stay inside the immutable requested range.');
        }

        await lockOwnedAccount(transaction, input.userId, run.accountId);
        await admissionGuard.assertAllowed(transaction, {
          userId: input.userId,
          accountId: run.accountId,
        });

        const existingRows = await transaction.$queryRaw<CoverageRow[]>(Prisma.sql`
          SELECT ${coverageColumns('coverage')}
          FROM "AccountImportCoverage" AS coverage
          WHERE coverage."accountId" = ${run.accountId}
            AND coverage."scopeHash" = ${run.scopeHash}
          FOR UPDATE
        `);
        const existing = existingRows[0];
        if (existing) {
          const merged = mergeCoverage(existing, input.coveredFrom, input.coveredThrough);
          if (
            merged.coveredFrom.getTime() === existing.coveredFrom?.getTime()
            && merged.coveredThrough.getTime() === existing.coveredThrough?.getTime()
          ) {
            return toStoredCoverage(existing);
          }
          const updatedRows = await transaction.$queryRaw<CoverageRow[]>(Prisma.sql`
            UPDATE "AccountImportCoverage"
            SET "coveredFrom" = ${merged.coveredFrom},
                "coveredThrough" = ${merged.coveredThrough},
                "updatedAt" = NOW()
            WHERE "id" = ${existing.id}
            RETURNING ${coverageColumns()}
          `);
          const updated = updatedRows[0];
          if (!updated) throw new Error('Account import coverage update did not return a row.');
          return toStoredCoverage(updated);
        }

        const rows = await transaction.$queryRaw<CoverageRow[]>(Prisma.sql`
          INSERT INTO "AccountImportCoverage" (
            "accountId",
            "scopeVersion",
            "scopeHash",
            "scopeJson",
            "coveredFrom",
            "coveredThrough",
            "lastCompletedImportRunId",
            "createdAt",
            "updatedAt"
          ) VALUES (
            ${run.accountId},
            ${run.scopeVersion},
            ${run.scopeHash},
            ${JSON.stringify(run.scopeJson)}::jsonb,
            ${input.coveredFrom},
            ${input.coveredThrough},
            NULL,
            NOW(),
            NOW()
          )
          RETURNING ${coverageColumns()}
        `);
        const created = rows[0];
        if (!created) throw new Error('Account import coverage insert did not return a row.');
        return toStoredCoverage(created);
      });
    },

    async clearCoverageForAccount(userId, accountId) {
      return database.$transaction(async (transaction) => {
        const accountRows = await transaction.$queryRaw<IdRow[]>(Prisma.sql`
          SELECT "id"
          FROM "ExternalAccount"
          WHERE "id" = ${accountId}
            AND "userId" = ${userId}
          FOR UPDATE
        `);
        if (!accountRows[0]) throw new AccountImportAccountNotFoundError();
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
        INNER JOIN "ExternalAccount" AS account
          ON account."id" = run."accountId"
        WHERE run."accountId" = ${accountId}
          AND account."userId" = ${userId}
          AND run."workKey" IS NOT NULL
          AND run."status" IN ('RUNNING', 'PAUSE_REQUESTED', 'CANCEL_REQUESTED')
        LIMIT 1
      `);
      return rows.length > 0;
    },

    async persistGames(input) {
      validatePersistGamesInput(input, maxWriteBatchSize);
      if (input.games.length === 0) {
        return { attempted: 0, inserted: 0, duplicate: 0 };
      }

      return database.$transaction(async (transaction) => {
        const runRows = await transaction.$queryRaw<ImportRunRow[]>(Prisma.sql`
          SELECT ${runColumns('run')}
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
        if (run.workKey === null || run.workKey !== input.workKey) {
          throw new AccountImportClaimLostError();
        }

        await lockOwnedAccount(transaction, input.userId, run.accountId);
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
        const inserted = write.count;
        const duplicate = input.games.length - inserted;

        await transaction.$executeRaw(Prisma.sql`
          UPDATE "ImportRun"
          SET "gamesMatchedScope" = "gamesMatchedScope" + ${input.games.length},
              "gamesImported" = "gamesImported" + ${inserted},
              "gamesDuplicate" = "gamesDuplicate" + ${duplicate},
              "lastProgressAt" = NOW(),
              "updatedAt" = NOW()
          WHERE "id" = ${input.importRunId}
            AND "workKey" = ${input.workKey}
            AND "status" = 'RUNNING'
        `);

        return {
          attempted: input.games.length,
          inserted,
          duplicate,
        };
      });
    },
  };
}

export const AccountImportRepository = createAccountImportRepository();

function validateCreateRunInput(input: CreateAccountImportRunInput): void {
  validatePositiveInteger(input.userId, 'userId');
  validatePositiveInteger(input.accountId, 'accountId');
  validateNonNegativeInteger(input.priority, 'priority');
  if (input.windowsTotal !== undefined && input.windowsTotal !== null) {
    validateNonNegativeInteger(input.windowsTotal, 'windowsTotal');
  }
  validateDate(input.requestedFrom, 'requestedFrom');
  validateDate(input.requestedTo, 'requestedTo');
  if (input.requestedFrom >= input.requestedTo) {
    throw new Error('Account import requested range must be a non-empty half-open interval.');
  }
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
    retryOf.scopeHash !== scopeHash
    || retryOf.requestedFrom?.getTime() !== input.requestedFrom.getTime()
    || retryOf.requestedTo?.getTime() !== input.requestedTo.getTime()
  ) {
    throw new AccountImportInvalidRetryError('Retry must preserve the immutable import scope and requested range.');
  }
}

async function lockOwnedAccount(
  transaction: Prisma.TransactionClient,
  userId: number,
  accountId: number,
): Promise<void> {
  const rows = await transaction.$queryRaw<IdRow[]>(Prisma.sql`
    SELECT "id"
    FROM "ExternalAccount"
    WHERE "id" = ${accountId}
      AND "userId" = ${userId}
    FOR UPDATE
  `);
  if (!rows[0]) throw new AccountImportAccountNotFoundError();
}

async function findActiveRunId(database: PrismaClient, accountId: number): Promise<number | null> {
  const rows = await database.$queryRaw<IdRow[]>(Prisma.sql`
    SELECT "id"
    FROM "ImportRun"
    WHERE "accountId" = ${accountId}
      AND "status" IN (${nonTerminalStatusSql()})
    ORDER BY "createdAt" DESC, "id" DESC
    LIMIT 1
  `);
  return rows[0]?.id ?? null;
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

function nonTerminalStatusSql(): Prisma.Sql {
  return Prisma.join(NON_TERMINAL_IMPORT_STATUSES.map((status) => Prisma.sql`${status}`));
}

function resolveMaxWriteBatchSize(value: number | undefined): number {
  if (value === undefined) return DEFAULT_MAX_WRITE_BATCH_SIZE;
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error('Account import maxWriteBatchSize must be a positive integer.');
  }
  return value;
}

function validatePersistGamesInput(
  input: PersistAccountImportGamesInput,
  maxWriteBatchSize: number,
): void {
  validatePositiveInteger(input.userId, 'userId');
  validatePositiveInteger(input.importRunId, 'importRunId');
  validateWorkKey(input.workKey);
  if (input.games.length > maxWriteBatchSize) {
    throw new AccountImportWriteBatchTooLargeError(maxWriteBatchSize);
  }
  const providerGameIds = new Set<string>();
  for (const game of input.games) {
    if (typeof game.providerGameId !== 'string' || game.providerGameId.trim().length === 0) {
      throw new Error('Account import providerGameId must be a non-empty string.');
    }
    if (providerGameIds.has(game.providerGameId)) {
      throw new Error(`Account import write batch contains duplicate providerGameId ${game.providerGameId}.`);
    }
    providerGameIds.add(game.providerGameId);
  }
}

function validateCoverageRange(from: Date, through: Date): void {
  validateDate(from, 'coveredFrom');
  validateDate(through, 'coveredThrough');
  if (from >= through) {
    throw new Error('Account import coverage range must be a non-empty half-open interval.');
  }
}

function validateWorkKey(workKey: string): void {
  if (typeof workKey !== 'string' || workKey.trim().length === 0) {
    throw new Error('Account import workKey must be a non-empty string.');
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

  if (newThrough < existing.coveredFrom || newFrom > existing.coveredThrough) {
    throw new AccountImportCoverageGapError();
  }

  return {
    coveredFrom: newFrom < existing.coveredFrom ? newFrom : existing.coveredFrom,
    coveredThrough: newThrough > existing.coveredThrough ? newThrough : existing.coveredThrough,
  };
}

function validatePositiveInteger(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`Account import ${name} must be a positive integer.`);
  }
}

function validateNonNegativeInteger(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`Account import ${name} must be a non-negative integer.`);
  }
}

function validateDate(value: Date, name: string): void {
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) {
    throw new Error(`Account import ${name} must be a valid Date.`);
  }
}

function isActiveRunConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError
    && error.code === 'P2002';
}
