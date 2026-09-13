import { Prisma, PrismaClient } from '@prisma/client';
import {
  dataLifecyclePreviewCountsSchema,
  type DataLifecyclePreviewCounts,
} from '@chess-trainer/contracts/data-lifecycle';
import prisma from '../../prisma';

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

export const USER_DATA_LIFECYCLE_BATCH_LIMIT = 100;

export type UserResidualPhase =
  | 'TRAINING_SUBLINE_ATTEMPTS'
  | 'TRAINING_SESSIONS'
  | 'REPERTOIRE_REVIEW_STATES'
  | 'SCENARIO_SESSIONS'
  | 'LICHESS_PUZZLE_ROUNDS'
  | 'LICHESS_PUZZLE_REVIEW_STATES'
  | 'TACTICAL_FEEDBACK'
  | 'TACTICAL_RUNS'
  | 'ACTIVITY_AGGREGATES'
  | 'PREPARATION_RUNS'
  | 'JOB_RUNS'
  | 'COURSES'
  | 'LICHESS_CONNECTION'
  | 'OAUTH_LOGIN_STATES';

export const USER_RESIDUAL_PHASES: readonly UserResidualPhase[] = [
  'TRAINING_SUBLINE_ATTEMPTS',
  'TRAINING_SESSIONS',
  'REPERTOIRE_REVIEW_STATES',
  'SCENARIO_SESSIONS',
  'LICHESS_PUZZLE_ROUNDS',
  'LICHESS_PUZZLE_REVIEW_STATES',
  'TACTICAL_FEEDBACK',
  'TACTICAL_RUNS',
  'ACTIVITY_AGGREGATES',
  'PREPARATION_RUNS',
  'JOB_RUNS',
  'COURSES',
  'LICHESS_CONNECTION',
  'OAUTH_LOGIN_STATES',
];

export interface UserLifecycleDrainSnapshot {
  activeImportRuns: number;
  activeImportWorkKeys: number;
  activePreparationRuns: number;
  activeJobRuns: number;
  activeJobTaskWorkKeys: number;
  legacyImportBlockers: number;
  drained: boolean;
}

export interface UserLifecycleCancellationTargets {
  importRunIds: number[];
  preparationRunIds: number[];
  jobTaskIds: number[];
  hasMore: boolean;
}

export interface UserIdentityForDeletion {
  provider: string;
  externalSubject: string;
}

export interface UserDataLifecycleRepository {
  countAffectedRows(userId: number): Promise<DataLifecyclePreviewCounts>;
  loadDrainSnapshot(userId: number): Promise<UserLifecycleDrainSnapshot>;
  listCancellationTargets(
    userId: number,
    limit?: number,
  ): Promise<UserLifecycleCancellationTargets>;
  nextAccountId(userId: number, afterAccountId: number | null): Promise<number | null>;
  deleteResidualBatch(
    transaction: Prisma.TransactionClient,
    userId: number,
    phase: UserResidualPhase,
    limit?: number,
  ): Promise<number>;
  getIdentity(
    transaction: Prisma.TransactionClient,
    userId: number,
  ): Promise<UserIdentityForDeletion>;
  verifyDeleted(userId: number): Promise<{ ok: boolean; checks: Record<string, number | boolean> }>;
}

