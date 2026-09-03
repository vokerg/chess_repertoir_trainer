import { Prisma, PrismaClient } from '@prisma/client';
import prisma from '../../prisma';
import {
  POSITION_CLEANUP_MIN_POSTGRES_SERVER_VERSION_NUM,
} from './position-cleanup.config';
import {
  POSITION_CLEANUP_TABLE_LOCK_ORDER,
  type CreatePositionCleanupRunInput,
  type PositionCleanupBatchResult,
  type PositionCleanupDeleteBatchResult,
  type PositionCleanupRun,
} from './position-cleanup.types';

interface MaxIdRow {
  maxId: number;
}

interface ServerVersionRow {
  serverVersionNum: number;
}

interface BatchSummaryRow {
  inspected: number;
  matched: number;
  checkpoint: number;
}

interface ObservationSummaryRow extends BatchSummaryRow {
  firstObserved: number;
  refreshed: number;
}

interface DeleteSummaryRow extends BatchSummaryRow {
  deleted: number;
  analysisRowsDeleted: number;
  cacheRowsDeleted: number;
  skippedReferenced: number;
}

export class PositionCleanupInvalidStateError extends Error {}
export class PositionCleanupUnsupportedDatabaseError extends Error {}

export interface PositionCleanupRepository {
  assertDatabaseCapability(): Promise<number>;
  createRun(input: CreatePositionCleanupRunInput): Promise<PositionCleanupRun>;
  getRun(runId: number): Promise<PositionCleanupRun | null>;
  claimNext(workKey: string): Promise<PositionCleanupRun | null>;
  releaseClaim(runId: number, workKey: string): Promise<boolean>;
  heartbeat(runId: number, workKey: string): Promise<boolean>;
  recoverStaleClaims(staleBefore: Date): Promise<number>;
  requestCancel(runId: number): Promise<PositionCleanupRun>;
  settleCancellation(runId: number, workKey: string): Promise<boolean>;
  reconcileBatch(runId: number, workKey: string): Promise<PositionCleanupBatchResult>;
  observeBatch(runId: number, workKey: string): Promise<PositionCleanupBatchResult>;
  evaluateDryRunBatch(runId: number, workKey: string): Promise<PositionCleanupBatchResult>;
  executeDeleteBatch(runId: number, workKey: string): Promise<PositionCleanupDeleteBatchResult>;
  recordLockTimeout(runId: number, workKey: string, maxRetries: number): Promise<void>;
  failClaimed(runId: number, workKey: string, errorCode: string): Promise<void>;
}

