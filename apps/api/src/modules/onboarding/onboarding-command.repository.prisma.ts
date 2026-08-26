import { Prisma, PrismaClient } from '@prisma/client';
import prisma from '../../prisma';
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
}

interface DispositionRow {
  onboardingDisposition: 'PENDING' | 'COMPLETED' | 'SKIPPED';
  onboardingDispositionReason: string | null;
  onboardingDispositionAt: Date | null;
}

export interface OnboardingCommandTargetRecord {
  id: number;
  accountId: number;
  ordinal: number;
  scopeVersion: number;
  scopeHash: string;
  scope: PreparationScopeSnapshot;
  requestedFrom: Date;
  requestedTo: Date;
  currentImportRunId: number | null;
  importStatus: string | null;
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

export interface OnboardingCommandRepository {
  getRun(userId: number, runId: number): Promise<OnboardingCommandRunRecord | null>;
  getActiveRun(userId: number): Promise<OnboardingCommandRunRecord | null>;
  getDisposition(userId: number): Promise<OnboardingCommandDispositionRecord>;
  skip(userId: number, changedAt: Date): Promise<OnboardingCommandDispositionRecord>;
  finishNoRecentGames(
    userId: number,
    runId: number,
    changedAt: Date,
  ): Promise<OnboardingCommandDispositionRecord | null>;
  completeNoRecentRunForExpansion(userId: number, runId: number, completedAt: Date): Promise<boolean>;
}

export function createOnboardingCommandRepository(
  database: PrismaClient = prisma,
): OnboardingCommandRepository {
  return {
    async getRun(userId, runId) {
      assertPositiveId(userId, 'userId');
      assertPositiveId(runId, 'runId');
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
        WHERE "id" = ${runId}
          AND "userId" = ${userId}
        LIMIT 1
      `);
      return rows[0] ? hydrateRun(database, rows[0]) : null;
    },

    async getActiveRun(userId) {
      assertPositiveId(userId, 'userId');
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
        WHERE "userId" = ${userId}
          AND "status" IN (${Prisma.join(NON_TERMINAL_PREPARATION_STATUSES.map((status) => Prisma.sql`${status}`))})
        ORDER BY "createdAt" DESC, "id" DESC
        LIMIT 1
      `);
      return rows[0] ? hydrateRun(database, rows[0]) : null;
    },

    async getDisposition(userId) {
      assertPositiveId(userId, 'userId');
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
    },

    async skip(userId, changedAt) {
      assertPositiveId(userId, 'userId');
      const rows = await database.$queryRaw<DispositionRow[]>(Prisma.sql`
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
      return rows[0] ? mapDisposition(rows[0]) : this.getDisposition(userId);
    },

    async finishNoRecentGames(userId, runId, changedAt) {
      assertPositiveId(userId, 'userId');
      assertPositiveId(runId, 'runId');
      const rows = await database.$queryRaw<DispositionRow[]>(Prisma.sql`
        UPDATE "AppUser" AS app_user
        SET "onboardingDisposition" = 'COMPLETED',
            "onboardingDispositionReason" = 'USER_FINISHED_NO_RECENT_GAMES',
            "onboardingDispositionAt" = ${changedAt},
            "updatedAt" = ${changedAt}
        WHERE app_user."id" = ${userId}
          AND app_user."onboardingDisposition" <> 'COMPLETED'
          AND EXISTS (
            SELECT 1
            FROM "DataPreparationRun" AS run
            WHERE run."id" = ${runId}
              AND run."userId" = app_user."id"
              AND run."status" = 'NEEDS_ATTENTION'
              AND run."attentionCode" = 'NO_RECENT_GAMES'
          )
        RETURNING
          app_user."onboardingDisposition",
          app_user."onboardingDispositionReason",
          app_user."onboardingDispositionAt"
      `);
      if (rows[0]) return mapDisposition(rows[0]);
      const current = await this.getDisposition(userId);
      return current.disposition === 'COMPLETED' ? current : null;
    },

    async completeNoRecentRunForExpansion(userId, runId, completedAt) {
      assertPositiveId(userId, 'userId');
      assertPositiveId(runId, 'runId');
      const changed = await database.$executeRaw(Prisma.sql`
        UPDATE "DataPreparationRun"
        SET "status" = 'COMPLETED',
            "attentionCode" = NULL,
            "attentionDetail" = NULL,
            "analysisCompletedAt" = COALESCE("analysisCompletedAt", ${completedAt}),
            "completedAt" = COALESCE("completedAt", ${completedAt}),
            "reconcileAfter" = NULL,
            "updatedAt" = ${completedAt}
        WHERE "id" = ${runId}
          AND "userId" = ${userId}
          AND "status" = 'NEEDS_ATTENTION'
          AND "attentionCode" = 'NO_RECENT_GAMES'
      `);
      return changed === 1;
    },
  };
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
      import_run."status" AS "importStatus"
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
    targets: targets.map((target) => {
      if (target.accountId === null) {
        throw new Error(`Preparation target ${target.id} no longer has an account.`);
      }
      return {
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
      };
    }),
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
