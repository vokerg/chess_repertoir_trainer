import { Prisma, PrismaClient } from '@prisma/client';
import type { JobRunKind } from '@chess-trainer/contracts/jobs';
import prisma from '../../prisma';
import {
  preparationBatchLimit,
  preparationLanePriority,
  readPreparationConfig,
  type PreparationConfig,
} from './preparation.config';
import {
  allowPreparationAdmission,
  type PreparationAdmissionGuard,
} from './preparation-admission.guard';
import type {
  AdmitPreparationBatchInput,
  CreatedPreparationRun,
  CreatePreparationRunInput,
  PreparationBatchAdmission,
  PreparationPurpose,
  PreparationRunStatus,
  StoredPreparationRun,
  StoredPreparationTarget,
} from './preparation.types';

const PREPARATION_ADMISSION_LOCK_KEY = 17_000_253;
const ADMITTABLE_RUN_STATUSES = ['QUEUED', 'RUNNING'] as const;
const RETRY_ADMITTABLE_RUN_STATUSES = ['RUNNING', 'NEEDS_ATTENTION'] as const;
const ACTIVE_BATCH_STATUSES = ['QUEUED', 'RUNNING'] as const;

interface RunRow {
  id: number;
  userId: number;
  purpose: PreparationPurpose;
  status: PreparationRunStatus;
  recipeVersion: number;
  retryGeneration: number;
  createdAt: Date;
  updatedAt: Date;
}

interface TargetRow {
  id: number;
  preparationRunId: number;
  accountId: number | null;
  ordinal: number;
  requestedFrom: Date;
  requestedTo: Date;
}

interface LockedTargetRow extends TargetRow {
  runStatus: string;
}

interface IdRow {
  id: number;
}

interface CountRow {
  count: number;
}

interface CandidateRow {
  id: number;
}

interface GenerationRow {
  retryGeneration: number;
}

export interface PreparationRepository {
  createRun(input: CreatePreparationRunInput): Promise<CreatedPreparationRun>;
  admitNextBatch(input: AdmitPreparationBatchInput): Promise<PreparationBatchAdmission>;
  refreshBatchSnapshotForJob(jobRunId: number): Promise<boolean>;
}