export function createPositionCleanupRepository(
  database: PrismaClient = prisma,
): PositionCleanupRepository {
  return {
    async assertDatabaseCapability() {
      const rows = await database.$queryRaw<ServerVersionRow[]>(Prisma.sql`
        SELECT current_setting('server_version_num')::int AS "serverVersionNum"
      `);
      const serverVersionNum = rows[0]?.serverVersionNum ?? 0;
      if (serverVersionNum < POSITION_CLEANUP_MIN_POSTGRES_SERVER_VERSION_NUM) {
        throw new PositionCleanupUnsupportedDatabaseError(
          `Position cleanup requires PostgreSQL server_version_num >= ${POSITION_CLEANUP_MIN_POSTGRES_SERVER_VERSION_NUM}; received ${serverVersionNum}.`,
        );
      }
      return serverVersionNum;
    },

    async createRun(input) {
      validateCreateRunInput(input);
      return database.$transaction(async (transaction) => {
        const reconcileUpperBound = await maxId(
          transaction,
          Prisma.sql`SELECT COALESCE(MAX("positionId"), 0)::int AS "maxId" FROM "PositionCleanupCandidate"`,
        );
        const positionUpperBound = await maxId(
          transaction,
          Prisma.sql`SELECT COALESCE(MAX("id"), 0)::int AS "maxId" FROM "ImportedGamePosition"`,
        );
        const rows = await transaction.$queryRaw<PositionCleanupRun[]>(Prisma.sql`
          INSERT INTO "PositionCleanupRun" (
            "mode", "policyVersion", "graceDays", "graceCutoff",
            "inputPageSize", "deleteBatchSize", "lockTimeoutMs", "requestedBy",
            "reconcileUpperBound", "positionUpperBound", "updatedAt"
          ) VALUES (
            ${input.mode}, ${input.policyVersion}, ${input.graceDays}, ${input.graceCutoff},
            ${input.inputPageSize}, ${input.deleteBatchSize}, ${input.lockTimeoutMs}, ${input.requestedBy},
            ${reconcileUpperBound}, ${positionUpperBound}, NOW()
          )
          RETURNING *
        `);
        const run = rows[0];
        if (!run) throw new Error('Position cleanup run was not returned after creation.');
        return run;
      });
    },

    async getRun(runId) {
      validateRunId(runId);
      const rows = await database.$queryRaw<PositionCleanupRun[]>(Prisma.sql`
        SELECT * FROM "PositionCleanupRun" WHERE "id" = ${runId}
      `);
      return rows[0] ?? null;
    },

    async claimNext(workKey) {
      validateWorkKey(workKey);
      const rows = await database.$queryRaw<PositionCleanupRun[]>(Prisma.sql`
        WITH candidate AS (
          SELECT "id"
          FROM "PositionCleanupRun"
          WHERE "status" IN ('QUEUED', 'RUNNING')
            AND "workKey" IS NULL
          ORDER BY "updatedAt" ASC, "id" ASC
          FOR UPDATE SKIP LOCKED
          LIMIT 1
        )
        UPDATE "PositionCleanupRun" AS run
        SET "status" = 'RUNNING',
            "workKey" = ${workKey},
            "claimedAt" = NOW(),
            "heartbeatAt" = NOW(),
            "startedAt" = COALESCE(run."startedAt", NOW()),
            "updatedAt" = NOW()
        FROM candidate
        WHERE run."id" = candidate."id"
          AND run."workKey" IS NULL
        RETURNING run.*
      `);
      return rows[0] ?? null;
    },

    async releaseClaim(runId, workKey) {
      validateRunId(runId);
      validateWorkKey(workKey);
      return (await database.$executeRaw(Prisma.sql`
        UPDATE "PositionCleanupRun"
        SET "workKey" = NULL,
            "claimedAt" = NULL,
            "heartbeatAt" = NULL,
            "updatedAt" = NOW()
        WHERE "id" = ${runId}
          AND "workKey" = ${workKey}
          AND "status" = 'RUNNING'
      `)) === 1;
    },

    async heartbeat(runId, workKey) {
      validateRunId(runId);
      validateWorkKey(workKey);
      return (await database.$executeRaw(Prisma.sql`
        UPDATE "PositionCleanupRun"
        SET "heartbeatAt" = NOW(), "updatedAt" = NOW()
        WHERE "id" = ${runId}
          AND "workKey" = ${workKey}
          AND "status" = 'RUNNING'
      `)) === 1;
    },

    async recoverStaleClaims(staleBefore) {
      validateDate(staleBefore, 'staleBefore');
      return database.$executeRaw(Prisma.sql`
        UPDATE "PositionCleanupRun"
        SET "workKey" = NULL,
            "claimedAt" = NULL,
            "heartbeatAt" = NULL,
            "staleRecoveryCount" = "staleRecoveryCount" + 1,
            "updatedAt" = NOW()
        WHERE "status" = 'RUNNING'
          AND "workKey" IS NOT NULL
          AND COALESCE("heartbeatAt", "claimedAt") < ${staleBefore}
      `);
    },

    async requestCancel(runId) {
      validateRunId(runId);
      const rows = await database.$queryRaw<PositionCleanupRun[]>(Prisma.sql`
        UPDATE "PositionCleanupRun"
        SET "cancelRequestedAt" = COALESCE("cancelRequestedAt", NOW()),
            "updatedAt" = NOW()
        WHERE "id" = ${runId}
          AND "status" IN ('QUEUED', 'RUNNING')
        RETURNING *
      `);
      const run = rows[0];
      if (!run) throw new PositionCleanupInvalidStateError('Only a non-terminal cleanup run can be cancelled.');
      return run;
    },

    async settleCancellation(runId, workKey) {
      validateRunId(runId);
      validateWorkKey(workKey);
      return (await database.$executeRaw(Prisma.sql`
        UPDATE "PositionCleanupRun"
        SET "status" = 'CANCELLED',
            "phase" = 'DONE',
            "terminalResult" = 'CANCELLED',
            "completedAt" = NOW(),
            "workKey" = NULL,
            "claimedAt" = NULL,
            "heartbeatAt" = NULL,
            "updatedAt" = NOW()
        WHERE "id" = ${runId}
          AND "workKey" = ${workKey}
          AND "status" = 'RUNNING'
          AND "cancelRequestedAt" IS NOT NULL
      `)) === 1;
    },

    async reconcileBatch(runId, workKey) {
      return database.$transaction(async (transaction) => {
        const run = await lockClaimedRun(transaction, runId, workKey, 'RECONCILE');
        const rows = await transaction.$queryRaw<BatchSummaryRow[]>(Prisma.sql`
          WITH input AS MATERIALIZED (
            SELECT "positionId"
            FROM "PositionCleanupCandidate"
            WHERE "positionId" > ${run.reconcileAfterPositionId}
              AND "positionId" <= ${run.reconcileUpperBound}
            ORDER BY "positionId" ASC
            LIMIT ${run.inputPageSize}
          ), deleted AS (
            DELETE FROM "PositionCleanupCandidate" AS candidate
            USING input
            WHERE candidate."positionId" = input."positionId"
              AND EXISTS (
                SELECT 1 FROM "ImportedGamePly" AS ply
                WHERE ply."positionId" = input."positionId"
              )
            RETURNING candidate."positionId"
          )
          SELECT
            COUNT(input."positionId")::int AS "inspected",
            (SELECT COUNT(*)::int FROM deleted) AS "matched",
            COALESCE(MAX(input."positionId"), ${run.reconcileAfterPositionId})::int AS "checkpoint"
          FROM input
        `);
        const summary = requiredSummary(rows[0]);
        if (summary.inspected === 0) {
          await updateClaimedRun(transaction, runId, workKey, Prisma.sql`
            "phase" = 'OBSERVE', "lastBatchAt" = NOW()
          `);
          return { ...summary, completedPhase: true };
        }
        await updateClaimedRun(transaction, runId, workKey, Prisma.sql`
          "reconcileAfterPositionId" = ${summary.checkpoint},
          "candidatesInspected" = "candidatesInspected" + ${summary.inspected},
          "candidatesReconciled" = "candidatesReconciled" + ${summary.matched},
          "lastBatchAt" = NOW()
        `);
        return { ...summary, completedPhase: false };
      });
    },

    async observeBatch(runId, workKey) {
      return database.$transaction(async (transaction) => {
        const run = await lockClaimedRun(transaction, runId, workKey, 'OBSERVE');
        const rows = await transaction.$queryRaw<ObservationSummaryRow[]>(Prisma.sql`
          WITH input AS MATERIALIZED (
            SELECT "id"
            FROM "ImportedGamePosition"
            WHERE "id" > ${run.observeAfterPositionId}
              AND "id" <= ${run.positionUpperBound}
            ORDER BY "id" ASC
            LIMIT ${run.inputPageSize}
          ), eligible AS MATERIALIZED (
            SELECT input."id"
            FROM input
            WHERE NOT EXISTS (
              SELECT 1 FROM "ImportedGamePly" AS ply
              WHERE ply."positionId" = input."id"
            )
          ), existing AS MATERIALIZED (
            SELECT candidate."positionId"
            FROM "PositionCleanupCandidate" AS candidate
            JOIN eligible ON eligible."id" = candidate."positionId"
          ), upserted AS (
            INSERT INTO "PositionCleanupCandidate" (
              "positionId", "firstObservedOrphanAt", "lastObservedOrphanAt"
            )
            SELECT eligible."id", NOW(), NOW()
            FROM eligible
            ON CONFLICT ("positionId") DO UPDATE
              SET "lastObservedOrphanAt" = EXCLUDED."lastObservedOrphanAt"
            RETURNING "positionId"
          )
          SELECT
            COUNT(input."id")::int AS "inspected",
            (SELECT COUNT(*)::int FROM eligible) AS "matched",
            COALESCE(MAX(input."id"), ${run.observeAfterPositionId})::int AS "checkpoint",
            ((SELECT COUNT(*) FROM eligible) - (SELECT COUNT(*) FROM existing))::int AS "firstObserved",
            (SELECT COUNT(*)::int FROM existing) AS "refreshed"
          FROM input
        `);
        const summary = rows[0];
        if (!summary) throw new Error('Position cleanup observation summary was not returned.');
        if (summary.inspected === 0) {
          const evaluationUpperBound = await maxId(
            transaction,
            Prisma.sql`SELECT COALESCE(MAX("positionId"), 0)::int AS "maxId" FROM "PositionCleanupCandidate"`,
          );
          await updateClaimedRun(transaction, runId, workKey, Prisma.sql`
            "phase" = 'EVALUATE',
            "evaluationUpperBound" = ${evaluationUpperBound},
            "observationStartedAt" = CASE WHEN "mode" = 'DRY_RUN' THEN NOW() ELSE "observationStartedAt" END,
            "lastBatchAt" = NOW()
          `);
          return { inspected: 0, matched: 0, checkpoint: run.observeAfterPositionId, completedPhase: true };
        }
        await updateClaimedRun(transaction, runId, workKey, Prisma.sql`
          "observeAfterPositionId" = ${summary.checkpoint},
          "positionsInspected" = "positionsInspected" + ${summary.inspected},
          "orphansObserved" = "orphansObserved" + ${summary.matched},
          "lastBatchAt" = NOW()
        `);
        return {
          inspected: summary.inspected,
          matched: summary.matched,
          checkpoint: summary.checkpoint,
          completedPhase: false,
        };
      });
    },

    async evaluateDryRunBatch(runId, workKey) {
      return database.$transaction(async (transaction) => {
        const run = await lockClaimedRun(transaction, runId, workKey, 'EVALUATE', 'DRY_RUN');
        const upperBound = requireEvaluationUpperBound(run);
        const rows = await transaction.$queryRaw<BatchSummaryRow[]>(Prisma.sql`
          WITH input AS MATERIALIZED (
            SELECT "positionId", "firstObservedOrphanAt"
            FROM "PositionCleanupCandidate"
            WHERE "positionId" > ${run.evaluateAfterPositionId}
              AND "positionId" <= ${upperBound}
            ORDER BY "positionId" ASC
            LIMIT ${run.inputPageSize}
          ), eligible AS MATERIALIZED (
            SELECT input."positionId"
            FROM input
            WHERE input."firstObservedOrphanAt" <= ${run.graceCutoff}
              AND NOT EXISTS (
                SELECT 1 FROM "ImportedGamePly" AS ply
                WHERE ply."positionId" = input."positionId"
              )
          )
          SELECT
            COUNT(input."positionId")::int AS "inspected",
            (SELECT COUNT(*)::int FROM eligible) AS "matched",
            COALESCE(MAX(input."positionId"), ${run.evaluateAfterPositionId})::int AS "checkpoint"
          FROM input
        `);
        const summary = requiredSummary(rows[0]);
        if (summary.inspected === 0) {
          await completeClaimedRun(transaction, runId, workKey, 'OBSERVATIONAL', Prisma.sql`
            "observationCompletedAt" = NOW()
          `);
          return { ...summary, completedPhase: true };
        }
        await updateClaimedRun(transaction, runId, workKey, Prisma.sql`
          "evaluateAfterPositionId" = ${summary.checkpoint},
          "candidatesInspected" = "candidatesInspected" + ${summary.inspected},
          "eligibleObserved" = "eligibleObserved" + ${summary.matched},
          "lastBatchAt" = NOW()
        `);
        return { ...summary, completedPhase: false };
      });
    },

    async executeDeleteBatch(runId, workKey) {
      return database.$transaction(async (transaction) => {
        const preflight = await readClaimedRun(transaction, runId, workKey);
        if (preflight.mode !== 'EXECUTE' || preflight.phase !== 'EVALUATE') {
          throw new PositionCleanupInvalidStateError('Cleanup execute batch requires an EXECUTE run in EVALUATE.');
        }
        await transaction.$queryRaw(Prisma.sql`
          SELECT set_config('lock_timeout', ${`${preflight.lockTimeoutMs}ms`}, true)
        `);
        await lockCleanupTables(transaction);
        const run = await lockClaimedRun(transaction, runId, workKey, 'EVALUATE', 'EXECUTE');
        const upperBound = requireEvaluationUpperBound(run);
        const rows = await transaction.$queryRaw<DeleteSummaryRow[]>(Prisma.sql`
          WITH input AS MATERIALIZED (
            SELECT "positionId", "firstObservedOrphanAt"
            FROM "PositionCleanupCandidate"
            WHERE "positionId" > ${run.evaluateAfterPositionId}
              AND "positionId" <= ${upperBound}
            ORDER BY "positionId" ASC
            LIMIT ${run.deleteBatchSize}
          ), graced AS MATERIALIZED (
            SELECT input."positionId"
            FROM input
            WHERE input."firstObservedOrphanAt" <= ${run.graceCutoff}
          ), eligible AS MATERIALIZED (
            SELECT graced."positionId"
            FROM graced
            WHERE NOT EXISTS (
              SELECT 1 FROM "ImportedGamePly" AS ply
              WHERE ply."positionId" = graced."positionId"
            )
          ), dependent AS MATERIALIZED (
            SELECT
              (SELECT COUNT(*) FROM "PositionAnalysis" AS analysis JOIN eligible ON eligible."positionId" = analysis."positionId")::int AS "analysisRowsDeleted",
              (SELECT COUNT(*) FROM "MastersExplorerCache" AS cache JOIN eligible ON eligible."positionId" = cache."positionId")::int AS "cacheRowsDeleted"
          ), deleted AS (
            DELETE FROM "ImportedGamePosition" AS position
            USING eligible
            WHERE position."id" = eligible."positionId"
              AND NOT EXISTS (
                SELECT 1 FROM "ImportedGamePly" AS final_ply
                WHERE final_ply."positionId" = position."id"
              )
            RETURNING position."id"
          )
          SELECT
            (SELECT COUNT(*)::int FROM input) AS "inspected",
            (SELECT COUNT(*)::int FROM eligible) AS "matched",
            COALESCE((SELECT MAX("positionId") FROM input), ${run.evaluateAfterPositionId})::int AS "checkpoint",
            (SELECT COUNT(*)::int FROM deleted) AS "deleted",
            dependent."analysisRowsDeleted" AS "analysisRowsDeleted",
            dependent."cacheRowsDeleted" AS "cacheRowsDeleted",
            ((SELECT COUNT(*) FROM graced) - (SELECT COUNT(*) FROM eligible))::int AS "skippedReferenced"
          FROM dependent
        `);
        const summary = rows[0];
        if (!summary) throw new Error('Position cleanup delete summary was not returned.');
        if (summary.inspected === 0) {
          await completeClaimedRun(transaction, runId, workKey, 'EXECUTED');
          return { ...summary, completedPhase: true };
        }
        await updateClaimedRun(transaction, runId, workKey, Prisma.sql`
          "evaluateAfterPositionId" = ${summary.checkpoint},
          "candidatesInspected" = "candidatesInspected" + ${summary.inspected},
          "positionsDeleted" = "positionsDeleted" + ${summary.deleted},
          "analysisRowsDeleted" = "analysisRowsDeleted" + ${summary.analysisRowsDeleted},
          "cacheRowsDeleted" = "cacheRowsDeleted" + ${summary.cacheRowsDeleted},
          "skippedReferenced" = "skippedReferenced" + ${summary.skippedReferenced},
          "lastBatchAt" = NOW(),
          "errorCode" = NULL
        `);
        return { ...summary, completedPhase: false };
      });
    },

    async recordLockTimeout(runId, workKey, maxRetries) {
      validateRunId(runId);
      validateWorkKey(workKey);
      if (!Number.isSafeInteger(maxRetries) || maxRetries <= 0) throw new Error('maxRetries must be a positive integer.');
      const updated = await database.$executeRaw(Prisma.sql`
        UPDATE "PositionCleanupRun"
        SET "retryCount" = "retryCount" + 1,
            "errorCode" = 'POSITION_CLEANUP_LOCK_TIMEOUT',
            "status" = CASE WHEN "retryCount" + 1 >= ${maxRetries} THEN 'NEEDS_ATTENTION' ELSE "status" END,
            "phase" = CASE WHEN "retryCount" + 1 >= ${maxRetries} THEN 'DONE' ELSE "phase" END,
            "terminalResult" = CASE WHEN "retryCount" + 1 >= ${maxRetries} THEN 'NEEDS_ATTENTION' ELSE NULL END,
            "completedAt" = CASE WHEN "retryCount" + 1 >= ${maxRetries} THEN NOW() ELSE NULL END,
            "workKey" = NULL,
            "claimedAt" = NULL,
            "heartbeatAt" = NULL,
            "updatedAt" = NOW()
        WHERE "id" = ${runId}
          AND "workKey" = ${workKey}
          AND "status" = 'RUNNING'
      `);
      if (updated !== 1) throw new PositionCleanupInvalidStateError('Cleanup lock-timeout settlement lost its work key.');
    },

    async failClaimed(runId, workKey, errorCode) {
      validateRunId(runId);
      validateWorkKey(workKey);
      validateErrorCode(errorCode);
      const updated = await database.$executeRaw(Prisma.sql`
        UPDATE "PositionCleanupRun"
        SET "status" = 'FAILED',
            "phase" = 'DONE',
            "terminalResult" = 'FAILED',
            "errorCode" = ${errorCode},
            "completedAt" = NOW(),
            "workKey" = NULL,
            "claimedAt" = NULL,
            "heartbeatAt" = NULL,
            "updatedAt" = NOW()
        WHERE "id" = ${runId}
          AND "workKey" = ${workKey}
          AND "status" = 'RUNNING'
      `);
      if (updated !== 1) throw new PositionCleanupInvalidStateError('Cleanup failure settlement lost its work key.');
    },
  };
}

