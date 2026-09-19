import { Prisma, PrismaClient } from '@prisma/client';
import {
  dataLifecycleActionSchema,
  dataLifecyclePreviewCountsSchema,
  dataLifecycleScopeSchema,
  type DataLifecycleAction,
  type DataLifecyclePreviewCounts,
  type DataLifecycleScope,
} from '@chess-trainer/contracts/data-lifecycle';
import prisma from '../../prisma';

export type AccountGameDataLifecycleAction = Extract<
  DataLifecycleAction,
  'UNANALYSE_GAMES' | 'UNINDEX_GAMES' | 'PURGE_ACCOUNT_DATA' | 'DELETE_EXTERNAL_ACCOUNT'
>;

export type AccountGameDataLifecycleScope = Extract<
  DataLifecycleScope,
  { resourceType: 'GAME' | 'ACCOUNT' }
>;

type CoordinatorDatabase = PrismaClient | Prisma.TransactionClient;

const ACTIVE_IMPORT_STATUSES = [
  'QUEUED',
  'RUNNING',
  'PAUSE_REQUESTED',
  'PAUSED',
  'CANCEL_REQUESTED',
] as const;

const ACTIVE_PREPARATION_STATUSES = [
  'QUEUED',
  'RUNNING',
  'PAUSE_REQUESTED',
  'PAUSED',
  'CANCEL_REQUESTED',
  'NEEDS_ATTENTION',
] as const;

const ACTIVE_JOB_STATUSES = ['QUEUED', 'RUNNING'] as const;
const ACTIVE_JOB_TASK_STATUSES = ['QUEUED', 'RUNNING'] as const;
export const DATA_LIFECYCLE_GAME_BATCH_LIMIT = 100;

export interface DataLifecycleDrainSnapshot {
  activeImportRuns: number;
  activeImportWorkKeys: number;
  activePreparationRuns: number;
  activeJobRuns: number;
  activeJobTaskWorkKeys: number;
  legacyImportBlockers: number;
  drained: boolean;
}

export interface DataLifecycleCancellationTargets {
  importRunIds: number[];
  preparationRunIds: number[];
  jobTaskIds: number[];
  hasMore: boolean;
}

export interface AccountGameDataLifecycleCoordinatorRepository {
  countAffectedRows(
    action: AccountGameDataLifecycleAction,
    scope: AccountGameDataLifecycleScope,
  ): Promise<DataLifecyclePreviewCounts>;
  loadDrainSnapshot(scope: AccountGameDataLifecycleScope): Promise<DataLifecycleDrainSnapshot>;
  listCancellationTargets(
    scope: AccountGameDataLifecycleScope,
    limit?: number,
  ): Promise<DataLifecycleCancellationTargets>;
  nextGameBatch(
    scope: AccountGameDataLifecycleScope,
    afterGameId: number | null,
    limit?: number,
  ): Promise<number[]>;
}

export class DataLifecycleScopeNotFoundError extends Error {
  readonly code = 'DATA_LIFECYCLE_OWNERSHIP_CHANGED' as const;

  constructor() {
    super('The data lifecycle scope is no longer owned by the target user.');
    this.name = 'DataLifecycleScopeNotFoundError';
  }
}

