import { Prisma, PrismaClient } from '@prisma/client';
import prisma from '../../prisma';
import {
  allowAccountImportAdmission,
  type AccountImportAdmissionGuard,
} from './account-import-admission.guard';
import {
  AccountImportAccountNotFoundError,
  AccountImportClaimLostError,
  AccountImportCoverageGapError,
  AccountImportRunNotFoundError,
  AccountImportRunNotWritableError,
  AccountImportWriteBatchTooLargeError,
} from './account-import.repository.prisma';
import type { NormalizedAccountImportGame } from './account-import.types';

const DEFAULT_MAX_WRITE_BATCH_SIZE = 100;

interface WritableImportRunRow {
  id: number;
  userId: number;
  accountId: number;
  provider: string;
  mode: string;
  status: string;
  scopeVersion: number | null;
  scopeHash: string | null;
  scopeJson: unknown | null;
  requestedFrom: Date | null;
  requestedTo: Date | null;
  windowsTotal: number | null;
  windowsCompleted: number;
  workKey: string | null;
}

interface CoverageRow {
  id: number;
  coveredFrom: Date | null;
  coveredThrough: Date | null;
}

interface IdRow {
  id: number;
}

export interface AccountImportProviderBatchCommitInput {
  userId: number;
  importRunId: number;
  workKey: string;
  games: NormalizedAccountImportGame[];
  gamesSeenDelta: number;
  gamesSkippedOutOfScopeDelta: number;
  gamesFailedDelta?: number;
}

export interface AccountImportProviderBatchCommitResult {
  attempted: number;
  inserted: number;
  duplicate: number;
}

export interface AccountImportProviderWindowCommitInput {
  userId: number;
  importRunId: number;
  workKey: string;
  coveredFrom: Date;
  coveredThrough: Date;
  windowsTotal: number;
  windowsCompleted: number;
  checkpoint: unknown;
}

export interface AccountImportProviderCommitRepository {
  persistBatch(
    input: AccountImportProviderBatchCommitInput,
  ): Promise<AccountImportProviderBatchCommitResult>;
  completeWindow(input: AccountImportProviderWindowCommitInput): Promise<void>;
}

export interface AccountImportProviderCommitRepositoryOptions {
  maxWriteBatchSize?: number;
}