export function createPreparationRepository(
  database: PrismaClient = prisma,
  config: PreparationConfig = readPreparationConfig(),
  admissionGuard: PreparationAdmissionGuard = allowPreparationAdmission,
): PreparationRepository {
  return {
    async createRun(input) {
      validateCreateRunInput(input);

      return database.$transaction(async (transaction) => {
        if (input.retryOfRunId !== undefined && input.retryOfRunId !== null) {
          const retryRows = await transaction.$queryRaw<IdRow[]>(Prisma.sql`
            SELECT "id"
            FROM "DataPreparationRun"
            WHERE "id" = ${input.retryOfRunId}
              AND "userId" = ${input.userId}
            LIMIT 1
          `);
          if (retryRows.length !== 1) {
            throw new Error('Retry preparation run is not owned by the user.');
          }
        }

        await assertPreparationTargetsOwned(transaction, input);

        const runRows = await transaction.$queryRaw<RunRow[]>(Prisma.sql`
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
          )
          VALUES (
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
          RETURNING
            "id",
            "userId",
            "purpose",
            "status",
            "recipeVersion",
            "retryGeneration",
            "createdAt",
            "updatedAt"
        `);
        const run = runRows[0];
        if (!run) throw new Error('Preparation run creation did not return a row.');

        const targets: TargetRow[] = [];
        for (const target of [...input.targets].sort((left, right) => left.ordinal - right.ordinal)) {
          const currentImportRunId = target.currentImportRunId ?? null;
          const targetRows = await transaction.$queryRaw<TargetRow[]>(Prisma.sql`
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
            RETURNING
              "id",
              "preparationRunId",
              "accountId",
              "ordinal",
              "requestedFrom",
              "requestedTo"
          `);

          const createdTarget = targetRows[0];
          if (!createdTarget) {
            throw new Error(
              `Preparation target account ${target.accountId} or its import link is not owned by the user.`,
            );
          }
          targets.push(createdTarget);
        }

        return {
          run: toStoredRun(run),
          targets: targets.map(toStoredTarget),
        };
      });
    },

    async admitNextBatch(input) {
      const startsRetryGeneration = input.startRetryGeneration ?? false;
      if (startsRetryGeneration && input.lane !== 'RETRY') {
        throw new Error('A preparation retry generation must create a RETRY batch.');
      }

      const plannedLimit = preparationBatchLimit(config, input.stage, input.lane);
      const priority = preparationLanePriority(input.stage, input.lane);
      const kind: JobRunKind = input.stage === 'INDEX' ? 'INDEX_GAMES' : 'ANALYSE_GAMES';

      return database.$transaction(async (transaction) => {
        await transaction.$executeRaw(Prisma.sql`
          SELECT pg_advisory_xact_lock(${PREPARATION_ADMISSION_LOCK_KEY})
        `);

        const lockedRows = await transaction.$queryRaw<LockedTargetRow[]>(Prisma.sql`
          SELECT
            target."id",
            target."preparationRunId",
            target."accountId",
            target."ordinal",
            target."requestedFrom",
            target."requestedTo",
            prep_run."status" AS "runStatus"
          FROM "DataPreparationRun" AS prep_run
          JOIN "DataPreparationTarget" AS target
            ON target."preparationRunId" = prep_run."id"
          WHERE prep_run."id" = ${input.preparationRunId}
            AND prep_run."userId" = ${input.userId}
            AND target."id" = ${input.targetId}
          FOR UPDATE OF prep_run, target
        `);
        const target = lockedRows[0];
        if (!target || target.accountId === null) {
          return blocked('RUN_NOT_ADMITTABLE');
        }
        const runAdmittable = startsRetryGeneration
          ? RETRY_ADMITTABLE_RUN_STATUSES.includes(
              target.runStatus as typeof RETRY_ADMITTABLE_RUN_STATUSES[number],
            )
          : ADMITTABLE_RUN_STATUSES.includes(
              target.runStatus as typeof ADMITTABLE_RUN_STATUSES[number],
            );
        if (!runAdmittable) {
          return blocked('RUN_NOT_ADMITTABLE');
        }

        await admissionGuard.assertAllowed(transaction, {
          userId: input.userId,
          accountId: target.accountId,
        });

        const activeStageRows = await transaction.$queryRaw<CountRow[]>(Prisma.sql`
          SELECT COUNT(*)::int AS "count"
          FROM "DataPreparationBatch"
          WHERE "preparationRunId" = ${input.preparationRunId}
            AND "stage" = ${input.stage}
            AND "status" IN (${Prisma.join(ACTIVE_BATCH_STATUSES.map((status) => Prisma.sql`${status}`))})
        `);
        if ((activeStageRows[0]?.count ?? 0) > 0) {
          return blocked('ACTIVE_STAGE_BATCH');
        }

        const globalBatchRows = await transaction.$queryRaw<CountRow[]>(Prisma.sql`
          SELECT COUNT(*)::int AS "count"
          FROM "DataPreparationBatch"
          WHERE "status" IN (${Prisma.join(ACTIVE_BATCH_STATUSES.map((status) => Prisma.sql`${status}`))})
        `);
        if ((globalBatchRows[0]?.count ?? 0) >= config.maxNonTerminalBatches) {
          return blocked('GLOBAL_BATCH_CAPACITY');
        }

        const queuedTaskRows = await transaction.$queryRaw<CountRow[]>(Prisma.sql`
          SELECT COUNT(task."id")::int AS "count"
          FROM "JobTask" AS task
          JOIN "JobRun" AS job ON job."id" = task."jobRunId"
          WHERE job."source" = 'ONBOARDING'
            AND job."status" IN ('QUEUED', 'RUNNING')
            AND task."status" = 'QUEUED'
        `);
        const queuedTasks = queuedTaskRows[0]?.count ?? 0;
        const remainingTaskCapacity = config.maxQueuedTasks - queuedTasks;
        if (remainingTaskCapacity <= 0) {
          return blocked('GLOBAL_TASK_CAPACITY');
        }

        let remainingAnalysisCapacity = Number.POSITIVE_INFINITY;
        if (input.stage === 'ANALYSIS') {
          const queuedAnalysisRows = await transaction.$queryRaw<CountRow[]>(Prisma.sql`
            SELECT COUNT(task."id")::int AS "count"
            FROM "JobTask" AS task
            JOIN "JobRun" AS job ON job."id" = task."jobRunId"
            WHERE job."source" = 'ONBOARDING'
              AND job."kind" = 'ANALYSE_GAMES'
              AND job."status" IN ('QUEUED', 'RUNNING')
              AND task."status" = 'QUEUED'
          `);
          remainingAnalysisCapacity = config.maxQueuedAnalysisTasks - (queuedAnalysisRows[0]?.count ?? 0);
          if (remainingAnalysisCapacity <= 0) {
            return blocked('GLOBAL_ANALYSIS_CAPACITY');
          }
        }

        const admittedLimit = Math.min(
          plannedLimit,
          remainingTaskCapacity,
          remainingAnalysisCapacity,
        );
        if (admittedLimit <= 0) {
          return blocked(input.stage === 'ANALYSIS'
            ? 'GLOBAL_ANALYSIS_CAPACITY'
            : 'GLOBAL_TASK_CAPACITY');
        }

        const candidates = await selectCandidates(transaction, input, admittedLimit);
        if (candidates.length === 0) {
          return blocked('NO_ELIGIBLE_GAMES');
        }

        const ordinalRows = await transaction.$queryRaw<Array<{ ordinal: number }>>(Prisma.sql`
          SELECT COALESCE(MAX("ordinal") + 1, 0)::int AS "ordinal"
          FROM "DataPreparationBatch"
          WHERE "preparationRunId" = ${input.preparationRunId}
        `);
        const ordinal = ordinalRows[0]?.ordinal ?? 0;

        const batchRows = await transaction.$queryRaw<IdRow[]>(Prisma.sql`
          INSERT INTO "DataPreparationBatch" (
            "preparationRunId",
            "targetId",
            "stage",
            "lane",
            "ordinal",
            "status",
            "plannedLimit",
            "totalTasks",
            "createdAt",
            "updatedAt"
          )
          VALUES (
            ${input.preparationRunId},
            ${input.targetId},
            ${input.stage},
            ${input.lane},
            ${ordinal},
            'QUEUED',
            ${plannedLimit},
            ${candidates.length},
            NOW(),
            NOW()
          )
          RETURNING "id"
        `);
        const batchId = batchRows[0]?.id;
        if (!batchId) throw new Error('Preparation batch creation did not return a row.');

        const jobRows = await transaction.$queryRaw<IdRow[]>(Prisma.sql`
          INSERT INTO "JobRun" (
            "userId",
            "kind",
            "source",
            "priority",
            "status",
            "totalTasks",
            "force",
            "createdAt",
            "updatedAt"
          )
          VALUES (
            ${input.userId},
            ${kind},
            'ONBOARDING',
            ${priority},
            'QUEUED',
            ${candidates.length},
            ${input.force ?? false},
            NOW(),
            NOW()
          )
          RETURNING "id"
        `);
        const jobRunId = jobRows[0]?.id;
        if (!jobRunId) throw new Error('Preparation child job creation did not return a row.');

        const taskValues = Prisma.join(candidates.map((candidate, ordinal) => Prisma.sql`(
          ${jobRunId},
          ${candidate.id},
          ${ordinal},
          'QUEUED',
          NOW(),
          NOW()
        )`));
        await transaction.$executeRaw(Prisma.sql`
          INSERT INTO "JobTask" (
            "jobRunId",
            "importedGameId",
            "ordinal",
            "status",
            "createdAt",
            "updatedAt"
          )
          VALUES ${taskValues}
        `);

        await transaction.$executeRaw(Prisma.sql`
          UPDATE "DataPreparationBatch"
          SET "jobRunId" = ${jobRunId},
              "updatedAt" = NOW()
          WHERE "id" = ${batchId}
        `);

        let retryGeneration: number | undefined;
        if (startsRetryGeneration) {
          const generationRows = await transaction.$queryRaw<GenerationRow[]>(Prisma.sql`
            UPDATE "DataPreparationRun"
            SET "status" = 'RUNNING',
                "retryGeneration" = "retryGeneration" + 1,
                "attentionCode" = NULL,
                "attentionDetail" = NULL,
                "reconcileAfter" = NOW(),
                "updatedAt" = NOW()
            WHERE "id" = ${input.preparationRunId}
              AND "userId" = ${input.userId}
              AND "status" = ${target.runStatus}
            RETURNING "retryGeneration"
          `);
          retryGeneration = generationRows[0]?.retryGeneration;
          if (retryGeneration === undefined) {
            throw new Error('Preparation retry generation did not update the parent run.');
          }
        } else {
          await transaction.$executeRaw(Prisma.sql`
            UPDATE "DataPreparationRun"
            SET "status" = 'RUNNING',
                "updatedAt" = NOW()
            WHERE "id" = ${input.preparationRunId}
              AND "status" = 'QUEUED'
          `);
        }

        return {
          outcome: 'CREATED',
          batchId,
          jobRunId,
          importedGameIds: candidates.map((candidate) => candidate.id),
          plannedLimit,
          ...(retryGeneration === undefined ? {} : { retryGeneration }),
        };
      });
    },

    async refreshBatchSnapshotForJob(jobRunId) {
      const rows = await database.$queryRaw<IdRow[]>(Prisma.sql`
        UPDATE "DataPreparationBatch" AS batch
        SET "status" = job."status",
            "totalTasks" = job."totalTasks",
            "completedTasks" = counts."completedTasks",
            "skippedTasks" = counts."skippedTasks",
            "failedTasks" = counts."failedTasks",
            "cancelledTasks" = counts."cancelledTasks",
            "startedAt" = COALESCE(batch."startedAt", job."startedAt"),
            "firstSettledAt" = COALESCE(batch."firstSettledAt", counts."firstSettledAt"),
            "settledAt" = CASE
              WHEN job."status" IN ('COMPLETED', 'PARTIALLY_FAILED', 'FAILED', 'CANCELLED')
                THEN COALESCE(job."completedAt", counts."lastSettledAt", NOW())
              ELSE batch."settledAt"
            END,
            "updatedAt" = NOW()
        FROM "JobRun" AS job
        CROSS JOIN LATERAL (
          SELECT
            COUNT(*) FILTER (WHERE task."status" = 'COMPLETED')::int AS "completedTasks",
            COUNT(*) FILTER (WHERE task."status" = 'SKIPPED')::int AS "skippedTasks",
            COUNT(*) FILTER (WHERE task."status" = 'FAILED')::int AS "failedTasks",
            COUNT(*) FILTER (WHERE task."status" = 'CANCELLED')::int AS "cancelledTasks",
            MIN(task."settledAt") AS "firstSettledAt",
            MAX(task."settledAt") AS "lastSettledAt"
          FROM "JobTask" AS task
          WHERE task."jobRunId" = job."id"
        ) AS counts
        WHERE batch."jobRunId" = job."id"
          AND job."id" = ${jobRunId}
        RETURNING batch."id"
      `);
      return rows.length === 1;
    },
  };
}

