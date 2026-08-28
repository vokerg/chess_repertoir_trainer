import { Prisma, PrismaClient } from '@prisma/client';
import {
  accountImportScopeSchema,
  durableAccountImportModeSchema,
  durableAccountImportSourceSchema,
} from '@chess-trainer/contracts';
import prisma from '../../prisma';
import { AccountImportInvalidRetryError } from '../account-imports/account-import.repository.prisma';
import { admitAccountImportRunInTransaction } from '../account-imports/account-import.transaction.repository.prisma';
import {
  recordPreparationImportRetryInTransaction,
  relinkPreparationTargetImportInTransaction,
} from '../preparation/preparation.transaction.repository.prisma';

const ACTIVE_IMPORT_STATUSES = [
  'QUEUED',
  'RUNNING',
  'PAUSE_REQUESTED',
  'PAUSED',
  'CANCEL_REQUESTED',
] as const;
const REPLAYABLE_IMPORT_RETRY_STATUSES = new Set([
  ...ACTIVE_IMPORT_STATUSES,
  'COMPLETED',
]);
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
  mode: string;
  source: string;
  status: string;
  scopeJson: unknown | null;
  requestedFrom: Date | null;
  requestedTo: Date | null;
  retryOfImportRunId: number | null;
  priority: number;
  windowsTotal: number | null;
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

        // Lock the target link, but let the owning account-import boundary lock
        // the account before it locks/validates the retry source ImportRun. This
        // preserves the canonical account -> import lock order under concurrency.
        const linked = await transaction.$queryRaw<LinkedImportRow[]>(Prisma.sql`
          SELECT
            target."id" AS "targetId",
            target."accountId",
            target."ordinal",
            import_run."id" AS "importRunId",
            import_run."mode",
            import_run."source",
            import_run."status",
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
          FOR UPDATE OF target
        `);
        if (linked.length === 0) return null;

        const retryable = linked.filter((item) => (
          item.status === 'FAILED' || item.status === 'CANCELLED'
        ));
        if (retryable.length === 0) {
          const unresolved = linked.some((item) => BLOCKING_IMPORT_STATUSES.has(item.status));
          const existingRetries = linked
            .filter((item) => (
              item.retryOfImportRunId !== null
              && REPLAYABLE_IMPORT_RETRY_STATUSES.has(item.status)
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
            || source.scopeJson === null
            || source.requestedFrom === null
            || source.requestedTo === null
          ) {
            throw new AccountImportInvalidRetryError(
              'Linked legacy or detached import history cannot be retried as onboarding work.',
            );
          }

          const mode = durableAccountImportModeSchema.safeParse(source.mode);
          const durableSource = durableAccountImportSourceSchema.safeParse(source.source);
          const scope = accountImportScopeSchema.safeParse(source.scopeJson);
          if (!mode.success || !durableSource.success || !scope.success) {
            throw new AccountImportInvalidRetryError(
              'Linked legacy import history cannot be retried as onboarding work.',
            );
          }

          const admitted = await admitAccountImportRunInTransaction(transaction, {
            userId,
            accountId: source.accountId,
            mode: mode.data,
            source: durableSource.data,
            scope: scope.data,
            requestedFrom: source.requestedFrom,
            requestedTo: source.requestedTo,
            priority: source.priority,
            windowsTotal: source.windowsTotal,
            retryOfImportRunId: source.importRunId,
          });

          const relinked = await relinkPreparationTargetImportInTransaction(transaction, {
            userId,
            preparationRunId,
            targetId: source.targetId,
            previousImportRunId: source.importRunId,
            nextImportRunId: admitted.importRunId,
          });
          if (!relinked) {
            throw new AccountImportInvalidRetryError(
              'Linked import changed while onboarding retry was being admitted.',
            );
          }
          createdIds.push(admitted.importRunId);
        }

        const generation = await recordPreparationImportRetryInTransaction(transaction, {
          userId,
          runId: preparationRunId,
        });
        if (generation === null) {
          throw new AccountImportInvalidRetryError(
            'Onboarding attention changed while import retry was being admitted.',
          );
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
