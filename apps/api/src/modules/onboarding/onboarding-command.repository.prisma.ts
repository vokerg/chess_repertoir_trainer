import { Prisma, PrismaClient } from '@prisma/client';
import type { OnboardingExpandBody } from '@chess-trainer/contracts/onboarding';
import prisma from '../../prisma';
import {
  DataLifecycleWriteBlockedError,
  assertDataLifecycleWriteAllowed,
} from '../data-lifecycle/data-lifecycle.guard';
import type {
  PreparationPurpose,
  PreparationRunStatus,
  PreparationScopeSnapshot,
} from '../preparation/preparation.types';

const NON_TERMINAL_PREPARATION_STATUSES = [
  'QUEUED',
  'RUNNING',
  'PAUSE_REQUESTED',
  'PAUSED',
  'CANCEL_REQUESTED',
  'NEEDS_ATTENTION',
] as const;

const FINISHABLE_ATTENTION_CODES = [
  'NO_RECENT_GAMES',
  'ALL_INDEXING_FAILED',
  'IMPORT_RETRY_AVAILABLE',
] as const;

interface RunRow {
  id: number;
  userId: number;
  purpose: string;
  status: string;
  recipeVersion: number;
  recipeJson: unknown;
  retryOfRunId: number | null;
  retryGeneration: number;
  attentionCode: string | null;
  coreReadyAt: Date | null;
  createdAt: Date;
}

interface TargetRow {
  id: number;
  preparationRunId: number;
  accountId: number | null;
  ordinal: number;
  scopeVersion: number;
  scopeHash: string;
  scopeJson: unknown;
  requestedFrom: Date;
  requestedTo: Date;
  currentImportRunId: number | null;
  importStatus: string | null;
  importRetryOfImportRunId: number | null;
}

interface DispositionRow {
  onboardingDisposition: 'PENDING' | 'COMPLETED' | 'SKIPPED';
  onboardingDispositionReason: string | null;
  onboardingDispositionAt: Date | null;
}

interface ExistsRow {
  exists: boolean;
}

export interface OnboardingCommandTargetRecord {
  id: number;
  accountId: number | null;
  ordinal: number;
  scopeVersion: number;
  scopeHash: string;
  scope: PreparationScopeSnapshot;
  requestedFrom: Date;
  requestedTo: Date;
  currentImportRunId: number | null;
  importStatus: string | null;
  importRetryOfImportRunId: number | null;
}

export interface OnboardingCommandRunRecord {
  id: number;
  userId: number;
  purpose: PreparationPurpose;
  status: PreparationRunStatus;
  recipeVersion: number;
  recipe: unknown;
  retryOfRunId: number | null;
  retryGeneration: number;
  attentionCode: string | null;
  coreReadyAt: Date | null;
  createdAt: Date;
  targets: OnboardingCommandTargetRecord[];
}

export interface OnboardingCommandDispositionRecord {
  disposition: 'PENDING' | 'COMPLETED' | 'SKIPPED';
  reason: string | null;
  changedAt: Date | null;
}

export interface OnboardingCommandDispositionMutationResult {
  disposition: OnboardingCommandDispositionRecord;
  changed: boolean;
}

export class OnboardingCommandDispositionBlockedError extends Error {
  readonly code = 'ONBOARDING_INVALID_STATE' as const;

  constructor() {
    super('Onboarding disposition update is blocked by an active data lifecycle operation.');
    this.name = 'OnboardingCommandDispositionBlockedError';
  }
}

export interface OnboardingCommandRepository {
  getRun(userId: number, runId: number): Promise<OnboardingCommandRunRecord | null>;
  getLatestRun(userId: number): Promise<OnboardingCommandRunRecord | null>;
  getActiveRun(userId: number): Promise<OnboardingCommandRunRecord | null>;
  findRecoveryForSource(userId: number, sourceRunId: number): Promise<OnboardingCommandRunRecord | null>;
  findExpansion(
    userId: number,
    sourceRunId: number,
    body: OnboardingExpandBody,
  ): Promise<OnboardingCommandRunRecord | null>;
  hasActiveRetryBatch(userId: number, runId: number): Promise<boolean>;
  getDisposition(userId: number): Promise<OnboardingCommandDispositionRecord>;
  skip(userId: number, changedAt: Date): Promise<OnboardingCommandDispositionMutationResult>;
  finishWithAttention(
    userId: number,
    runId: number,
    changedAt: Date,
  ): Promise<OnboardingCommandDispositionMutationResult | null>;
}