export const PreparationRepository = createPreparationRepository();

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
    if (ownedRows.length !== 1) {
      throw new Error(
        `Preparation target account ${target.accountId} or its import link is not owned by the user.`,
      );
    }
  }
}

async function selectCandidates(
  transaction: Prisma.TransactionClient,
  input: AdmitPreparationBatchInput,
  limit: number,
): Promise<CandidateRow[]> {
  const retryFailed = input.retryFailed ?? input.lane === 'RETRY';
  const force = input.force ?? false;
  const stagePredicate = input.stage === 'INDEX'
    ? retryFailed
      ? Prisma.sql`
          game."plyIndexedAt" IS NULL
          AND game."plyIndexError" IS NOT NULL
        `
      : Prisma.sql`
          game."plyIndexedAt" IS NULL
          AND game."plyIndexError" IS NULL
        `
    : force
      ? Prisma.sql`game."plyIndexedAt" IS NOT NULL`
      : retryFailed
        ? Prisma.sql`
            game."plyIndexedAt" IS NOT NULL
            AND game."latestAnalysisStatus" = 'FAILED'
          `
        : Prisma.sql`
            game."plyIndexedAt" IS NOT NULL
            AND game."latestAnalysisStatus" IS NULL
          `;

  return transaction.$queryRaw<CandidateRow[]>(Prisma.sql`
    SELECT game."id"
    FROM "ImportedGame" AS game
    JOIN "DataPreparationTarget" AS target ON target."id" = ${input.targetId}
    WHERE game."userId" = ${input.userId}
      AND game."accountId" = target."accountId"
      AND game."pgn" IS NOT NULL
      AND game."endedAt" >= target."requestedFrom"
      AND game."endedAt" < target."requestedTo"
      AND (${stagePredicate})
      AND (
        NOT (target."scopeJson" ? 'rated')
        OR UPPER(target."scopeJson"->>'rated') = 'ANY'
        OR (UPPER(target."scopeJson"->>'rated') = 'RATED' AND game."rated" IS TRUE)
        OR (UPPER(target."scopeJson"->>'rated') = 'UNRATED' AND game."rated" IS FALSE)
      )
      AND (
        NOT (target."scopeJson" ? 'speedCategories')
        OR jsonb_array_length(target."scopeJson"->'speedCategories') = 0
        OR EXISTS (
          SELECT 1
          FROM jsonb_array_elements_text(target."scopeJson"->'speedCategories') AS speed(value)
          WHERE LOWER(BTRIM(speed.value)) = LOWER(BTRIM(game."speedCategory"))
        )
      )
      AND (
        NOT (target."scopeJson" ? 'variants')
        OR jsonb_array_length(target."scopeJson"->'variants') = 0
        OR EXISTS (
          SELECT 1
          FROM jsonb_array_elements_text(target."scopeJson"->'variants') AS variant(value)
          WHERE (
            LOWER(BTRIM(variant.value)) IN ('standard', 'chess')
            AND COALESCE(NULLIF(LOWER(BTRIM(game."variant")), ''), 'standard') IN ('standard', 'chess')
          ) OR (
            LOWER(BTRIM(variant.value)) NOT IN ('standard', 'chess')
            AND game."variant" IS NOT NULL
            AND LOWER(BTRIM(variant.value)) = LOWER(BTRIM(game."variant"))
          )
        )
      )
      AND NOT EXISTS (
        SELECT 1
        FROM "JobTask" AS active_task
        JOIN "JobRun" AS active_job ON active_job."id" = active_task."jobRunId"
        WHERE active_task."importedGameId" = game."id"
          AND (
            active_task."workKey" IS NOT NULL
            OR (
              active_task."status" IN ('QUEUED', 'RUNNING')
              AND active_job."status" IN ('QUEUED', 'RUNNING')
            )
          )
      )
    ORDER BY game."endedAt" DESC NULLS LAST, game."id" DESC
    FOR UPDATE OF game SKIP LOCKED
    LIMIT ${limit}
  `);
}

