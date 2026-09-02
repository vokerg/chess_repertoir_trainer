import { Prisma, PrismaClient } from '@prisma/client';
import prisma from '../../prisma';
import { calculateTagCodes } from '../imported-games/game-tagging.service';
import { DataLifecycleOwnershipChangedError } from './data-lifecycle.repository.prisma';
import type { AccountGameDataLifecycleScope } from './data-lifecycle.coordinator.repository.prisma';

const taggingSelect = {
  id: true,
  provider: true,
  status: true,
  result: true,
  resultForUser: true,
  userColor: true,
  whiteRating: true,
  blackRating: true,
  speedCategory: true,
  timeControlInitial: true,
  timeControlIncrement: true,
  openingEco: true,
  openingName: true,
  plyIndexedAt: true,
  plyIndexError: true,
  tagCodes: true,
  analysisRuns: {
    orderBy: { createdAt: 'desc' as const },
    take: 5,
    select: {
      id: true,
      status: true,
      summary: true,
      whiteAccuracy: true,
      blackAccuracy: true,
      createdAt: true,
      completedAt: true,
    },
  },
  plies: {
    orderBy: { plyNumber: 'asc' as const },
    select: {
      plyNumber: true,
      moveUci: true,
      scoreLossCp: true,
      classificationCode: true,
      position: {
        select: {
          normalizedFen: true,
          analysis: {
            select: {
              bestScoreCpWhite: true,
              bestMateWhite: true,
              bestMoveUci: true,
            },
          },
        },
      },
    },
  },
} as const;

export interface DataLifecycleBatchMutationResult {
  games: number;
  scenariosDeleted: number;
}

export interface DataLifecycleVerification {
  ok: boolean;
  checks: Record<string, number | boolean | null>;
}

export interface AccountGameDataLifecycleExecutionRepository {
  cancelScopedJobTasks(userId: number, jobTaskIds: number[]): Promise<number>;
  unanalyseGameBatch(
    transaction: Prisma.TransactionClient,
    scope: AccountGameDataLifecycleScope,
    gameIds: number[],
  ): Promise<DataLifecycleBatchMutationResult>;
  unindexGameBatch(
    transaction: Prisma.TransactionClient,
    scope: AccountGameDataLifecycleScope,
    gameIds: number[],
  ): Promise<DataLifecycleBatchMutationResult>;
  purgeAccountGameBatch(
    transaction: Prisma.TransactionClient,
    scope: Extract<AccountGameDataLifecycleScope, { resourceType: 'ACCOUNT' }>,
    gameIds: number[],
  ): Promise<DataLifecycleBatchMutationResult>;
  finalizeAccountPurge(
    transaction: Prisma.TransactionClient,
    scope: Extract<AccountGameDataLifecycleScope, { resourceType: 'ACCOUNT' }>,
  ): Promise<void>;
  deleteExternalAccount(
    transaction: Prisma.TransactionClient,
    scope: Extract<AccountGameDataLifecycleScope, { resourceType: 'ACCOUNT' }>,
  ): Promise<void>;
  verifyUnanalysed(scope: Extract<AccountGameDataLifecycleScope, { resourceType: 'GAME' }>): Promise<DataLifecycleVerification>;
  verifyUnindexed(scope: Extract<AccountGameDataLifecycleScope, { resourceType: 'GAME' }>): Promise<DataLifecycleVerification>;
  verifyAccountPurged(scope: Extract<AccountGameDataLifecycleScope, { resourceType: 'ACCOUNT' }>): Promise<DataLifecycleVerification>;
  verifyAccountDeleted(scope: Extract<AccountGameDataLifecycleScope, { resourceType: 'ACCOUNT' }>): Promise<DataLifecycleVerification>;
}

