import { createHash } from 'node:crypto';
import { Prisma, PrismaClient } from '@prisma/client';
import { accountImportScopeSchema, type AccountImportScope } from '@chess-trainer/contracts';
import prisma from '../../prisma';
import {
  allowPreparationAdmission,
  type PreparationAdmissionGuard,
} from './preparation-admission.guard';
import type { PreparationScopeSnapshot } from './preparation.types';

const ACCOUNT_IMPORT_PREPARATION_HANDOFF_LOCK_KEY = 17_000_315;
const PREPARATION_SCOPE_VERSION = 1;
const MAX_EXPANSION_TARGETS_PER_RUN = 20;
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

interface UserIdRow {
  userId: number;
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

          const candidateUserId = await findExpansionUserId(transaction);
          if (candidateUserId === null) return false;
          const candidates = await findExpansionHandoffsForUser(transaction, candidateUserId);
          if (candidates.length === 0) return false;

          for (const candidate of candidates) {
            await admissionGuard.assertAllowed(transaction, {
              userId: candidate.userId,
              accountId: candidate.accountId,
            });
          }

          const recipe = {
            kind: 'ACCOUNT_IMPORT_EXPANSION',
            importRunIds: candidates.map((candidate) => candidate.id),
            modes: candidates.map((candidate) => candidate.mode),
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
              ${candidateUserId},
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

          for (const [ordinal, candidate] of candidates.entries()) {
            const importScope = accountImportScopeSchema.parse(candidate.scopeJson);
            const canonicalPreparationScope = canonicalizePreparationScope(
              toPreparationScope(importScope),
            );
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
                ${ordinal},
                ${canonicalPreparationScope.scopeVersion},
                ${canonicalPreparationScope.scopeHash},
                ${JSON.stringify(canonicalPreparationScope.scope)}::jsonb,
                ${candidate.requestedFrom},
                ${candidate.requestedTo},
                ${candidate.id},
                NOW(),
                NOW()
              )
            `);
          }

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
      AND retry."source" = 'ACCOUNT_REFRESH'
      AND retry."status" IN (${Prisma.join(HANDOFF_IMPORT_STATUSES.map((status) => Prisma.sql`${status}`))})
      AND retry."scopeVersion" IS NOT NULL
      AND retry."scopeHash" IS NOT NULL
      AND retry."scopeJson" IS NOT NULL
      AND retry."requestedFrom" IS NOT NULL
      AND retry."requestedTo" IS NOT NULL
      AND target."accountId" = retry."accountId"
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

async function findExpansionUserId(
  transaction: Prisma.TransactionClient,
): Promise<number | null> {
  const rows = await transaction.$queryRaw<UserIdRow[]>(Prisma.sql`
    SELECT run."userId"
    FROM "ImportRun" AS run
    JOIN "ExternalAccount" AS account
      ON account."id" = run."accountId"
     AND account."userId" = run."userId"
    WHERE ${expansionImportPredicate()}
      AND NOT EXISTS (
        SELECT 1
        FROM "DataPreparationRun" AS preparation
        WHERE preparation."userId" = run."userId"
          AND preparation."status" IN (${Prisma.join(NON_TERMINAL_PREPARATION_STATUSES.map((status) => Prisma.sql`${status}`))})
      )
    ORDER BY run."createdAt" ASC, run."id" ASC
    LIMIT 1
  `);
  return rows[0]?.userId ?? null;
}

async function findExpansionHandoffsForUser(
  transaction: Prisma.TransactionClient,
  userId: number,
): Promise<ImportHandoffRow[]> {
  return transaction.$queryRaw<ImportHandoffRow[]>(Prisma.sql`
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
    FROM "ExternalAccount" AS account
    JOIN LATERAL (
      SELECT candidate.*
      FROM "ImportRun" AS candidate
      WHERE candidate."userId" = ${userId}
        AND candidate."accountId" = account."id"
        AND ${expansionImportPredicate('candidate')}
      ORDER BY candidate."createdAt" ASC, candidate."id" ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    ) AS run ON TRUE
    WHERE account."userId" = ${userId}
      AND NOT EXISTS (
        SELECT 1
        FROM "DataPreparationRun" AS preparation
        WHERE preparation."userId" = ${userId}
          AND preparation."status" IN (${Prisma.join(NON_TERMINAL_PREPARATION_STATUSES.map((status) => Prisma.sql`${status}`))})
      )
    ORDER BY run."createdAt" ASC, run."id" ASC
    LIMIT ${MAX_EXPANSION_TARGETS_PER_RUN}
  `);
}

function expansionImportPredicate(alias = 'run'): Prisma.Sql {
  const prefix = Prisma.raw(`"${alias}".`);
  return Prisma.sql`
    ${prefix}"mode" <> 'LEGACY_SYNC'
    AND ${prefix}"source" = 'ACCOUNT_REFRESH'
    AND ${prefix}"status" IN (${Prisma.join(HANDOFF_IMPORT_STATUSES.map((status) => Prisma.sql`${status}`))})
    AND ${prefix}"scopeVersion" IS NOT NULL
    AND ${prefix}"scopeHash" IS NOT NULL
    AND ${prefix}"scopeJson" IS NOT NULL
    AND ${prefix}"requestedFrom" IS NOT NULL
    AND ${prefix}"requestedTo" IS NOT NULL
    AND (${prefix}"scopeJson" -> 'speeds') ?| ARRAY['BLITZ', 'RAPID']
    AND (
      ${prefix}"status" <> 'COMPLETED'
      OR EXISTS (
        SELECT 1
        FROM "AccountImportCoverage" AS coverage
        WHERE coverage."accountId" = ${prefix}"accountId"
          AND coverage."scopeHash" = ${prefix}"scopeHash"
          AND coverage."coveredFrom" IS NOT NULL
          AND coverage."coveredThrough" IS NOT NULL
          AND coverage."coveredFrom" <= ${prefix}"requestedFrom"
          AND coverage."coveredThrough" >= ${prefix}"requestedTo"
      )
    )
    AND NOT EXISTS (
      SELECT 1
      FROM "DataPreparationTarget" AS target
      WHERE target."currentImportRunId" = ${prefix}"id"
    )
  `;
}

function toPreparationScope(scope: AccountImportScope): PreparationScopeSnapshot {
  const speedCategories = ['BLITZ', 'RAPID'].filter((speed) => scope.speeds.includes(speed as 'BLITZ' | 'RAPID'));
  if (speedCategories.length === 0) {
    throw new Error('Account import has no games eligible for standard preparation.');
  }
  return {
    rated: scope.rated === 'BOTH' ? 'ANY' : scope.rated,
    speedCategories,
    variants: [scope.variant],
  };
}

function canonicalizePreparationScope(scope: PreparationScopeSnapshot): {
  scopeVersion: number;
  scopeHash: string;
  scope: PreparationScopeSnapshot;
} {
  const canonicalScope: PreparationScopeSnapshot = {
    ...(scope.rated === undefined ? {} : { rated: scope.rated }),
    speedCategories: [...(scope.speedCategories ?? [])],
    variants: [...(scope.variants ?? [])],
  };
  const serialized = JSON.stringify({
    scopeVersion: PREPARATION_SCOPE_VERSION,
    ...canonicalScope,
  });
  return {
    scopeVersion: PREPARATION_SCOPE_VERSION,
    scopeHash: createHash('sha256').update(serialized).digest('hex'),
    scope: canonicalScope,
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