function validateCreateRunInput(input: CreatePreparationRunInput): void {
  if (!Number.isSafeInteger(input.userId) || input.userId <= 0) {
    throw new Error('Preparation userId must be a positive integer.');
  }
  if (!Number.isSafeInteger(input.recipeVersion) || input.recipeVersion <= 0) {
    throw new Error('Preparation recipeVersion must be a positive integer.');
  }
  if (
    input.retryGeneration !== undefined
    && (!Number.isSafeInteger(input.retryGeneration) || input.retryGeneration < 0)
  ) {
    throw new Error('Preparation retryGeneration must be a non-negative integer.');
  }
  if (input.targets.length === 0) {
    throw new Error('A preparation run requires at least one target.');
  }

  const accountIds = new Set<number>();
  const ordinals = new Set<number>();
  for (const target of input.targets) {
    if (!Number.isSafeInteger(target.accountId) || target.accountId <= 0) {
      throw new Error('Preparation target accountId must be a positive integer.');
    }
    if (!Number.isSafeInteger(target.ordinal) || target.ordinal < 0) {
      throw new Error('Preparation target ordinal must be a non-negative integer.');
    }
    if (!Number.isSafeInteger(target.scopeVersion) || target.scopeVersion <= 0) {
      throw new Error('Preparation target scopeVersion must be a positive integer.');
    }
    if (target.scopeHash.length !== 64) {
      throw new Error('Preparation target scopeHash must contain 64 characters.');
    }
    validateScopeSnapshot(target.scope);
    if (target.requestedFrom >= target.requestedTo) {
      throw new Error('Preparation target range must be a non-empty half-open interval.');
    }
    if (accountIds.has(target.accountId)) {
      throw new Error(`Duplicate preparation target account ${target.accountId}.`);
    }
    if (ordinals.has(target.ordinal)) {
      throw new Error(`Duplicate preparation target ordinal ${target.ordinal}.`);
    }
    accountIds.add(target.accountId);
    ordinals.add(target.ordinal);
  }
}