export function createAccountGameDataLifecycleExecutionRepository(
  database: PrismaClient = prisma,
): AccountGameDataLifecycleExecutionRepository {
  return {
    async cancelScopedJobTasks(userId, jobTaskIds) {
      const ids = uniqueSortedIds(jobTaskIds);
      if (ids.length === 0) return 0;

      return database.$transaction(async (transaction) => {
        const tasks = await transaction.jobTask.findMany({
          where: {
            id: { in: ids },
            status: { in: ['QUEUED', 'RUNNING'] },
            jobRun: { userId },
          },
          select: { id: true, jobRunId: true },
          orderBy: [{ jobRunId: 'asc' }, { id: 'asc' }],
        });
        if (tasks.length === 0) return 0;

        const taskIds = tasks.map(({ id }) => id);
        const settledAt = new Date();
        await transaction.jobTask.updateMany({
          where: { id: { in: taskIds }, status: 'QUEUED' },
          data: {
            status: 'CANCELLED',
            workKey: null,
            error: 'Cancelled by destructive lifecycle operation.',
            settledAt,
            updatedAt: settledAt,
          },
        });
        await transaction.jobTask.updateMany({
          where: { id: { in: taskIds }, status: 'RUNNING' },
          data: {
            status: 'CANCELLED',
            error: 'Cancelled by destructive lifecycle operation.',
            settledAt,
            updatedAt: settledAt,
          },
        });

        for (const jobRunId of uniqueSortedIds(tasks.map(({ jobRunId }) => jobRunId))) {
          const lockedRows = await transaction.$queryRaw<Array<{ status: string }>>(Prisma.sql`
            SELECT "status"
            FROM "JobRun"
            WHERE "id" = ${jobRunId}
              AND "userId" = ${userId}
            FOR UPDATE
          `);
          const status = lockedRows[0]?.status;
          if (status !== 'QUEUED' && status !== 'RUNNING') continue;

          const groups = await transaction.jobTask.groupBy({
            by: ['status'],
            where: { jobRunId },
            _count: { _all: true },
          });
          const counts = new Map(groups.map((group) => [group.status, group._count._all]));
          const active = (counts.get('QUEUED') ?? 0) + (counts.get('RUNNING') ?? 0);
          if (active > 0) continue;

          const failed = counts.get('FAILED') ?? 0;
          const cancelled = counts.get('CANCELLED') ?? 0;
          const total = groups.reduce((sum, group) => sum + group._count._all, 0);
          const terminalStatus = cancelled === total && total > 0
            ? 'CANCELLED'
            : failed > 0 || cancelled > 0
              ? 'PARTIALLY_FAILED'
              : 'COMPLETED';
          await transaction.jobRun.update({
            where: { id: jobRunId },
            data: {
              status: terminalStatus,
              completedAt: new Date(),
              updatedAt: new Date(),
            },
          });
        }

        return tasks.length;
      });
    },

    async unanalyseGameBatch(transaction, scope, gameIds) {
      const ids = await assertOwnedGameBatch(transaction, scope, gameIds);
      if (ids.length === 0) return { games: 0, scenariosDeleted: 0 };
      const gameWhere = ownedGameBatchWhere(scope, ids);

      await transaction.importedGameAiReview.deleteMany({ where: { importedGame: gameWhere } });
      await transaction.tacticalDetectionProcessedGame.deleteMany({ where: { importedGame: gameWhere } });
      await transaction.tacticalDetection.deleteMany({ where: { importedGame: gameWhere } });
      await transaction.gameAnalysisRun.deleteMany({ where: { importedGame: gameWhere } });
      await transaction.importedGamePly.updateMany({
        where: { importedGame: gameWhere },
        data: { scoreLossCp: null, classificationCode: null },
      });
      await transaction.importedGame.updateMany({
        where: gameWhere,
        data: {
          latestAnalysisRunId: null,
          latestAnalysisStatus: null,
          latestAnalysisCreatedAt: null,
          latestAnalysisCompletedAt: null,
          latestWhiteAccuracy: null,
          latestBlackAccuracy: null,
        },
      });
      await recomputeTags(transaction, scope.userId, ids);
      return { games: ids.length, scenariosDeleted: 0 };
    },

    async unindexGameBatch(transaction, scope, gameIds) {
      const ids = await assertOwnedGameBatch(transaction, scope, gameIds);
      if (ids.length === 0) return { games: 0, scenariosDeleted: 0 };
      const gameWhere = ownedGameBatchWhere(scope, ids);
      await assertNoPerGameAnalysis(transaction, gameWhere);

      await transaction.importedGamePly.deleteMany({ where: { importedGame: gameWhere } });
      await transaction.$executeRaw(Prisma.sql`
        UPDATE "ImportedGame"
        SET "plyIndexedAt" = NULL,
            "plyIndexError" = NULL,
            "openingName" = CASE WHEN "openingProvenance" = 'LOCAL_BOOK' THEN NULL ELSE "openingName" END,
            "openingEco" = CASE WHEN "openingProvenance" = 'LOCAL_BOOK' THEN NULL ELSE "openingEco" END,
            "openingProvenance" = CASE WHEN "openingProvenance" = 'LOCAL_BOOK' THEN 'NONE' ELSE "openingProvenance" END,
            "updatedAt" = NOW()
        WHERE "userId" = ${scope.userId}
          AND "accountId" = ${scope.accountId}
          AND "id" IN (${Prisma.join(ids)})
      `);
      await recomputeTags(transaction, scope.userId, ids);
      return { games: ids.length, scenariosDeleted: 0 };
    },

    async purgeAccountGameBatch(transaction, scope, gameIds) {
      const ids = await assertOwnedGameBatch(transaction, scope, gameIds);
      if (ids.length === 0) return { games: 0, scenariosDeleted: 0 };

      const scenariosDeleted = await deleteScenarioCopies(transaction, scope.userId, ids);
      const remainingScenarioCopies = await countScenarioCopies(transaction, scope.userId, ids);
      if (remainingScenarioCopies !== 0) {
        throw new Error('Target scenario copies remained before imported-game cascade.');
      }

      const deleted = await transaction.importedGame.deleteMany({
        where: ownedGameBatchWhere(scope, ids),
      });
      if (deleted.count !== ids.length) throw new DataLifecycleOwnershipChangedError();
      return { games: deleted.count, scenariosDeleted };
    },

    async finalizeAccountPurge(transaction, scope) {
      const account = await transaction.externalAccount.findFirst({
        where: { id: scope.accountId, userId: scope.userId },
        select: { id: true },
      });
      if (!account) throw new DataLifecycleOwnershipChangedError();

      const remainingGames = await transaction.importedGame.count({
        where: { userId: scope.userId, accountId: scope.accountId },
      });
      if (remainingGames !== 0) throw new Error('Account purge cannot finalize while imported games remain.');

      await transaction.accountImportCoverage.deleteMany({ where: { accountId: scope.accountId } });
      await transaction.accountRatingStats.deleteMany({ where: { accountId: scope.accountId } });
      await transaction.dataPreparationTarget.updateMany({
        where: { accountId: scope.accountId },
        data: { currentImportRunId: null },
      });
      await transaction.externalAccount.update({
        where: { id: scope.accountId },
        data: {
          lastSyncAt: null,
          syncCursorTime: null,
          lastSyncRunId: null,
        },
      });
    },

    async deleteExternalAccount(transaction, scope) {
      const remainingGames = await transaction.importedGame.count({
        where: { userId: scope.userId, accountId: scope.accountId },
      });
      if (remainingGames !== 0) throw new Error('External account cannot be deleted before account purge completes.');

      await transaction.appUser.updateMany({
        where: { id: scope.userId, defaultProgressAccountId: scope.accountId },
        data: { defaultProgressAccountId: null },
      });
      const deleted = await transaction.externalAccount.deleteMany({
        where: { id: scope.accountId, userId: scope.userId },
      });
      if (deleted.count !== 1) throw new DataLifecycleOwnershipChangedError();
    },

    async verifyUnanalysed(scope) {
      const gameWhere = scopeGameWhere(scope);
      const [analysisRuns, aiReviews, tacticalDetections, processed, analysedPlies, snapshotGames] = await Promise.all([
        database.gameAnalysisRun.count({ where: { importedGame: gameWhere } }),
        database.importedGameAiReview.count({ where: { importedGame: gameWhere } }),
        database.tacticalDetection.count({ where: { importedGame: gameWhere } }),
        database.tacticalDetectionProcessedGame.count({ where: { importedGame: gameWhere } }),
        database.importedGamePly.count({
          where: {
            importedGame: gameWhere,
            OR: [
              { scoreLossCp: { not: null } },
              { classificationCode: { not: null } },
            ],
          },
        }),
        database.importedGame.count({
          where: {
            ...gameWhere,
            OR: [
              { latestAnalysisRunId: { not: null } },
              { latestAnalysisStatus: { not: null } },
              { latestAnalysisCreatedAt: { not: null } },
              { latestAnalysisCompletedAt: { not: null } },
              { latestWhiteAccuracy: { not: null } },
              { latestBlackAccuracy: { not: null } },
            ],
          },
        }),
      ]);
      const checks = { analysisRuns, aiReviews, tacticalDetections, processed, analysedPlies, snapshotGames };
      return { ok: Object.values(checks).every((value) => value === 0), checks };
    },

    async verifyUnindexed(scope) {
      const unanalysed = await this.verifyUnanalysed(scope);
      const gameWhere = scopeGameWhere(scope);
      const [plies, indexedGames, localOpeningGames] = await Promise.all([
        database.importedGamePly.count({ where: { importedGame: gameWhere } }),
        database.importedGame.count({
          where: {
            ...gameWhere,
            OR: [
              { plyIndexedAt: { not: null } },
              { plyIndexError: { not: null } },
            ],
          },
        }),
        database.importedGame.count({ where: { ...gameWhere, openingProvenance: 'LOCAL_BOOK' } }),
      ]);
      const checks = { ...unanalysed.checks, plies, indexedGames, localOpeningGames };
      return { ok: unanalysed.ok && plies === 0 && indexedGames === 0 && localOpeningGames === 0, checks };
    },

    async verifyAccountPurged(scope) {
      const account = await database.externalAccount.findFirst({
        where: { id: scope.accountId, userId: scope.userId },
        select: { lastSyncAt: true, syncCursorTime: true, lastSyncRunId: true },
      });
      const [games, coverage, ratingStats, currentPointers] = await Promise.all([
        database.importedGame.count({ where: { userId: scope.userId, accountId: scope.accountId } }),
        database.accountImportCoverage.count({ where: { accountId: scope.accountId } }),
        database.accountRatingStats.count({ where: { accountId: scope.accountId } }),
        database.dataPreparationTarget.count({
          where: { accountId: scope.accountId, currentImportRunId: { not: null } },
        }),
      ]);
      const frontierCleared = Boolean(account)
        && account?.lastSyncAt === null
        && account.syncCursorTime === null
        && account.lastSyncRunId === null;
      const checks = {
        accountPresent: Boolean(account),
        games,
        coverage,
        ratingStats,
        currentPointers,
        frontierCleared,
      };
      return {
        ok: Boolean(account)
          && games === 0
          && coverage === 0
          && ratingStats === 0
          && currentPointers === 0
          && frontierCleared,
        checks,
      };
    },

    async verifyAccountDeleted(scope) {
      const [account, games, importRuns, coverage, ratingStats, defaultReferences] = await Promise.all([
        database.externalAccount.count({ where: { id: scope.accountId, userId: scope.userId } }),
        database.importedGame.count({ where: { userId: scope.userId, accountId: scope.accountId } }),
        database.importRun.count({ where: { userId: scope.userId, accountId: scope.accountId } }),
        database.accountImportCoverage.count({ where: { accountId: scope.accountId } }),
        database.accountRatingStats.count({ where: { accountId: scope.accountId } }),
        database.appUser.count({ where: { id: scope.userId, defaultProgressAccountId: scope.accountId } }),
      ]);
      const checks = { account, games, importRuns, coverage, ratingStats, defaultReferences };
      return { ok: Object.values(checks).every((value) => value === 0), checks };
    },
  };
}