export function createAccountGameDataLifecycleCoordinatorRepository(
  database: CoordinatorDatabase = prisma,
): AccountGameDataLifecycleCoordinatorRepository {
  return {
    async countAffectedRows(action, scope) {
      const normalizedAction = parseAccountGameAction(action);
      const normalizedScope = parseAccountGameScope(scope);
      assertActionMatchesScope(normalizedAction, normalizedScope);
      await assertScopeOwned(database, normalizedScope);

      const gameWhere = targetGameWhere(normalizedScope);
      const activeImportWhere = targetImportWhere(normalizedScope);
      const activePreparationWhere = targetPreparationWhere(normalizedScope);
      const activeJobWhere = targetActiveJobWhere(normalizedScope);
      const accountAction = normalizedScope.resourceType === 'ACCOUNT';
      const deletesAccount = normalizedAction === 'DELETE_EXTERNAL_ACCOUNT';
      const deletesAllPlies = normalizedAction === 'UNINDEX_GAMES' || accountAction;

      const [
        games,
        plies,
        analysisRuns,
        aiReviews,
        tacticalDetections,
        scenarioSessions,
        importRuns,
        jobRuns,
        preparationRuns,
      ] = await Promise.all([
        database.importedGame.count({ where: gameWhere }),
        database.importedGamePly.count({
          where: {
            importedGame: gameWhere,
            ...(deletesAllPlies
              ? {}
              : {
                  OR: [
                    { scoreLossCp: { not: null } },
                    { classificationCode: { not: null } },
                  ],
                }),
          },
        }),
        database.gameAnalysisRun.count({ where: { importedGame: gameWhere } }),
        database.importedGameAiReview.count({ where: { importedGame: gameWhere } }),
        database.tacticalDetection.count({ where: { importedGame: gameWhere } }),
        accountAction
          ? database.scenarioTrainingSession.count({
              where: {
                userId: normalizedScope.userId,
                OR: [
                  { importedGame: gameWhere },
                  { tacticalDetection: { importedGame: gameWhere } },
                ],
              },
            })
          : Promise.resolve(0),
        deletesAccount
          ? database.importRun.count({
              where: {
                userId: normalizedScope.userId,
                accountId: normalizedScope.accountId,
              },
            })
          : database.importRun.count({ where: activeImportWhere }),
        database.jobRun.count({ where: activeJobWhere }),
        database.dataPreparationRun.count({ where: activePreparationWhere }),
      ]);

      return dataLifecyclePreviewCountsSchema.parse({
        accounts: accountAction ? 1 : 0,
        games,
        plies,
        analysisRuns,
        aiReviews,
        tacticalDetections,
        scenarioSessions,
        importRuns,
        jobRuns,
        preparationRuns,
      });
    },

    async loadDrainSnapshot(scope) {
      const normalizedScope = parseAccountGameScope(scope);
      await assertScopeOwned(database, normalizedScope);
      const gameWhere = targetGameWhere(normalizedScope);

      const [
        activeImportRuns,
        activeImportWorkKeys,
        activePreparationRuns,
        activeJobRuns,
        activeJobTaskWorkKeys,
        legacyImportBlockers,
      ] = await Promise.all([
        database.importRun.count({ where: targetImportWhere(normalizedScope) }),
        database.importRun.count({
          where: {
            userId: normalizedScope.userId,
            accountId: normalizedScope.accountId,
            workKey: { not: null },
          },
        }),
        database.dataPreparationRun.count({ where: targetPreparationWhere(normalizedScope) }),
        database.jobRun.count({ where: targetActiveJobWhere(normalizedScope) }),
        database.jobTask.count({
          where: {
            workKey: { not: null },
            importedGame: gameWhere,
          },
        }),
        database.importRun.count({
          where: {
            userId: normalizedScope.userId,
            accountId: normalizedScope.accountId,
            mode: 'LEGACY_SYNC',
            OR: [
              { workKey: { not: null } },
              { status: { in: [...ACTIVE_IMPORT_STATUSES] } },
            ],
          },
        }),
      ]);

      return {
        activeImportRuns,
        activeImportWorkKeys,
        activePreparationRuns,
        activeJobRuns,
        activeJobTaskWorkKeys,
        legacyImportBlockers,
        drained: activeImportRuns === 0
          && activeImportWorkKeys === 0
          && activePreparationRuns === 0
          && activeJobRuns === 0
          && activeJobTaskWorkKeys === 0
          && legacyImportBlockers === 0,
      };
    },

    async listCancellationTargets(scope, limit = DATA_LIFECYCLE_GAME_BATCH_LIMIT) {
      const normalizedScope = parseAccountGameScope(scope);
      const boundedLimit = validateBatchLimit(limit);
      await assertScopeOwned(database, normalizedScope);
      const take = boundedLimit + 1;

      const [importRuns, preparationRuns, jobTasks] = await Promise.all([
        database.importRun.findMany({
          where: {
            ...targetImportWhere(normalizedScope),
            mode: { not: 'LEGACY_SYNC' },
          },
          select: { id: true },
          orderBy: { id: 'asc' },
          take,
        }),
        database.dataPreparationRun.findMany({
          where: targetPreparationWhere(normalizedScope),
          select: { id: true },
          orderBy: { id: 'asc' },
          take,
        }),
        database.jobTask.findMany({
          where: {
            status: { in: [...ACTIVE_JOB_TASK_STATUSES] },
            importedGame: targetGameWhere(normalizedScope),
            jobRun: {
              userId: normalizedScope.userId,
              status: { in: [...ACTIVE_JOB_STATUSES] },
            },
          },
          select: { id: true },
          orderBy: { id: 'asc' },
          take,
        }),
      ]);

      return {
        importRunIds: importRuns.slice(0, boundedLimit).map(({ id }) => id),
        preparationRunIds: preparationRuns.slice(0, boundedLimit).map(({ id }) => id),
        jobTaskIds: jobTasks.slice(0, boundedLimit).map(({ id }) => id),
        hasMore: importRuns.length > boundedLimit
          || preparationRuns.length > boundedLimit
          || jobTasks.length > boundedLimit,
      };
    },

    async nextGameBatch(scope, afterGameId, limit = DATA_LIFECYCLE_GAME_BATCH_LIMIT) {
      const normalizedScope = parseAccountGameScope(scope);
      const boundedLimit = validateBatchLimit(limit);
      if (afterGameId !== null && (!Number.isSafeInteger(afterGameId) || afterGameId <= 0)) {
        throw new Error('Lifecycle afterGameId must be a positive integer or null.');
      }
      await assertScopeOwned(database, normalizedScope);

      if (normalizedScope.resourceType === 'GAME') {
        return uniqueSortedGameIds(normalizedScope.gameIds)
          .filter((gameId) => afterGameId === null || gameId > afterGameId)
          .slice(0, boundedLimit);
      }

      const rows = await database.importedGame.findMany({
        where: {
          userId: normalizedScope.userId,
          accountId: normalizedScope.accountId,
          ...(afterGameId === null ? {} : { id: { gt: afterGameId } }),
        },
        select: { id: true },
        orderBy: { id: 'asc' },
        take: boundedLimit,
      });
      return rows.map(({ id }) => id);
    },
  };
}