export function createUserDataLifecycleRepository(
  database: PrismaClient = prisma,
): UserDataLifecycleRepository {
  return {
    async countAffectedRows(userId) {
      validateUserId(userId);
      const [
        accounts,
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
        database.externalAccount.count({ where: { userId } }),
        database.importedGame.count({ where: { userId } }),
        database.importedGamePly.count({ where: { importedGame: { userId } } }),
        database.gameAnalysisRun.count({ where: { importedGame: { userId } } }),
        database.importedGameAiReview.count({ where: { userId } }),
        database.tacticalDetection.count({ where: { userId } }),
        database.scenarioTrainingSession.count({ where: { userId } }),
        database.importRun.count({ where: { userId } }),
        database.jobRun.count({ where: { userId } }),
        database.dataPreparationRun.count({ where: { userId } }),
      ]);
      return dataLifecyclePreviewCountsSchema.parse({
        accounts,
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

    async loadDrainSnapshot(userId) {
      validateUserId(userId);
      const [
        activeImportRuns,
        activeImportWorkKeys,
        activePreparationRuns,
        activeJobRuns,
        activeJobTaskWorkKeys,
        legacyImportBlockers,
      ] = await Promise.all([
        database.importRun.count({
          where: { userId, status: { in: [...ACTIVE_IMPORT_STATUSES] } },
        }),
        database.importRun.count({ where: { userId, workKey: { not: null } } }),
        database.dataPreparationRun.count({
          where: { userId, status: { in: [...ACTIVE_PREPARATION_STATUSES] } },
        }),
        database.jobRun.count({
          where: { userId, status: { in: [...ACTIVE_JOB_STATUSES] } },
        }),
        database.jobTask.count({
          where: {
            workKey: { not: null },
            jobRun: { userId },
          },
        }),
        database.importRun.count({
          where: {
            userId,
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

    async listCancellationTargets(userId, limit = USER_DATA_LIFECYCLE_BATCH_LIMIT) {
      validateUserId(userId);
      const boundedLimit = validateLimit(limit);
      const take = boundedLimit + 1;
      const [importRuns, preparationRuns, jobTasks] = await Promise.all([
        database.importRun.findMany({
          where: {
            userId,
            mode: { not: 'LEGACY_SYNC' },
            status: { in: [...ACTIVE_IMPORT_STATUSES] },
          },
          select: { id: true },
          orderBy: { id: 'asc' },
          take,
        }),
        database.dataPreparationRun.findMany({
          where: { userId, status: { in: [...ACTIVE_PREPARATION_STATUSES] } },
          select: { id: true },
          orderBy: { id: 'asc' },
          take,
        }),
        database.jobTask.findMany({
          where: {
            status: { in: [...ACTIVE_JOB_TASK_STATUSES] },
            jobRun: { userId, status: { in: [...ACTIVE_JOB_STATUSES] } },
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

    async nextAccountId(userId, afterAccountId) {
      validateUserId(userId);
      if (afterAccountId !== null) validatePositiveInteger(afterAccountId, 'afterAccountId');
      const row = await database.externalAccount.findFirst({
        where: {
          userId,
          ...(afterAccountId === null ? {} : { id: { gt: afterAccountId } }),
        },
        select: { id: true },
        orderBy: { id: 'asc' },
      });
      return row?.id ?? null;
    },

    async deleteResidualBatch(transaction, userId, phase, limit = USER_DATA_LIFECYCLE_BATCH_LIMIT) {
      validateUserId(userId);
      const take = validateLimit(limit);
      switch (phase) {
        case 'TRAINING_SUBLINE_ATTEMPTS':
          return deleteIdBatch(transaction.trainingSublineAttempt, { userId }, take);
        case 'TRAINING_SESSIONS':
          return deleteIdBatch(transaction.trainingSession, { userId }, take);
        case 'REPERTOIRE_REVIEW_STATES': {
          const rows = await transaction.repertoireSublineReviewState.findMany({
            where: { userId },
            select: { lineId: true, sublineHash: true, sublineKeyVersion: true },
            orderBy: [{ lineId: 'asc' }, { sublineHash: 'asc' }, { sublineKeyVersion: 'asc' }],
            take,
          });
          if (rows.length === 0) return 0;
          const deleted = await transaction.repertoireSublineReviewState.deleteMany({
            where: {
              userId,
              OR: rows.map((row) => ({
                lineId: row.lineId,
                sublineHash: row.sublineHash,
                sublineKeyVersion: row.sublineKeyVersion,
              })),
            },
          });
          return deleted.count;
        }
        case 'SCENARIO_SESSIONS':
          return deleteIdBatch(transaction.scenarioTrainingSession, { userId }, take);
        case 'LICHESS_PUZZLE_ROUNDS':
          return deleteIdBatch(transaction.lichessPuzzleRound, { userId }, take);
        case 'LICHESS_PUZZLE_REVIEW_STATES': {
          const rows = await transaction.lichessPuzzleReviewState.findMany({
            where: { userId },
            select: { puzzleId: true },
            orderBy: { puzzleId: 'asc' },
            take,
          });
          if (rows.length === 0) return 0;
          return (await transaction.lichessPuzzleReviewState.deleteMany({
            where: { userId, puzzleId: { in: rows.map(({ puzzleId }) => puzzleId) } },
          })).count;
        }
        case 'TACTICAL_FEEDBACK':
          return deleteIdBatch(transaction.tacticalDetectionFeedback, { userId }, take);
        case 'TACTICAL_RUNS':
          return deleteIdBatch(transaction.tacticalDetectionRun, { userId }, take);
        case 'ACTIVITY_AGGREGATES':
          return deleteIdBatch(transaction.userActivityDailyAggregate, { userId }, take);
        case 'PREPARATION_RUNS':
          return deleteIdBatch(transaction.dataPreparationRun, { userId }, take);
        case 'JOB_RUNS':
          return deleteIdBatch(transaction.jobRun, { userId }, take);
        case 'COURSES':
          return deleteIdBatch(transaction.course, { userId }, take);
        case 'LICHESS_CONNECTION':
          return (await transaction.lichessConnection.deleteMany({ where: { userId } })).count;
        case 'OAUTH_LOGIN_STATES': {
          const rows = await transaction.oAuthLoginState.findMany({
            where: { userId },
            select: { id: true },
            orderBy: { id: 'asc' },
            take,
          });
          if (rows.length === 0) return 0;
          return (await transaction.oAuthLoginState.deleteMany({
            where: { id: { in: rows.map(({ id }) => id) }, userId },
          })).count;
        }
      }
    },

    async getIdentity(transaction, userId) {
      validateUserId(userId);
      const user = await transaction.appUser.findUnique({
        where: { id: userId },
        select: { authProvider: true, authSubject: true },
      });
      if (!user?.authProvider || !user.authSubject) {
        throw new Error('DATA_LIFECYCLE_IDENTITY_UNAVAILABLE');
      }
      return { provider: user.authProvider, externalSubject: user.authSubject };
    },

    async verifyDeleted(userId) {
      validateUserId(userId);
      const [
        users,
        accounts,
        games,
        courses,
        trainingSessions,
        puzzleRounds,
        scenarioSessions,
        jobRuns,
        preparationRuns,
        oauthStates,
        lichessConnections,
      ] = await Promise.all([
        database.appUser.count({ where: { id: userId } }),
        database.externalAccount.count({ where: { userId } }),
        database.importedGame.count({ where: { userId } }),
        database.course.count({ where: { userId } }),
        database.trainingSession.count({ where: { userId } }),
        database.lichessPuzzleRound.count({ where: { userId } }),
        database.scenarioTrainingSession.count({ where: { userId } }),
        database.jobRun.count({ where: { userId } }),
        database.dataPreparationRun.count({ where: { userId } }),
        database.oAuthLoginState.count({ where: { userId } }),
        database.lichessConnection.count({ where: { userId } }),
      ]);
      const checks = {
        users,
        accounts,
        games,
        courses,
        trainingSessions,
        puzzleRounds,
        scenarioSessions,
        jobRuns,
        preparationRuns,
        oauthStates,
        lichessConnections,
      };
      return {
        ok: Object.values(checks).every((count) => count === 0),
        checks,
      };
    },
  };
}

async function deleteIdBatch(
  delegate: {
    findMany(args: unknown): Promise<Array<{ id: number }>>;
    deleteMany(args: unknown): Promise<{ count: number }>;
  },
  where: Record<string, unknown>,
  take: number,
): Promise<number> {
  const rows = await delegate.findMany({
    where,
    select: { id: true },
    orderBy: { id: 'asc' },
    take,
  });
  if (rows.length === 0) return 0;
  return (await delegate.deleteMany({
    where: { ...where, id: { in: rows.map(({ id }) => id) } },
  })).count;
}

function validateUserId(userId: number): void {
  validatePositiveInteger(userId, 'userId');
}

function validatePositiveInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive integer.`);
  }
}

function validateLimit(value: number): number {
  if (!Number.isSafeInteger(value) || value <= 0 || value > USER_DATA_LIFECYCLE_BATCH_LIMIT) {
    throw new Error(
      `User lifecycle batch limit must be an integer from 1 through ${USER_DATA_LIFECYCLE_BATCH_LIMIT}.`,
    );
  }
  return value;
}

export const UserDataLifecycleRepository = createUserDataLifecycleRepository();
