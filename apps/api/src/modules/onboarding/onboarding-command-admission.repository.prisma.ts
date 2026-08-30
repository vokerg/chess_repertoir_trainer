import { Prisma, PrismaClient } from '@prisma/client';
import type {
  AccountImportScope,
  DurableAccountImportMode,
} from '@chess-trainer/contracts';
import prisma from '../../prisma';
import {
  AccountImportAccountNotFoundError,
  AccountImportRunNotFoundError,
} from '../account-imports/account-import.repository.prisma';
import { admitAccountImportRunInTransaction } from '../account-imports/account-import.transaction.repository.prisma';
import { lockDataLifecycleUserScope } from '../data-lifecycle/data-lifecycle.guard';
import {
  completePreparationAttentionInTransaction,
  createPreparationRunInTransaction,
} from '../preparation/preparation.transaction.repository.prisma';
import type { CreatePreparationRunInput } from '../preparation/preparation.types';

const IMPORT_PRIORITY = 100;
const ONBOARDING_ATOMIC_TRANSACTION_TIMEOUT_MS = 30_000;
const NON_TERMINAL_PREPARATION_STATUSES = [
  'QUEUED',
  'RUNNING',
  'PAUSE_REQUESTED',
  'PAUSED',
  'CANCEL_REQUESTED',
  'NEEDS_ATTENTION',
] as const;

type PreparationTargetInput = CreatePreparationRunInput['targets'][number];

export interface OnboardingImportAdmissionRequest {
  accountId: number;
  mode: DurableAccountImportMode;
  scope: AccountImportScope;
  requestedFrom: Date;
  requestedTo: Date;
  retryOfImportRunId?: number | null;
}

export type OnboardingImportBinding =
  | { kind: 'ENSURE'; request: OnboardingImportAdmissionRequest }
  | { kind: 'REUSE'; importRunId: number };

export interface OnboardingPreparationAdmissionTarget {
  target: Omit<PreparationTargetInput, 'currentImportRunId'>;
  importBinding: OnboardingImportBinding;
}

export interface OnboardingPreparationAdmissionInput {
  userId: number;
  preparation: Omit<CreatePreparationRunInput, 'userId' | 'targets'>;
  targets: OnboardingPreparationAdmissionTarget[];
  replaceNoRecentRunId?: number | null;
  requireFirstRunEligible?: boolean;
}

export type OnboardingPreparationAdmissionResult =
  | { outcome: 'CREATED'; runId: number }
  | { outcome: 'ACTIVE'; runId: number };

export interface OnboardingCommandAdmissionRepository {
  admit(input: OnboardingPreparationAdmissionInput): Promise<OnboardingPreparationAdmissionResult>;
}

interface IdRow {
  id: number;
}

interface ActivePreparationRow extends IdRow {
  status: string;
  attentionCode: string | null;
}

interface FirstRunUserRow {
  onboardingDisposition: string;
}

interface LatestPreparationRow extends IdRow {
  status: string;
}

export class OnboardingCommandSourceStateChangedError extends Error {
  constructor() {
    super('The no-recent-games preparation is no longer replaceable by an expansion.');
    this.name = 'OnboardingCommandSourceStateChangedError';
  }
}

export class OnboardingCommandFirstRunStateChangedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OnboardingCommandFirstRunStateChangedError';
  }
}

export function createOnboardingCommandAdmissionRepository(
  database: PrismaClient = prisma,
): OnboardingCommandAdmissionRepository {
  return {
    async admit(input) {
      validateAdmissionInput(input);
      try {
        return await database.$transaction(async (transaction) => {
          // Follow the destructive lifecycle coordinator's lock order: acquire the
          // shared user-scope fence before durable user/account row locks. Downstream
          // account-import and preparation admission guards re-enter this transaction-
          // scoped advisory lock while checking their narrower scopes.
          await lockDataLifecycleUserScope(transaction, input.userId);

          // First-run commands serialize on the durable user row before any
          // import/preparation admission. Other command families still rely on
          // the preparation one-active-per-user invariant as their final arbiter.
          if (input.requireFirstRunEligible) {
            await assertFirstRunEligible(transaction, input.userId);
          }

          const active = await findActivePreparation(transaction, input.userId);
          if (active) {
            if (active.id !== (input.replaceNoRecentRunId ?? null)) {
              return { outcome: 'ACTIVE' as const, runId: active.id };
            }
            if (active.status !== 'NEEDS_ATTENTION' || active.attentionCode !== 'NO_RECENT_GAMES') {
              throw new OnboardingCommandSourceStateChangedError();
            }
          } else if (input.replaceNoRecentRunId != null) {
            throw new OnboardingCommandSourceStateChangedError();
          }

          const targets = [] as Array<PreparationTargetInput & { currentImportRunId: number }>;
          for (const item of [...input.targets].sort((left, right) => left.target.ordinal - right.target.ordinal)) {
            const importRunId = item.importBinding.kind === 'REUSE'
              ? await verifyReusableImport(
                  transaction,
                  input.userId,
                  item.target.accountId,
                  item.importBinding.importRunId,
                )
              : (await admitAccountImportRunInTransaction(transaction, {
                  userId: input.userId,
                  accountId: item.importBinding.request.accountId,
                  mode: item.importBinding.request.mode,
                  source: 'ONBOARDING',
                  scope: item.importBinding.request.scope,
                  requestedFrom: item.importBinding.request.requestedFrom,
                  requestedTo: item.importBinding.request.requestedTo,
                  priority: IMPORT_PRIORITY,
                  windowsTotal: null,
                  retryOfImportRunId: item.importBinding.request.retryOfImportRunId ?? null,
                }, { reuseEquivalentActive: true })).importRunId;
            targets.push({ ...item.target, currentImportRunId: importRunId });
          }

          if (input.replaceNoRecentRunId != null) {
            const changed = await completePreparationAttentionInTransaction(transaction, {
              userId: input.userId,
              runId: input.replaceNoRecentRunId,
              attentionCode: 'NO_RECENT_GAMES',
            });
            if (!changed) throw new OnboardingCommandSourceStateChangedError();
          }

          const runId = await createPreparationRunInTransaction(transaction, {
            userId: input.userId,
            ...input.preparation,
            targets,
          });
          return { outcome: 'CREATED' as const, runId };
        }, {
          // This command must atomically cross lifecycle, import, and preparation
          // boundaries. Keep the override local and DB-only rather than widening
          // the Prisma client's transaction budget globally.
          timeout: ONBOARDING_ATOMIC_TRANSACTION_TIMEOUT_MS,
        });
      } catch (error) {
        if (isActivePreparationConstraintError(error)) {
          const active = await findActivePreparation(database, input.userId);
          if (active) return { outcome: 'ACTIVE', runId: active.id };
        }
        throw error;
      }
    },
  };
}

