import { Prisma, PrismaClient } from '@prisma/client';
import type {
  AccountImportScope,
  DurableAccountImportMode,
} from '@chess-trainer/contracts';
import prisma from '../../prisma';
import { allowAccountImportAdmission } from '../account-imports/account-import-admission.guard';
import {
  AccountImportAccountNotFoundError,
  AccountImportActiveRunError,
  AccountImportInvalidRetryError,
  AccountImportRunNotFoundError,
} from '../account-imports/account-import.repository.prisma';
import { canonicalizeAccountImportScope } from '../account-imports/account-import.scope';
import type { CreatePreparationRunInput } from '../preparation/preparation.types';

const IMPORT_PRIORITY = 100;
const NON_TERMINAL_PREPARATION_STATUSES = [
  'QUEUED',
  'RUNNING',
  'PAUSE_REQUESTED',
  'PAUSED',
  'CANCEL_REQUESTED',
  'NEEDS_ATTENTION',
] as const;
const NON_TERMINAL_IMPORT_STATUSES = [
  'QUEUED',
  'RUNNING',
  'PAUSE_REQUESTED',
  'PAUSED',
  'CANCEL_REQUESTED',
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

interface AccountRow extends IdRow {
  provider: string;
}

interface ActiveImportRow extends IdRow {
  mode: string;
  source: string;
  scopeHash: string | null;
  requestedFrom: Date | null;
  requestedTo: Date | null;
  retryOfImportRunId: number | null;
}

interface RetryImportRow extends IdRow {
  mode: string;
  status: string;
  scopeHash: string | null;
  requestedFrom: Date | null;
  requestedTo: Date | null;
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

          if (input.requireFirstRunEligible) {
            await assertFirstRunEligible(transaction, input.userId);
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
              : await ensureImport(transaction, input.userId, item.importBinding.request);
            targets.push({ ...item.target, currentImportRunId: importRunId });
          }

          if (input.replaceNoRecentRunId != null) {
            const changed = await transaction.$executeRaw(Prisma.sql`
              UPDATE "DataPreparationRun"
              SET "status" = 'COMPLETED',
                  "attentionCode" = NULL,
                  "attentionDetail" = NULL,
                  "completedAt" = COALESCE("completedAt", NOW()),
                  "reconcileAfter" = NULL,
                  "updatedAt" = NOW()
              WHERE "id" = ${input.replaceNoRecentRunId}
                AND "userId" = ${input.userId}
                AND "status" = 'NEEDS_ATTENTION'
                AND "attentionCode" = 'NO_RECENT_GAMES'
            `);
            if (changed !== 1) throw new OnboardingCommandSourceStateChangedError();
          }

          const runId = await createPreparationRun(transaction, {
            userId: input.userId,
            ...input.preparation,
            targets,
          });
          return { outcome: 'CREATED' as const, runId };
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

async function ensureImport(
  transaction: Prisma.TransactionClient,
  userId: number,
  request: OnboardingImportAdmissionRequest,
): Promise<number> {
  validateImportRequest(userId, request);
  const canonical = canonicalizeAccountImportScope(request.scope);
  const accountRows = await transaction.$queryRaw<AccountRow[]>(Prisma.sql`
    SELECT "id", "provider"
    FROM "ExternalAccount"
    WHERE "id" = ${request.accountId}
      AND "userId" = ${userId}
    FOR UPDATE
  `);
  const account = accountRows[0];
  if (!account) throw new AccountImportAccountNotFoundError();

  await allowAccountImportAdmission.assertAllowed(transaction, {
    userId,
    accountId: request.accountId,
  });

  if (request.retryOfImportRunId != null) {
    await assertValidRetry(transaction, userId, request, canonical.scopeHash);
  }

  const activeRows = await transaction.$queryRaw<ActiveImportRow[]>(Prisma.sql`
    SELECT
      "id",
      "mode",
      "source",
      "scopeHash",
      "requestedFrom",
      "requestedTo",
      "retryOfImportRunId"
    FROM "ImportRun"
    WHERE "userId" = ${userId}
      AND "accountId" = ${request.accountId}
      AND "status" IN (${Prisma.join(NON_TERMINAL_IMPORT_STATUSES.map((status) => Prisma.sql`${status}`))})
    ORDER BY "createdAt" DESC, "id" DESC
    LIMIT 1
  `);
  const active = activeRows[0];
  if (active) {
    if (
      active.mode === request.mode
      && active.source === 'ONBOARDING'
      && active.scopeHash === canonical.scopeHash
      && sameDate(active.requestedFrom, request.requestedFrom)
      && sameDate(active.requestedTo, request.requestedTo)
      && active.retryOfImportRunId === (request.retryOfImportRunId ?? null)
    ) {
      return active.id;
    }
    throw new AccountImportActiveRunError(active.id);
  }

  const rows = await transaction.$queryRaw<IdRow[]>(Prisma.sql`
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
      "retryAt",
      "rateLimitUntil",
      "completedAt",
      "errorCode",
      "error",
      "createdAt",
      "updatedAt"
    ) VALUES (
      ${userId},
      ${request.accountId},
      ${account.provider},
      ${request.mode},
      'ONBOARDING',
      'QUEUED',
      ${canonical.scopeVersion},
      ${canonical.scopeHash},
      ${JSON.stringify(canonical.scope)}::jsonb,
      ${request.requestedFrom},
      ${request.requestedTo},
      ${request.retryOfImportRunId ?? null},
      ${IMPORT_PRIORITY},
      NULL,
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
      NOW(),
      NOW()
    )
    RETURNING "id"
  `);
  const row = rows[0];
  if (!row) throw new Error('Onboarding account import admission did not return a run.');
  return row.id;
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

async function assertValidRetry(
  transaction: Prisma.TransactionClient,
  userId: number,
  request: OnboardingImportAdmissionRequest,
  scopeHash: string,
): Promise<void> {
  const rows = await transaction.$queryRaw<RetryImportRow[]>(Prisma.sql`
    SELECT "id", "mode", "status", "scopeHash", "requestedFrom", "requestedTo"
    FROM "ImportRun"
    WHERE "id" = ${request.retryOfImportRunId ?? -1}
      AND "userId" = ${userId}
      AND "accountId" = ${request.accountId}
    FOR SHARE
  `);
  const retryOf = rows[0];
  if (!retryOf) throw new AccountImportInvalidRetryError('Retry source import run not found.');
  if (retryOf.mode === 'LEGACY_SYNC') {
    throw new AccountImportInvalidRetryError('Legacy import history cannot be retried as durable work.');
  }
  if (retryOf.status !== 'FAILED' && retryOf.status !== 'CANCELLED') {
    throw new AccountImportInvalidRetryError('Only failed or cancelled import runs can be retried.');
  }
  if (
    retryOf.mode !== request.mode
    || retryOf.scopeHash !== scopeHash
    || retryOf.requestedFrom?.getTime() !== request.requestedFrom.getTime()
    || retryOf.requestedTo?.getTime() !== request.requestedTo.getTime()
  ) {
    throw new AccountImportInvalidRetryError(
      'Retry must preserve the source import mode, immutable scope, and requested range.',
    );
  }
}

async function createPreparationRun(
  transaction: Prisma.TransactionClient,
  input: CreatePreparationRunInput,
): Promise<number> {
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
  if (!run) throw new Error('Onboarding preparation admission did not return a run.');

  for (const target of [...input.targets].sort((left, right) => left.ordinal - right.ordinal)) {
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
        ${target.currentImportRunId ?? null},
        NOW(),
        NOW()
      FROM "ExternalAccount" AS account
      WHERE account."id" = ${target.accountId}
        AND account."userId" = ${input.userId}
        AND EXISTS (
          SELECT 1
          FROM "ImportRun" AS import_run
          WHERE import_run."id" = ${target.currentImportRunId ?? -1}
            AND import_run."userId" = ${input.userId}
            AND import_run."accountId" = account."id"
        )
      RETURNING "id"
    `);
    if (!targetRows[0]) {
      throw new AccountImportAccountNotFoundError();
    }
  }

  return run.id;
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

function validateImportRequest(userId: number, request: OnboardingImportAdmissionRequest): void {
  validatePositiveInteger(userId, 'userId');
  validatePositiveInteger(request.accountId, 'accountId');
  if (Number.isNaN(request.requestedFrom.getTime()) || Number.isNaN(request.requestedTo.getTime())) {
    throw new Error('Account import requested range must contain valid timestamps.');
  }
  if (request.requestedFrom >= request.requestedTo) {
    throw new Error('Account import requested range must be a non-empty half-open interval.');
  }
}

function sameDate(left: Date | null, right: Date): boolean {
  return left !== null && left.getTime() === right.getTime();
}

function isActivePreparationConstraintError(error: unknown): boolean {
  const candidate = error as { code?: unknown; meta?: { code?: unknown; constraint?: unknown }; message?: unknown };
  const message = String(candidate?.message ?? '');
  return (
    candidate?.code === 'P2002'
    || candidate?.meta?.code === '23505'
    || candidate?.code === 'P2010' && message.includes('23505')
  ) && (message.includes('DataPreparationRun_one_active_per_user_key')
    || String(candidate?.meta?.constraint ?? '').includes('DataPreparationRun_one_active_per_user_key'));
}

function validatePositiveInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`${label} must be a positive integer.`);
}

export const OnboardingCommandAdmissionRepository = createOnboardingCommandAdmissionRepository();