function validateScopeSnapshot(scope: unknown): void {
  if (!scope || typeof scope !== 'object' || Array.isArray(scope)) {
    throw new Error('Preparation target scope must be an object.');
  }

  const candidate = scope as {
    rated?: unknown;
    speedCategories?: unknown;
    variants?: unknown;
  };
  if (
    candidate.rated !== undefined
    && !['ANY', 'RATED', 'UNRATED'].includes(String(candidate.rated).toUpperCase())
  ) {
    throw new Error('Preparation target rated scope is invalid.');
  }
  validateStringArray(candidate.speedCategories, 'speedCategories');
  validateStringArray(candidate.variants, 'variants');
}

function validateStringArray(value: unknown, field: string): void {
  if (value === undefined) return;
  if (
    !Array.isArray(value)
    || value.some((item) => typeof item !== 'string' || item.trim().length === 0)
  ) {
    throw new Error(`Preparation target ${field} must contain non-empty strings.`);
  }
}

function toStoredRun(row: RunRow): StoredPreparationRun {
  return { ...row };
}

function toStoredTarget(row: TargetRow): StoredPreparationTarget {
  return { ...row };
}

function blocked(
  reason: Exclude<PreparationBatchAdmission, { outcome: 'CREATED' }>['reason'],
): PreparationBatchAdmission {
  return { outcome: 'BLOCKED', reason };
}
