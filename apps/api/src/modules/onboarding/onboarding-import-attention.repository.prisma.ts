import { Prisma, PrismaClient } from '@prisma/client';
import prisma from '../../prisma';
import { allowAccountImportAdmission } from '../account-imports/account-import-admission.guard';
import {
  AccountImportActiveRunError,
  AccountImportInvalidRetryError,
} from '../account-imports/account-import.repository.prisma';

const ACTIVE_IMPORT_STATUSES = [
  'QUEUED',
  'RUNNING',
  'PAUSE_REQUESTED',
  'PAUSED',
  'CANCEL_REQUESTED',
] as const;
const BLOCKING_IMPORT_STATUSES = new Set([
  'FAILED',
  'CANCELLED',
  'PAUSED',
  'PAUSE_REQUESTED',
  'CANCEL_REQUESTED',
]);

interface AttentionRunRow {
  id: number;
  status: string;
  attentionCode: string | null;
}

interface LinkedImportRow {
  targetId: number;
  accountId: number | null;
  ordinal: number;
  importRunId: number;
  userId: number;
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
}

interface IdRow {
  id: number;
}

export interface OnboardingImportAttentionRetryResult {
  importRunIds: number[];
  idempotent: boolean;
}

export interface OnboardingImportAttentionRepository {
  retryFailedImports(
    userId: number,
    preparationRunId: number,
  ): Promise<OnboardingImportAttentionRetryResult | null>;
}

export function createOnboardingImportAttentionRepository(
  database: PrismaClient = prisma,
): OnboardingImportAttentionRepository {
  return {
    async retryFailedImports(userId, preparationRunId) {
      validatePositiveInteger(userId, 'userId');
      validatePositiveInteger(preparationRunId, 'preparationRunId');

      return database.$transaction(async (transaction) => {
        const runRows = await transaction.$queryRaw<AttentionRunRow[]>(Prisma.sql`
          SELECT "id", "status", "attentionCode"
          FROM "DataPreparationRun"
          WHERE "id" = ${preparationRunId}
            AND "userId" = ${userId}
          FOR UPDATE
        `);
        const run = runRows[0];
        if (
          !run
          || run.status !== 'NEEDS_ATTENTION'
          || run.attentionCode !== 'IMPORT_RETRY_AVAILABLE'
        ) {
          return null;
        }

        const linked = await transaction.$queryRaw<LinkedImportRow[]>(Prisma.sql`
          SELECT
            target."id" AS "targetId",
            target."accountId",
            target."ordinal",
            import_run."id" AS "importRunId",
            import_run."userId",
            import_run."provider",
            import_run."mode",
            import_run."source",
            import_run."status",
            import_run."scopeVersion",
            import_run."scopeHash",
            import_run."scopeJson",
            import_run."requestedFrom",
            import_run."requestedTo",
            import_run."retryOfImportRunId",
            import_run."priority",
            import_run."windowsTotal"
          FROM "DataPreparationTarget" AS target
          JOIN "ImportRun" AS import_run
            ON import_run."id" = target."currentImportRunId"
           AND import_run."userId" = ${userId}
          WHERE target."preparationRunId" = ${preparationRunId}
          ORDER BY target."ordinal" ASC, target."id" ASC
          FOR UPDATE OF target, import_run
        `);
        if (linked.length === 0) return null;

        const retryable = linked.filter((item) => (
          item.status === 'FAILED' || item.status === 'CANCELLED'
        ));
        if (retryable.length === 0) {
          const unresolved = linked.some((item) => BLOCKING_IMPORT_STATUSES.has(item.status));
          const existingRetries = linked
            .filter((item) => item.retryOfImportRunId !== null && ACTIVE_IMPORT_STATUSES.includes(
              item.status as typeof ACTIVE_IMPORT_STATUSES[number],
            ))
            .map((item) => item.importRunId);
          if (!unresolved && existingRetries.length > 0) {
            return { importRunIds: existingRetries, idempotent: true };
          }
          return null;
        }

        const createdIds: number[] = [];
        for (const source of retryable) {
          if (
            source.accountId === null
            || source.mode === 'LEGACY_SYNC'
            || source.source === 'LEGACY_SYNC'
            || source.scopeVersion === null
            || source.scopeHash === null
            || source.scopeJson === null
            || source.requestedFrom === null
            || source.requestedTo === null
          ) {
            throw new AccountImportInvalidRetryError(
              'Linked legacy or detached import history cannot be retried as onboarding work.',
            );
          }

          const accountRows = await transaction.$queryRaw<IdRow[]>(Prisma.sql`
            SELECT "id"
            FROM "ExternalAccount"
            WHERE "id" = ${source.accountId}
              AND "userId" = ${userId}
            FOR UPDATE
          `);
          if (!accountRows[0]) {
            throw new AccountImportInvalidRetryError(
              'Linked import account is no longer owned by the user.',
            );
          }

          await allowAccountImportAdmission.assertAllowed(transaction, {
            userId,
            accountId: source.accountId,
          });

          const activeRows = await transaction.$queryRaw<IdRow[]>(Prisma.sql`
            SELECT "id"
            FROM "ImportRun"
            WHERE "accountId" = ${source.accountId}
              AND "status" IN (${Prisma.join(ACTIVE_IMPORT_STATUSES.map((status) => Prisma.sql`${status}`))})
            ORDER BY "createdAt" DESC, "id" DESC
            LIMIT 1
          `);
          const active = activeRows[0];
          if (active) throw new AccountImportActiveRunError(active.id);

          const retryRows = await transaction.$queryRaw<IdRow[]>(Prisma.sql`
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
              "pauseRequestedAt",
              "cancelRequestedAt",
              "retryAt",
              "rateLimitUntil",
              "completedAt",
              "errorCode",
              "error",
              "createdAt",
              "updatedAt"
            ) VALUES (
              ${userId},
              ${source.accountId},
              ${source.provider},
              ${source.mode},
              ${source.source},
              'QUEUED',
              ${source.scopeVersion},
              ${source.scopeHash},
              ${JSON.stringify(source.scopeJson)}::jsonb,
              ${source.requestedFrom},
              ${source.requestedTo},
              ${source.importRunId},
              ${source.priority},
              ${source.windowsTotal},
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
              NULL,
              NULL,
              NOW(),
              NOW()
            )
            RETURNING "id"
          `);
          const retry = retryRows[0];
          if (!retry) throw new Error('Linked import retry insert did not return a run.');

          const relinked = await transaction.$executeRaw(Prisma.sql`
            UPDATE "DataPreparationTarget"
            SET "currentImportRunId" = ${retry.id},
                "updatedAt" = NOW()
            WHERE "id" = ${source.targetId}
              AND "preparationRunId" = ${preparationRunId}
              AND "currentImportRunId" = ${source.importRunId}
          `);
          if (relinked !== 1) {
            throw new AccountImportInvalidRetryError(
              'Linked import changed while onboarding retry was being admitted.',
            );
          }
          createdIds.push(retry.id);
        }

        return { importRunIds: createdIds, idempotent: false };
      });
    },
  };
}

function validatePositiveInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive integer.`);
  }
}

export const OnboardingImportAttentionRepository = createOnboardingImportAttentionRepository();