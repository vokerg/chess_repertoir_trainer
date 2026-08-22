import { Prisma, PrismaClient } from '@prisma/client';
import { accountImportScopeSchema, type AccountImportScope } from '@chess-trainer/contracts';
import prisma from '../../prisma';
import {
  allowPreparationAdmission,
  type PreparationAdmissionGuard,
} from './preparation-admission.guard';
import type { PreparationScopeSnapshot } from './preparation.types';

const ACCOUNT_IMPORT_PREPARATION_HANDOFF_LOCK_KEY = 17_000_315;
const NON_TERMINAL_PREPARATION_STATUSES = [
  'QUEUED',
  'RUNNING',
  'PAUSE_REQUESTED',
  'PAUSED',
  'CANCEL_REQUESTED',
  'NEEDS_ATTENTION',
] as const;
const HANDOFF_IMPORT_STATUSES = [
  'QUEUED',
  'RUNNING',
  'PAUSE_REQUESTED',
  'PAUSED',
  'CANCEL_REQUESTED',
  'COMPLETED',
] as const;

interface ImportHandoffRow {
  id: number;
  userId: number;
  accountId: number;
  mode: string;
  scopeVersion: number;
  scopeHash: string;
  scopeJson: unknown;
  requestedFrom: Date;
  requestedTo: Date;
  retryOfImportRunId: number | null;
  accountProvider: string;
  accountUsername: string;
}

interface RetryHandoffRow extends ImportHandoffRow {
  targetId: number;
  previousImportRunId: number;
}

interface IdRow {
  id: number;
}

export interface AccountImportPreparationHandoffRepository {
  reconcileNext(): Promise<boolean>;
}

export function createAccountImportPreparationHandoffRepository(
  database: PrismaClient = prisma,
  admissionGuard: PreparationAdmissionGuard = allowPreparationAdmission,
): AccountImportPreparationHandoffRepository {
  return {
    async reconcileNext() {
      try {
        return await database.$transaction(async (transaction) => {
          await transaction.$executeRaw(Prisma.sql`
            SELECT pg_advisory_xact_lock(${ACCOUNT_IMPORT_PREPARATION_HANDOFF_LOCK_KEY})
          `);

          const retry = await findRetryHandoff(transaction);
          if (retry) {
            await admissionGuard.assertAllowed(transaction, {
              userId: retry.userId,
              accountId: retry.accountId,
            });
            const updated = await transaction.$executeRaw(Prisma.sql`
              UPDATE "DataPreparationTarget"
              SET "currentImportRunId" = ${retry.id},
                  "updatedAt" = NOW()
              WHERE "id" = ${retry.targetId}
                AND "currentImportRunId" = ${retry.previousImportRunId}
            `);
            return updated === 1;
          }

          const candidate = await findExpansionHandoff(transaction);
          if (!candidate) return false;

          await admissionGuard.assertAllowed(transaction, {
            userId: candidate.userId,
            accountId: candidate.accountId,
          });

          const scope = accountImportScopeSchema.parse(candidate.scopeJson);
          const preparationScope = toPreparationScope(scope);
          const recipe = {
            kind: 'ACCOUNT_IMPORT_EXPANSION',
            importRunId: candidate.id,
            mode: candidate.mode,
          };

          const runRows = await transaction.$queryRaw<IdRow[]>(Prisma.sql`
            INSERT INTO "DataPreparationRun" (
              "userId",
              "purpose",
              "status",
              "recipeVersion",
              "recipeJson",
              "retryGeneration",
              "reconcileAfter",
              "createdAt",
              "updatedAt"
            )
            VALUES (
              ${candidate.userId},
              'EXPANSION',
              'QUEUED',
              1,
              ${JSON.stringify(recipe)}::jsonb,
              0,
              NOW(),
              NOW(),
              NOW()
            )
            RETURNING "id"
          `);
          const preparationRunId = runRows[0]?.id;
          if (!preparationRunId) {
            throw new Error('Account-import preparation handoff did not create a preparation run.');
          }

          await transaction.$executeRaw(Prisma.sql`
            INSERT INTO "DataPreparationTarget" (
              "preparationRunId",
              "accountId",
              "accountProvider",
              "accountUsername",
              "ordinal",
              "scopeVersion",
              "scopeHash",
              "scopeJson",
              "requestedFrom",
              "requestedTo",
              "currentImportRunId",
              "createdAt",
              "updatedAt"
            )
            VALUES (
              ${preparationRunId},
              ${candidate.accountId},
              ${candidate.accountProvider},
              ${candidate.accountUsername},
              0,
              ${candidate.scopeVersion},
              ${candidate.scopeHash},
              ${JSON.stringify(preparationScope)}::jsonb,
              ${candidate.requestedFrom},
              ${candidate.requestedTo},
              ${candidate.id},
              NOW(),
              NOW()
            )
          `);

          return true;
        });
      } catch (error) {
        if (isUniqueConstraintViolation(error)) return false;
        throw error;
      }
    },
  };
}