async function assertOwnedGameBatch(
  transaction: Prisma.TransactionClient,
  scope: AccountGameDataLifecycleScope,
  gameIds: number[],
): Promise<number[]> {
  const ids = uniqueSortedIds(gameIds);
  if (ids.length === 0 || ids.length > 100) {
    throw new Error('Lifecycle destructive game batches must contain 1-100 unique game ids.');
  }
  const rows = await transaction.importedGame.findMany({
    where: ownedGameBatchWhere(scope, ids),
    select: { id: true },
    orderBy: { id: 'asc' },
  });
  if (rows.length !== ids.length || rows.some((row, index) => row.id !== ids[index])) {
    throw new DataLifecycleOwnershipChangedError();
  }
  return ids;
}

function ownedGameBatchWhere(scope: AccountGameDataLifecycleScope, ids: number[]) {
  return {
    userId: scope.userId,
    accountId: scope.accountId,
    id: { in: ids },
  };
}

function scopeGameWhere(scope: Extract<AccountGameDataLifecycleScope, { resourceType: 'GAME' }>) {
  return {
    userId: scope.userId,
    accountId: scope.accountId,
    id: { in: uniqueSortedIds(scope.gameIds) },
  };
}

async function scenarioCopyWhere(
  transaction: Prisma.TransactionClient,
  userId: number,
  gameIds: number[],
) {
  const detectionIds = (
    await transaction.tacticalDetection.findMany({
      where: { userId, importedGameId: { in: gameIds } },
      select: { id: true },
      orderBy: { id: 'asc' },
    })
  ).map(({ id }) => id);

  return {
    userId,
    OR: [
      { importedGameId: { in: gameIds } },
      { tacticalDetection: { importedGameId: { in: gameIds } } },
      {
        sourceType: 'TACTICAL_DETECTION',
        sourceId: { in: detectionIds },
      },
    ],
  };
}