async function maxId(transaction: Prisma.TransactionClient, query: Prisma.Sql): Promise<number> {
  const rows = await transaction.$queryRaw<MaxIdRow[]>(query);
  return rows[0]?.maxId ?? 0;
}

async function readClaimedRun(
  transaction: Prisma.TransactionClient,
  runId: number,
  workKey: string,
): Promise<PositionCleanupRun> {
  validateRunId(runId);
  validateWorkKey(workKey);
  const rows = await transaction.$queryRaw<PositionCleanupRun[]>(Prisma.sql`
    SELECT *
    FROM "PositionCleanupRun"
    WHERE "id" = ${runId}
      AND "workKey" = ${workKey}
      AND "status" = 'RUNNING'
  `);
  const run = rows[0];
  if (!run) throw new PositionCleanupInvalidStateError('Cleanup run is not owned by the expected work key.');
  return run;
}

async function lockClaimedRun(
  transaction: Prisma.TransactionClient,
  runId: number,
  workKey: string,
  phase: PositionCleanupRun['phase'],
  mode?: PositionCleanupRun['mode'],
): Promise<PositionCleanupRun> {
  validateRunId(runId);
  validateWorkKey(workKey);
  const rows = await transaction.$queryRaw<PositionCleanupRun[]>(Prisma.sql`
    SELECT *
    FROM "PositionCleanupRun"
    WHERE "id" = ${runId}
      AND "workKey" = ${workKey}
      AND "status" = 'RUNNING'
    FOR UPDATE
  `);
  const run = rows[0];
  if (!run) throw new PositionCleanupInvalidStateError('Cleanup run is not owned by the expected work key.');
  if (run.cancelRequestedAt !== null) {
    throw new PositionCleanupInvalidStateError('Cleanup cancellation must be settled between batches.');
  }
  if (run.phase !== phase || (mode !== undefined && run.mode !== mode)) {
    throw new PositionCleanupInvalidStateError(`Cleanup run is not in the expected ${mode ?? ''} ${phase} state.`.trim());
  }
  return run;
}