export const AccountImportPreparationHandoffRepository =
  createAccountImportPreparationHandoffRepository();

async function findRetryHandoff(
  transaction: Prisma.TransactionClient,
): Promise<RetryHandoffRow | null> {
  const rows = await transaction.$queryRaw<RetryHandoffRow[]>(Prisma.sql`
    SELECT
      retry."id",
      retry."userId",
      retry."accountId",
      retry."mode",
      retry."scopeVersion",
      retry."scopeHash",
      retry."scopeJson",
      retry."requestedFrom",
      retry."requestedTo",
      retry."retryOfImportRunId",
      account."provider" AS "accountProvider",
      account."username" AS "accountUsername",
      target."id" AS "targetId",
      previous."id" AS "previousImportRunId"
    FROM "ImportRun" AS retry
    JOIN "ImportRun" AS previous
      ON previous."id" = retry."retryOfImportRunId"
    JOIN "DataPreparationTarget" AS target
      ON target."currentImportRunId" = previous."id"
    JOIN "DataPreparationRun" AS preparation
      ON preparation."id" = target."preparationRunId"
    JOIN "ExternalAccount" AS account
      ON account."id" = retry."accountId"
     AND account."userId" = retry."userId"
    WHERE retry."mode" <> 'LEGACY_SYNC'
      AND retry."source" = 'USER_ACTION'
      AND retry."status" IN (${Prisma.join(HANDOFF_IMPORT_STATUSES.map((status) => Prisma.sql`${status}`))})
      AND retry."scopeVersion" IS NOT NULL
      AND retry."scopeHash" IS NOT NULL
      AND retry."scopeJson" IS NOT NULL
      AND retry."requestedFrom" IS NOT NULL
      AND retry."requestedTo" IS NOT NULL
      AND target."accountId" = retry."accountId"
      AND target."scopeHash" = retry."scopeHash"
      AND target."requestedFrom" = retry."requestedFrom"
      AND target."requestedTo" = retry."requestedTo"
      AND preparation."userId" = retry."userId"
      AND preparation."status" IN (${Prisma.join(NON_TERMINAL_PREPARATION_STATUSES.map((status) => Prisma.sql`${status}`))})
      AND NOT EXISTS (
        SELECT 1
        FROM "DataPreparationTarget" AS current_target
        WHERE current_target."currentImportRunId" = retry."id"
      )
    ORDER BY retry."createdAt" ASC, retry."id" ASC
    FOR UPDATE OF retry, target, preparation, account SKIP LOCKED
    LIMIT 1
  `);
  return rows[0] ?? null;
}

async function findExpansionHandoff(
  transaction: Prisma.TransactionClient,
): Promise<ImportHandoffRow | null> {
  const rows = await transaction.$queryRaw<ImportHandoffRow[]>(Prisma.sql`
    SELECT
      run."id",
      run."userId",
      run."accountId",
      run."mode",
      run."scopeVersion",
      run."scopeHash",
      run."scopeJson",
      run."requestedFrom",
      run."requestedTo",
      run."retryOfImportRunId",
      account."provider" AS "accountProvider",
      account."username" AS "accountUsername"
    FROM "ImportRun" AS run
    JOIN "ExternalAccount" AS account
      ON account."id" = run."accountId"
     AND account."userId" = run."userId"
    WHERE run."mode" <> 'LEGACY_SYNC'
      AND run."source" = 'USER_ACTION'
      AND run."status" IN (${Prisma.join(HANDOFF_IMPORT_STATUSES.map((status) => Prisma.sql`${status}`))})
      AND run."scopeVersion" IS NOT NULL
      AND run."scopeHash" IS NOT NULL
      AND run."scopeJson" IS NOT NULL
      AND run."requestedFrom" IS NOT NULL
      AND run."requestedTo" IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM "DataPreparationTarget" AS target
        WHERE target."currentImportRunId" = run."id"
      )
      AND NOT EXISTS (
        SELECT 1
        FROM "DataPreparationRun" AS preparation
        WHERE preparation."userId" = run."userId"
          AND preparation."status" IN (${Prisma.join(NON_TERMINAL_PREPARATION_STATUSES.map((status) => Prisma.sql`${status}`))})
      )
    ORDER BY run."createdAt" ASC, run."id" ASC
    FOR UPDATE OF run, account SKIP LOCKED
    LIMIT 1
  `);
  return rows[0] ?? null;
}

function toPreparationScope(scope: AccountImportScope): PreparationScopeSnapshot {
  return {
    rated: scope.rated === 'BOTH' ? 'ANY' : scope.rated,
    speedCategories: [...scope.speeds],
    variants: [scope.variant],
  };
}

function isUniqueConstraintViolation(error: unknown): boolean {
  const candidate = error as {
    code?: unknown;
    meta?: { code?: unknown };
    message?: unknown;
  };
  return candidate?.code === 'P2002'
    || candidate?.meta?.code === '23505'
    || (candidate?.code === 'P2010' && String(candidate?.message ?? '').includes('23505'));
}