function parseAccountGameAction(action: AccountGameDataLifecycleAction): AccountGameDataLifecycleAction {
  const parsed = dataLifecycleActionSchema.parse(action);
  if (parsed === 'DELETE_APP_USER') {
    throw new Error('DELETE_APP_USER belongs to ONB-021, not the account/game coordinator.');
  }
  return parsed;
}

function parseAccountGameScope(scope: AccountGameDataLifecycleScope): AccountGameDataLifecycleScope {
  const parsed = dataLifecycleScopeSchema.parse(scope);
  if (parsed.resourceType === 'USER') {
    throw new Error('USER lifecycle scope belongs to ONB-021, not the account/game coordinator.');
  }
  return parsed;
}

function assertActionMatchesScope(
  action: AccountGameDataLifecycleAction,
  scope: AccountGameDataLifecycleScope,
): void {
  const gameAction = action === 'UNANALYSE_GAMES' || action === 'UNINDEX_GAMES';
  if (gameAction !== (scope.resourceType === 'GAME')) {
    throw new Error(`Lifecycle action ${action} does not match ${scope.resourceType} scope.`);
  }
}

async function assertScopeOwned(
  database: CoordinatorDatabase,
  scope: AccountGameDataLifecycleScope,
): Promise<void> {
  const account = await database.externalAccount.findFirst({
    where: { id: scope.accountId, userId: scope.userId },
    select: { id: true },
  });
  if (!account) throw new DataLifecycleScopeNotFoundError();
  if (scope.resourceType === 'ACCOUNT') return;

  const gameIds = uniqueSortedGameIds(scope.gameIds);
  const ownedGames = await database.importedGame.count({
    where: {
      userId: scope.userId,
      accountId: scope.accountId,
      id: { in: gameIds },
    },
  });
  if (ownedGames !== gameIds.length) throw new DataLifecycleScopeNotFoundError();
}

function targetGameWhere(scope: AccountGameDataLifecycleScope) {
  return {
    userId: scope.userId,
    accountId: scope.accountId,
    ...(scope.resourceType === 'GAME'
      ? { id: { in: uniqueSortedGameIds(scope.gameIds) } }
      : {}),
  };
}

function targetImportWhere(scope: AccountGameDataLifecycleScope) {
  return {
    userId: scope.userId,
    accountId: scope.accountId,
    status: { in: [...ACTIVE_IMPORT_STATUSES] },
  };
}

function targetPreparationWhere(scope: AccountGameDataLifecycleScope) {
  return {
    userId: scope.userId,
    status: { in: [...ACTIVE_PREPARATION_STATUSES] },
    targets: { some: { accountId: scope.accountId } },
  };
}

function targetActiveJobWhere(scope: AccountGameDataLifecycleScope) {
  return {
    userId: scope.userId,
    status: { in: [...ACTIVE_JOB_STATUSES] },
    tasks: {
      some: {
        status: { in: [...ACTIVE_JOB_TASK_STATUSES] },
        importedGame: targetGameWhere(scope),
      },
    },
  };
}

function uniqueSortedGameIds(gameIds: number[]): number[] {
  return Array.from(new Set(gameIds)).sort((left, right) => left - right);
}

function validateBatchLimit(limit: number): number {
  if (!Number.isSafeInteger(limit) || limit <= 0 || limit > DATA_LIFECYCLE_GAME_BATCH_LIMIT) {
    throw new Error(
      `Lifecycle game batch limit must be an integer from 1 through ${DATA_LIFECYCLE_GAME_BATCH_LIMIT}.`,
    );
  }
  return limit;
}

export const AccountGameDataLifecycleCoordinatorRepository =
  createAccountGameDataLifecycleCoordinatorRepository();
