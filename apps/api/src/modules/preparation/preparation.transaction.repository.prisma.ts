import { Prisma } from '@prisma/client';
import type { CreatePreparationRunInput } from './preparation.types';

interface IdRow {
  id: number;
}

/**
 * Transaction-scoped preparation persistence for coordinators that must make
 * linked durable work visible atomically. Preparation remains the owner of the
 * DataPreparationRun/DataPreparationTarget write shape and ownership checks.
 */
export async function createPreparationRunInTransaction(
  transaction: Prisma.TransactionClient,
  input: CreatePreparationRunInput,
): Promise<number> {
  validateCreateInput(input);

  if (input.retryOfRunId != null) {
    const retryRows = await transaction.$queryRaw<IdRow[]>(Prisma.sql`
      SELECT "id"
      FROM "DataPreparationRun"
      WHERE "id" = ${input.retryOfRunId}
        AND "userId" = ${input.userId}
      LIMIT 1
    `);
    if (!retryRows[0]) throw new Error('Retry preparation run is not owned by the user.');
  }

  await assertPreparationTargetsOwned(transaction, input);

  const runRows = await transaction.$queryRaw<IdRow[]>(Prisma.sql`
    INSERT INTO "DataPreparationRun" (
      "userId",
      "purpose",
      "status",
      "recipeVersion",
      "recipeJson",
      "retryOfRunId",
      "retryGeneration",
      "createdAt",
      "updatedAt"
    ) VALUES (
      ${input.userId},
      ${input.purpose},
      'QUEUED',
      ${input.recipeVersion},
      ${JSON.stringify(input.recipe)}::jsonb,
      ${input.retryOfRunId ?? null},
      ${input.retryGeneration ?? 0},
      NOW(),
      NOW()
    )
    RETURNING "id"
  `);
  const run = runRows[0];
  if (!run) throw new Error('Preparation transaction persistence did not return a run.');

  for (const target of [...input.targets].sort((left, right) => left.ordinal - right.ordinal)) {
    const currentImportRunId = target.currentImportRunId ?? null;
    const targetRows = await transaction.$queryRaw<IdRow[]>(Prisma.sql`
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
      SELECT
        ${run.id},
        account."id",
        account."provider",
        account."username",
        ${target.ordinal},
        ${target.scopeVersion},
        ${target.scopeHash},
        ${JSON.stringify(target.scope)}::jsonb,
        ${target.requestedFrom},
        ${target.requestedTo},
        ${currentImportRunId},
        NOW(),
        NOW()
      FROM "ExternalAccount" AS account
      WHERE account."id" = ${target.accountId}
        AND account."userId" = ${input.userId}
        AND (
          ${currentImportRunId}::int IS NULL
          OR EXISTS (
            SELECT 1
            FROM "ImportRun" AS import_run
            WHERE import_run."id" = ${currentImportRunId}
              AND import_run."userId" = ${input.userId}
              AND import_run."accountId" = account."id"
          )
        )
      RETURNING "id"
    `);
    if (!targetRows[0]) {
      throw new Error(
        `Preparation target account ${target.accountId} or its import link is not owned by the user.`,
      );
    }
  }

  return run.id;
}

export async function relinkPreparationTargetImportInTransaction(
  transaction: Prisma.TransactionClient,
  input: {
    userId: number;
    preparationRunId: number;
    targetId: number;
    previousImportRunId: number;
    nextImportRunId: number;
  },
): Promise<boolean> {
  validatePositiveInteger(input.userId, 'userId');
  validatePositiveInteger(input.preparationRunId, 'preparationRunId');
  validatePositiveInteger(input.targetId, 'targetId');
  validatePositiveInteger(input.previousImportRunId, 'previousImportRunId');
  validatePositiveInteger(input.nextImportRunId, 'nextImportRunId');

  const updated = await transaction.$executeRaw(Prisma.sql`
    UPDATE "DataPreparationTarget" AS target
    SET "currentImportRunId" = ${input.nextImportRunId},
        "updatedAt" = NOW()
    FROM "DataPreparationRun" AS run
    WHERE target."id" = ${input.targetId}
      AND target."preparationRunId" = ${input.preparationRunId}
      AND target."currentImportRunId" = ${input.previousImportRunId}
      AND run."id" = target."preparationRunId"
      AND run."userId" = ${input.userId}
      AND EXISTS (
        SELECT 1
        FROM "ImportRun" AS next_import
        WHERE next_import."id" = ${input.nextImportRunId}
          AND next_import."userId" = ${input.userId}
          AND next_import."accountId" = target."accountId"
      )
  `);
  return updated === 1;
}

async function assertPreparationTargetsOwned(
  transaction: Prisma.TransactionClient,
  input: CreatePreparationRunInput,
): Promise<void> {
  for (const target of input.targets) {
    const currentImportRunId = target.currentImportRunId ?? null;
    const ownedRows = await transaction.$queryRaw<IdRow[]>(Prisma.sql`
      SELECT account."id"
      FROM "ExternalAccount" AS account
      WHERE account."id" = ${target.accountId}
        AND account."userId" = ${input.userId}
        AND (
          ${currentImportRunId}::int IS NULL
          OR EXISTS (
            SELECT 1
            FROM "ImportRun" AS import_run
            WHERE import_run."id" = ${currentImportRunId}
              AND import_run."userId" = ${input.userId}
              AND import_run."accountId" = account."id"
          )
        )
      LIMIT 1
    `);
    if (!ownedRows[0]) {
      throw new Error(
        `Preparation target account ${target.accountId} or its import link is not owned by the user.`,
      );
    }
  }
}

function validateCreateInput(input: CreatePreparationRunInput): void {
  validatePositiveInteger(input.userId, 'userId');
  if (!['ONBOARDING', 'EXPANSION', 'RECOVERY'].includes(input.purpose)) {
    throw new Error(`Unsupported preparation purpose: ${input.purpose}`);
  }
  if (!Number.isSafeInteger(input.recipeVersion) || input.recipeVersion <= 0) {
    throw new Error('Preparation recipeVersion must be a positive integer.');
  }
  if (input.targets.length === 0) throw new Error('Preparation run requires at least one target.');
  const ordinals = input.targets.map((target) => target.ordinal);
  if (new Set(ordinals).size !== ordinals.length) {
    throw new Error('Preparation target ordinals must be unique.');
  }
}

function validatePositiveInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`${label} must be a positive integer.`);
}