async function updateClaimedRun(
  transaction: Prisma.TransactionClient,
  runId: number,
  workKey: string,
  assignments: Prisma.Sql,
): Promise<void> {
  const updated = await transaction.$executeRaw(Prisma.sql`
    UPDATE "PositionCleanupRun"
    SET ${assignments}, "updatedAt" = NOW()
    WHERE "id" = ${runId}
      AND "workKey" = ${workKey}
      AND "status" = 'RUNNING'
      AND "cancelRequestedAt" IS NULL
  `);
  if (updated !== 1) throw new PositionCleanupInvalidStateError('Cleanup batch lost its exact work-key fence.');
}

async function completeClaimedRun(
  transaction: Prisma.TransactionClient,
  runId: number,
  workKey: string,
  terminalResult: 'OBSERVATIONAL' | 'EXECUTED',
  extraAssignments: Prisma.Sql = Prisma.sql`"lastBatchAt" = NOW()`,
): Promise<void> {
  const updated = await transaction.$executeRaw(Prisma.sql`
    UPDATE "PositionCleanupRun"
    SET "status" = 'COMPLETED',
        "phase" = 'DONE',
        "terminalResult" = ${terminalResult},
        "completedAt" = NOW(),
        "workKey" = NULL,
        "claimedAt" = NULL,
        "heartbeatAt" = NULL,
        ${extraAssignments},
        "updatedAt" = NOW()
    WHERE "id" = ${runId}
      AND "workKey" = ${workKey}
      AND "status" = 'RUNNING'
      AND "cancelRequestedAt" IS NULL
  `);
  if (updated !== 1) throw new PositionCleanupInvalidStateError('Cleanup completion lost its exact work-key fence.');
}