export function createOnboardingCommandRepository(
  database: PrismaClient = prisma,
): OnboardingCommandRepository {
  return {
    async getRun(userId, runId) {
      assertPositiveId(userId, 'userId');
      assertPositiveId(runId, 'runId');
      const row = await findRunRow(database, Prisma.sql`
        "id" = ${runId}
        AND "userId" = ${userId}
      `);
      return row ? hydrateRun(database, row) : null;
    },

    async getLatestRun(userId) {
      assertPositiveId(userId, 'userId');
      const row = await findRunRow(database, Prisma.sql`"userId" = ${userId}`);
      return row ? hydrateRun(database, row) : null;
    },

    async getActiveRun(userId) {
      assertPositiveId(userId, 'userId');
      const row = await findRunRow(database, Prisma.sql`
        "userId" = ${userId}
        AND "status" IN (${Prisma.join(NON_TERMINAL_PREPARATION_STATUSES.map((status) => Prisma.sql`${status}`))})
      `);
      return row ? hydrateRun(database, row) : null;
    },

    async findRecoveryForSource(userId, sourceRunId) {
      assertPositiveId(userId, 'userId');
      assertPositiveId(sourceRunId, 'sourceRunId');
      const row = await findRunRow(database, Prisma.sql`
        "userId" = ${userId}
        AND "purpose" = 'RECOVERY'
        AND "retryOfRunId" = ${sourceRunId}
      `);
      return row ? hydrateRun(database, row) : null;
    },

    async findExpansion(userId, sourceRunId, body) {
      assertPositiveId(userId, 'userId');
      assertPositiveId(sourceRunId, 'sourceRunId');
      const recipeKey = JSON.stringify({
        kind: 'ONBOARDING_EXPANSION',
        expansionKind: body.kind,
        sourceRunId,
        accountId: body.accountId,
      });
      const row = await findRunRow(database, Prisma.sql`
        "userId" = ${userId}
        AND "purpose" = 'EXPANSION'
        AND "recipeJson" @> ${recipeKey}::jsonb
      `);
      return row ? hydrateRun(database, row) : null;
    },

    async hasActiveRetryBatch(userId, runId) {
      assertPositiveId(userId, 'userId');
      assertPositiveId(runId, 'runId');
      const rows = await database.$queryRaw<ExistsRow[]>(Prisma.sql`
        SELECT EXISTS (
          SELECT 1
          FROM "DataPreparationRun" AS run
          JOIN "DataPreparationBatch" AS batch
            ON batch."preparationRunId" = run."id"
          WHERE run."id" = ${runId}
            AND run."userId" = ${userId}
            AND batch."lane" = 'RETRY'
            AND batch."status" IN ('QUEUED', 'RUNNING')
        ) AS "exists"
      `);
      return rows[0]?.exists ?? false;
    },

    async getDisposition(userId) {
      assertPositiveId(userId, 'userId');
      return getDispositionFromDatabase(database, userId);
    },

    async skip(userId, changedAt) {
      assertPositiveId(userId, 'userId');
      try {
        return await database.$transaction(async (transaction) => {
          await assertDataLifecycleWriteAllowed(transaction, { userId });
          const rows = await transaction.$queryRaw<DispositionRow[]>(Prisma.sql`
            UPDATE "AppUser"
            SET "onboardingDisposition" = 'SKIPPED',
                "onboardingDispositionReason" = 'USER_SKIPPED',
                "onboardingDispositionAt" = ${changedAt},
                "updatedAt" = ${changedAt}
            WHERE "id" = ${userId}
              AND "onboardingDisposition" = 'PENDING'
            RETURNING
              "onboardingDisposition",
              "onboardingDispositionReason",
              "onboardingDispositionAt"
          `);
          if (rows[0]) return { disposition: mapDisposition(rows[0]), changed: true };
          return {
            disposition: await getDispositionFromDatabase(transaction, userId),
            changed: false,
          };
        });
      } catch (error) {
        if (error instanceof DataLifecycleWriteBlockedError) {
          throw new OnboardingCommandDispositionBlockedError();
        }
        throw error;
      }
    },

    async finishWithAttention(userId, runId, changedAt) {
      assertPositiveId(userId, 'userId');
      assertPositiveId(runId, 'runId');
      try {
        return await database.$transaction(async (transaction) => {
          await assertDataLifecycleWriteAllowed(transaction, { userId });
          const rows = await transaction.$queryRaw<DispositionRow[]>(Prisma.sql`
            UPDATE "AppUser" AS app_user
            SET "onboardingDisposition" = 'COMPLETED',
                "onboardingDispositionReason" = CASE run."attentionCode"
                  WHEN 'NO_RECENT_GAMES' THEN 'USER_FINISHED_NO_RECENT_GAMES'
                  WHEN 'ALL_INDEXING_FAILED' THEN 'USER_FINISHED_ALL_INDEXING_FAILED'
                  WHEN 'IMPORT_RETRY_AVAILABLE' THEN 'USER_FINISHED_IMPORT_RETRY_AVAILABLE'
                  ELSE 'USER_FINISHED_WITH_ATTENTION'
                END,
                "onboardingDispositionAt" = ${changedAt},
                "updatedAt" = ${changedAt}
            FROM "DataPreparationRun" AS run
            WHERE app_user."id" = ${userId}
              AND app_user."onboardingDisposition" = 'PENDING'
              AND run."id" = ${runId}
              AND run."userId" = app_user."id"
              AND run."status" = 'NEEDS_ATTENTION'
              AND run."attentionCode" IN (${Prisma.join(FINISHABLE_ATTENTION_CODES.map((code) => Prisma.sql`${code}`))})
            RETURNING
              app_user."onboardingDisposition",
              app_user."onboardingDispositionReason",
              app_user."onboardingDispositionAt"
          `);
          if (rows[0]) return { disposition: mapDisposition(rows[0]), changed: true };
          const current = await getDispositionFromDatabase(transaction, userId);
          return current.disposition === 'COMPLETED'
            ? { disposition: current, changed: false }
            : null;
        });
      } catch (error) {
        if (error instanceof DataLifecycleWriteBlockedError) {
          throw new OnboardingCommandDispositionBlockedError();
        }
        throw error;
      }
    },
  };
}