async function assertFirstRunEligible(
  transaction: Prisma.TransactionClient,
  userId: number,
): Promise<void> {
  const userRows = await transaction.$queryRaw<FirstRunUserRow[]>(Prisma.sql`
    SELECT "onboardingDisposition"
    FROM "AppUser"
    WHERE "id" = ${userId}
    FOR UPDATE
  `);
  const user = userRows[0];
  if (!user) throw new OnboardingCommandFirstRunStateChangedError('App user no longer exists.');
  if (user.onboardingDisposition === 'COMPLETED') {
    throw new OnboardingCommandFirstRunStateChangedError(
      'Completed onboarding uses expansion or recovery commands rather than starting a new first-run preparation.',
    );
  }

  const latestRows = await transaction.$queryRaw<LatestPreparationRow[]>(Prisma.sql`
    SELECT "id", "status"
    FROM "DataPreparationRun"
    WHERE "userId" = ${userId}
    ORDER BY "createdAt" DESC, "id" DESC
    LIMIT 1
  `);
  const latest = latestRows[0];
  if (latest && (latest.status === 'FAILED' || latest.status === 'CANCELLED')) {
    throw new OnboardingCommandFirstRunStateChangedError(
      `Preparation run ${latest.id} must be restarted as recovery rather than replaced by a new onboarding run.`,
    );
  }
}

async function verifyReusableImport(
  transaction: Prisma.TransactionClient,
  userId: number,
  accountId: number,
  importRunId: number,
): Promise<number> {
  validatePositiveInteger(userId, 'userId');
  validatePositiveInteger(accountId, 'accountId');
  validatePositiveInteger(importRunId, 'importRunId');

  const accountRows = await transaction.$queryRaw<IdRow[]>(Prisma.sql`
    SELECT "id"
    FROM "ExternalAccount"
    WHERE "id" = ${accountId}
      AND "userId" = ${userId}
    FOR UPDATE
  `);
  if (!accountRows[0]) throw new AccountImportAccountNotFoundError();

  const rows = await transaction.$queryRaw<IdRow[]>(Prisma.sql`
    SELECT "id"
    FROM "ImportRun"
    WHERE "id" = ${importRunId}
      AND "userId" = ${userId}
      AND "accountId" = ${accountId}
      AND "mode" <> 'LEGACY_SYNC'
      AND "status" = 'COMPLETED'
    LIMIT 1
  `);
  if (!rows[0]) throw new AccountImportRunNotFoundError();
  return rows[0].id;
}

async function findActivePreparation(
  database: Prisma.TransactionClient | PrismaClient,
  userId: number,
): Promise<ActivePreparationRow | null> {
  const rows = await database.$queryRaw<ActivePreparationRow[]>(Prisma.sql`
    SELECT "id", "status", "attentionCode"
    FROM "DataPreparationRun"
    WHERE "userId" = ${userId}
      AND "status" IN (${Prisma.join(NON_TERMINAL_PREPARATION_STATUSES.map((status) => Prisma.sql`${status}`))})
    ORDER BY "createdAt" DESC, "id" DESC
    LIMIT 1
  `);
  return rows[0] ?? null;
}

function validateAdmissionInput(input: OnboardingPreparationAdmissionInput): void {
  validatePositiveInteger(input.userId, 'userId');
  if (input.targets.length === 0) throw new Error('Onboarding preparation requires at least one target.');
  if (input.replaceNoRecentRunId != null) validatePositiveInteger(input.replaceNoRecentRunId, 'replaceNoRecentRunId');
}

function isActivePreparationConstraintError(error: unknown): boolean {
  const candidate = error as {
    code?: unknown;
    meta?: { code?: unknown; constraint?: unknown; message?: unknown };
    message?: unknown;
  };
  const message = `${String(candidate?.message ?? '')} ${String(candidate?.meta?.message ?? '')}`;
  const uniqueViolation = candidate?.code === 'P2002'
    || candidate?.meta?.code === '23505'
    || (candidate?.code === 'P2010' && message.includes('23505'));
  if (!uniqueViolation) return false;
  return message.includes('DataPreparationRun_one_active_per_user_key')
    || String(candidate?.meta?.constraint ?? '').includes('DataPreparationRun_one_active_per_user_key')
    || message.includes('Key ("userId")=');
}

function validatePositiveInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`${label} must be a positive integer.`);
}

export const OnboardingCommandAdmissionRepository = createOnboardingCommandAdmissionRepository();