async function deleteScenarioCopies(
  transaction: Prisma.TransactionClient,
  userId: number,
  gameIds: number[],
): Promise<number> {
  const result = await transaction.scenarioTrainingSession.deleteMany({
    where: await scenarioCopyWhere(transaction, userId, gameIds),
  });
  return result.count;
}

async function countScenarioCopies(
  transaction: Prisma.TransactionClient,
  userId: number,
  gameIds: number[],
): Promise<number> {
  return transaction.scenarioTrainingSession.count({
    where: await scenarioCopyWhere(transaction, userId, gameIds),
  });
}

async function assertNoPerGameAnalysis(
  transaction: Prisma.TransactionClient,
  gameWhere: ReturnType<typeof ownedGameBatchWhere>,
): Promise<void> {
  const [runs, reviews, detections, processed, analysedPlies, snapshots] = await Promise.all([
    transaction.gameAnalysisRun.count({ where: { importedGame: gameWhere } }),
    transaction.importedGameAiReview.count({ where: { importedGame: gameWhere } }),
    transaction.tacticalDetection.count({ where: { importedGame: gameWhere } }),
    transaction.tacticalDetectionProcessedGame.count({ where: { importedGame: gameWhere } }),
    transaction.importedGamePly.count({
      where: {
        importedGame: gameWhere,
        OR: [
          { scoreLossCp: { not: null } },
          { classificationCode: { not: null } },
        ],
      },
    }),
    transaction.importedGame.count({
      where: {
        ...gameWhere,
        OR: [
          { latestAnalysisRunId: { not: null } },
          { latestAnalysisStatus: { not: null } },
          { latestAnalysisCreatedAt: { not: null } },
          { latestAnalysisCompletedAt: { not: null } },
          { latestWhiteAccuracy: { not: null } },
          { latestBlackAccuracy: { not: null } },
        ],
      },
    }),
  ]);
  if (runs + reviews + detections + processed + analysedPlies + snapshots !== 0) {
    throw new Error('Un-index cannot begin before per-game analysis evidence is cleared.');
  }
}

async function recomputeTags(
  transaction: Prisma.TransactionClient,
  userId: number,
  gameIds: number[],
): Promise<void> {
  const games = await transaction.importedGame.findMany({
    where: { userId, id: { in: gameIds } },
    select: taggingSelect,
    orderBy: { id: 'asc' },
  });
  for (const game of games) {
    const tagCodes = calculateTagCodes(game);
    await transaction.importedGame.update({
      where: { id: game.id },
      data: { tagCodes },
    });
  }
}

function uniqueSortedIds(values: number[]): number[] {
  for (const value of values) {
    if (!Number.isSafeInteger(value) || value <= 0) throw new Error('Lifecycle ids must be positive integers.');
  }
  return Array.from(new Set(values)).sort((left, right) => left - right);
}

export const AccountGameDataLifecycleExecutionRepository =
  createAccountGameDataLifecycleExecutionRepository();