async function getDispositionFromDatabase(
  database: PrismaClient | Prisma.TransactionClient,
  userId: number,
): Promise<OnboardingCommandDispositionRecord> {
  const rows = await database.$queryRaw<DispositionRow[]>(Prisma.sql`
    SELECT
      "onboardingDisposition",
      "onboardingDispositionReason",
      "onboardingDispositionAt"
    FROM "AppUser"
    WHERE "id" = ${userId}
    LIMIT 1
  `);
  const row = rows[0];
  if (!row) throw new Error(`App user ${userId} not found.`);
  return mapDisposition(row);
}

async function findRunRow(database: PrismaClient, predicate: Prisma.Sql): Promise<RunRow | null> {
  const rows = await database.$queryRaw<RunRow[]>(Prisma.sql`
    SELECT
      "id",
      "userId",
      "purpose",
      "status",
      "recipeVersion",
      "recipeJson",
      "retryOfRunId",
      "retryGeneration",
      "attentionCode",
      "coreReadyAt",
      "createdAt"
    FROM "DataPreparationRun"
    WHERE ${predicate}
    ORDER BY "createdAt" DESC, "id" DESC
    LIMIT 1
  `);
  return rows[0] ?? null;
}

async function hydrateRun(
  database: PrismaClient,
  row: RunRow,
): Promise<OnboardingCommandRunRecord> {
  const targets = await database.$queryRaw<TargetRow[]>(Prisma.sql`
    SELECT
      target."id",
      target."preparationRunId",
      target."accountId",
      target."ordinal",
      target."scopeVersion",
      target."scopeHash",
      target."scopeJson",
      target."requestedFrom",
      target."requestedTo",
      target."currentImportRunId",
      import_run."status" AS "importStatus",
      import_run."retryOfImportRunId" AS "importRetryOfImportRunId"
    FROM "DataPreparationTarget" AS target
    LEFT JOIN "ImportRun" AS import_run
      ON import_run."id" = target."currentImportRunId"
     AND import_run."userId" = ${row.userId}
    WHERE target."preparationRunId" = ${row.id}
    ORDER BY target."ordinal" ASC, target."id" ASC
  `);
  if (!['ONBOARDING', 'EXPANSION', 'RECOVERY'].includes(row.purpose)) {
    throw new Error(`Unsupported preparation purpose: ${row.purpose}`);
  }
  return {
    id: row.id,
    userId: row.userId,
    purpose: row.purpose as PreparationPurpose,
    status: row.status as PreparationRunStatus,
    recipeVersion: row.recipeVersion,
    recipe: row.recipeJson,
    retryOfRunId: row.retryOfRunId,
    retryGeneration: row.retryGeneration,
    attentionCode: row.attentionCode,
    coreReadyAt: row.coreReadyAt,
    createdAt: row.createdAt,
    targets: targets.map((target) => ({
      id: target.id,
      accountId: target.accountId,
      ordinal: target.ordinal,
      scopeVersion: target.scopeVersion,
      scopeHash: target.scopeHash,
      scope: target.scopeJson as PreparationScopeSnapshot,
      requestedFrom: target.requestedFrom,
      requestedTo: target.requestedTo,
      currentImportRunId: target.currentImportRunId,
      importStatus: target.importStatus,
      importRetryOfImportRunId: target.importRetryOfImportRunId,
    })),
  };
}

function mapDisposition(row: DispositionRow): OnboardingCommandDispositionRecord {
  return {
    disposition: row.onboardingDisposition,
    reason: row.onboardingDispositionReason,
    changedAt: row.onboardingDispositionAt,
  };
}

function assertPositiveId(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }
}

export const OnboardingCommandRepository = createOnboardingCommandRepository();