export function createAccountImportProviderCommitRepository(
  database: PrismaClient = prisma,
  admissionGuard: AccountImportAdmissionGuard = allowAccountImportAdmission,
  options: AccountImportProviderCommitRepositoryOptions = {},
): AccountImportProviderCommitRepository {
  const maxWriteBatchSize = resolveMaxWriteBatchSize(options.maxWriteBatchSize);

  return {
    async persistBatch(input) {
      validateBatchInput(input, maxWriteBatchSize);
      return database.$transaction(async (transaction) => {
        const run = await lockWritableRun(transaction, input);
        await lockOwnedAccount(transaction, input.userId, run.accountId);
        await admissionGuard.assertAllowed(transaction, {
          userId: input.userId,
          accountId: run.accountId,
        });

        const write = input.games.length === 0
          ? { count: 0 }
          : await transaction.importedGame.createMany({
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
        const gamesFailed = input.gamesFailedDelta ?? 0;

        const updated = await transaction.$executeRaw(Prisma.sql`
          UPDATE "ImportRun"
          SET "gamesSeen" = "gamesSeen" + ${input.gamesSeenDelta},
              "gamesMatchedScope" = "gamesMatchedScope" + ${input.games.length},
              "gamesImported" = "gamesImported" + ${inserted},
              "gamesDuplicate" = "gamesDuplicate" + ${duplicate},
              "gamesSkipped" = "gamesSkipped" + ${input.gamesSkippedOutOfScopeDelta},
              "gamesSkippedOutOfScope" = "gamesSkippedOutOfScope" + ${input.gamesSkippedOutOfScopeDelta},
              "gamesFailed" = "gamesFailed" + ${gamesFailed},
              "lastProgressAt" = NOW(),
              "updatedAt" = NOW()
          WHERE "id" = ${input.importRunId}
            AND "userId" = ${input.userId}
            AND "workKey" = ${input.workKey}
            AND "status" = 'RUNNING'
        `);
        if (updated !== 1) throw new AccountImportClaimLostError();

        return {
          attempted: input.games.length,
          inserted,
          duplicate,
        };
      });
    },

    async completeWindow(input) {
      validateWindowInput(input);
      await database.$transaction(async (transaction) => {
        const run = await lockWritableRun(transaction, input);
        if (
          run.scopeVersion === null
          || run.scopeHash === null
          || run.scopeJson === null
          || run.requestedFrom === null
          || run.requestedTo === null
        ) {
          throw new Error('Durable account import is missing immutable scope or range metadata.');
        }
        if (input.coveredFrom < run.requestedFrom || input.coveredThrough > run.requestedTo) {
          throw new Error('Provider window coverage must stay within the immutable requested range.');
        }
        if (run.windowsTotal !== null && run.windowsTotal !== input.windowsTotal) {
          throw new Error('Account import window denominator cannot change after initialization.');
        }
        if (input.windowsCompleted < run.windowsCompleted) {
          throw new Error('Account import completed-window progress cannot move backwards.');
        }
        if (input.windowsCompleted > input.windowsTotal) {
          throw new Error('Account import completed-window progress cannot exceed its denominator.');
        }

        await lockOwnedAccount(transaction, input.userId, run.accountId);
        await admissionGuard.assertAllowed(transaction, {
          userId: input.userId,
          accountId: run.accountId,
        });

        const coverageRows = await transaction.$queryRaw<CoverageRow[]>(Prisma.sql`
          SELECT "id", "coveredFrom", "coveredThrough"
          FROM "AccountImportCoverage"
          WHERE "accountId" = ${run.accountId}
            AND "scopeHash" = ${run.scopeHash}
          FOR UPDATE
        `);
        const coverage = coverageRows[0];
        if (coverage) {
          const currentFrom = coverage.coveredFrom;
          const currentThrough = coverage.coveredThrough;
          if (currentFrom !== null && currentThrough !== null) {
            if (input.coveredThrough < currentFrom || input.coveredFrom > currentThrough) {
              throw new AccountImportCoverageGapError();
            }
          }
          const coveredFrom = currentFrom && currentFrom < input.coveredFrom
            ? currentFrom
            : input.coveredFrom;
          const coveredThrough = currentThrough && currentThrough > input.coveredThrough
            ? currentThrough
            : input.coveredThrough;
          await transaction.$executeRaw(Prisma.sql`
            UPDATE "AccountImportCoverage"
            SET "coveredFrom" = ${coveredFrom},
                "coveredThrough" = ${coveredThrough},
                "updatedAt" = NOW()
            WHERE "id" = ${coverage.id}
          `);
        } else {
          await transaction.$executeRaw(Prisma.sql`
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
          `);
        }

        const checkpointJson = JSON.stringify(input.checkpoint);
        const updated = await transaction.$executeRaw(Prisma.sql`
          UPDATE "ImportRun"
          SET "checkpointJson" = ${checkpointJson}::jsonb,
              "windowsTotal" = ${input.windowsTotal},
              "windowsCompleted" = ${input.windowsCompleted},
              "lastProgressAt" = NOW(),
              "updatedAt" = NOW()
          WHERE "id" = ${input.importRunId}
            AND "userId" = ${input.userId}
            AND "workKey" = ${input.workKey}
            AND "status" = 'RUNNING'
        `);
        if (updated !== 1) throw new AccountImportClaimLostError();
      });
    },
  };
}

export const AccountImportProviderCommitRepository =
  createAccountImportProviderCommitRepository();

async function lockWritableRun(
  transaction: Prisma.TransactionClient,
  input: { userId: number; importRunId: number; workKey: string },
): Promise<WritableImportRunRow> {
  const rows = await transaction.$queryRaw<WritableImportRunRow[]>(Prisma.sql`
    SELECT
      "id",
      "userId",
      "accountId",
      "provider",
      "mode",
      "status",
      "scopeVersion",
      "scopeHash",
      "scopeJson",
      "requestedFrom",
      "requestedTo",
      "windowsTotal",
      "windowsCompleted",
      "workKey"
    FROM "ImportRun"
    WHERE "id" = ${input.importRunId}
      AND "userId" = ${input.userId}
    FOR UPDATE
  `);
  const run = rows[0];
  if (!run) throw new AccountImportRunNotFoundError();
  if (run.mode === 'LEGACY_SYNC' || run.status !== 'RUNNING') {
    throw new AccountImportRunNotWritableError(run.status);
  }
  if (run.workKey === null || run.workKey !== input.workKey) {
    throw new AccountImportClaimLostError();
  }
  return run;
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

function validateBatchInput(
  input: AccountImportProviderBatchCommitInput,
  maxWriteBatchSize: number,
): void {
  validatePositiveInteger(input.userId, 'userId');
  validatePositiveInteger(input.importRunId, 'importRunId');
  if (!input.workKey.trim()) throw new Error('Account import workKey is required.');
  if (input.games.length > maxWriteBatchSize) {
    throw new AccountImportWriteBatchTooLargeError(maxWriteBatchSize);
  }
  validateNonNegativeInteger(input.gamesSeenDelta, 'gamesSeenDelta');
  validateNonNegativeInteger(
    input.gamesSkippedOutOfScopeDelta,
    'gamesSkippedOutOfScopeDelta',
  );
  const gamesFailed = input.gamesFailedDelta ?? 0;
  validateNonNegativeInteger(gamesFailed, 'gamesFailedDelta');
  if (
    input.gamesSeenDelta
    !== input.games.length + input.gamesSkippedOutOfScopeDelta + gamesFailed
  ) {
    throw new Error('Account import batch counters must exactly partition provider games seen.');
  }
}

function validateWindowInput(input: AccountImportProviderWindowCommitInput): void {
  validatePositiveInteger(input.userId, 'userId');
  validatePositiveInteger(input.importRunId, 'importRunId');
  if (!input.workKey.trim()) throw new Error('Account import workKey is required.');
  validateDate(input.coveredFrom, 'coveredFrom');
  validateDate(input.coveredThrough, 'coveredThrough');
  if (input.coveredFrom >= input.coveredThrough) {
    throw new Error('Account import provider window must be a non-empty half-open interval.');
  }
  validateNonNegativeInteger(input.windowsTotal, 'windowsTotal');
  validateNonNegativeInteger(input.windowsCompleted, 'windowsCompleted');
  if (input.windowsCompleted > input.windowsTotal) {
    throw new Error('Account import completed-window progress cannot exceed its denominator.');
  }
  JSON.stringify(input.checkpoint);
}

function resolveMaxWriteBatchSize(value: number | undefined): number {
  const resolved = value ?? DEFAULT_MAX_WRITE_BATCH_SIZE;
  if (!Number.isSafeInteger(resolved) || resolved <= 0 || resolved > DEFAULT_MAX_WRITE_BATCH_SIZE) {
    throw new Error(`Account import provider write batch size must be between 1 and ${DEFAULT_MAX_WRITE_BATCH_SIZE}.`);
  }
  return resolved;
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