async function lockCleanupTables(transaction: Prisma.TransactionClient): Promise<void> {
  for (const table of POSITION_CLEANUP_TABLE_LOCK_ORDER) {
    await transaction.$executeRaw(Prisma.sql`
      LOCK TABLE ${Prisma.raw(`"${table}"`)} IN SHARE ROW EXCLUSIVE MODE
    `);
  }
}

function requireEvaluationUpperBound(run: PositionCleanupRun): number {
  if (run.evaluationUpperBound === null) {
    throw new PositionCleanupInvalidStateError('Cleanup evaluation upper bound has not been snapshotted.');
  }
  return run.evaluationUpperBound;
}

function requiredSummary(summary: BatchSummaryRow | undefined): BatchSummaryRow {
  if (!summary) throw new Error('Position cleanup batch summary was not returned.');
  return summary;
}

function validateCreateRunInput(input: CreatePositionCleanupRunInput): void {
  if (input.mode !== 'DRY_RUN' && input.mode !== 'EXECUTE') throw new Error('Invalid position cleanup mode.');
  if (!input.policyVersion.trim() || input.policyVersion.length > 24) throw new Error('Invalid cleanup policyVersion.');
  if (!Number.isSafeInteger(input.graceDays) || input.graceDays < 30) throw new Error('Cleanup graceDays must be at least 30.');
  if (!Number.isSafeInteger(input.inputPageSize) || input.inputPageSize < 1 || input.inputPageSize > 500) {
    throw new Error('Cleanup inputPageSize must be between 1 and 500.');
  }
  if (
    !Number.isSafeInteger(input.deleteBatchSize)
    || input.deleteBatchSize < 1
    || input.deleteBatchSize > input.inputPageSize
  ) {
    throw new Error('Cleanup deleteBatchSize must be between 1 and inputPageSize.');
  }
  if (!Number.isSafeInteger(input.lockTimeoutMs) || input.lockTimeoutMs < 1 || input.lockTimeoutMs > 5000) {
    throw new Error('Cleanup lockTimeoutMs must be between 1 and 5000.');
  }
  if (!input.requestedBy.trim() || input.requestedBy.length > 80) throw new Error('Invalid cleanup requestedBy value.');
  validateDate(input.graceCutoff, 'graceCutoff');
}

function validateRunId(value: number): void {
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error('runId must be a positive integer.');
}

function validateWorkKey(value: string): void {
  if (!value.trim() || value.length > 80) throw new Error('Cleanup workKey must contain 1-80 characters.');
}

function validateErrorCode(value: string): void {
  if (!value.trim() || value.length > 120) throw new Error('Cleanup errorCode must contain 1-120 characters.');
}

function validateDate(value: Date, label: string): void {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) throw new Error(`${label} must be a valid Date.`);
}

export const PositionCleanupRepository = createPositionCleanupRepository();
