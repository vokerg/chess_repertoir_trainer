import type {
  AdminUserDetailResponse,
  AdminUserListQuery,
  AdminUserListResponse,
  AdminUserWorkResponse,
  AdminWarning,
} from '@chess-trainer/contracts/admin';
import { decodeAdminUserCursor, encodeAdminUserCursor } from './admin-cursor';
import {
  AdminDiagnosticsRepository,
  type AdminDiagnosticsRepositoryBoundary,
  type AdminImportRow,
  type AdminJobRow,
  type AdminPreparationRow,
} from './admin-diagnostics.repository.prisma';
import { AdminUserNotFoundError } from './admin.errors';

export const ADMIN_WARNING_POLICY_VERSION = 'ONB-007-2026-08-03-v1';
const DIRECT_USER_QUEUE_AGE_WARNING_SECONDS = 10;
const ONBOARDING_ANALYSIS_QUEUE_AGE_WARNING_SECONDS = 300;
const IMPORT_QUEUE_AGE_WARNING_SECONDS = 300;
const IMPORT_QUEUE_BACKLOG_COUNT_WARNING = 20;
const PREPARATION_RECONCILE_LAG_WARNING_SECONDS = 15;
const TERMINAL_PREPARATION_STATUSES = new Set(['COMPLETED', 'FAILED', 'CANCELLED']);

interface Dependencies {
  repository?: AdminDiagnosticsRepositoryBoundary;
  clock?: () => Date;
}

function secondsBetween(later: Date, earlier: Date): number {
  return Math.max(0, Math.floor((later.getTime() - earlier.getTime()) / 1000));
}

function warning(
  code: AdminWarning['code'],
  metric: AdminWarning['evidence']['metric'],
  observed: number,
  threshold: number,
  unit: AdminWarning['evidence']['unit'],
): AdminWarning {
  return {
    code,
    policyVersion: ADMIN_WARNING_POLICY_VERSION,
    evidence: { metric, observed, threshold, unit },
  };
}

function unavailable(reason: 'MODEL_NOT_AVAILABLE' | 'QUERY_FAILED') {
  return { available: false as const, reason };
}

function taskCounts(raw: Record<string, number>) {
  return {
    queued: raw['QUEUED'] ?? 0,
    running: raw['RUNNING'] ?? 0,
    completed: raw['COMPLETED'] ?? 0,
    skipped: raw['SKIPPED'] ?? 0,
    failed: raw['FAILED'] ?? 0,
    cancelled: raw['CANCELLED'] ?? 0,
  };
}

function jobWarnings(job: AdminJobRow, now: Date): AdminWarning[] {
  if (job.status !== 'QUEUED') return [];
  const age = secondsBetween(now, job.createdAt);
  const warnings: AdminWarning[] = [];
  if (job.source === 'USER_ACTION' && age > DIRECT_USER_QUEUE_AGE_WARNING_SECONDS) {
    warnings.push(warning(
      'DIRECT_USER_QUEUE_AGE_HIGH',
      'queueAgeSeconds',
      age,
      DIRECT_USER_QUEUE_AGE_WARNING_SECONDS,
      'SECONDS',
    ));
  }
  if (
    job.source === 'ONBOARDING'
    && job.kind === 'ANALYSE_GAMES'
    && age > ONBOARDING_ANALYSIS_QUEUE_AGE_WARNING_SECONDS
  ) {
    warnings.push(warning(
      'ONBOARDING_ANALYSIS_QUEUE_AGE_HIGH',
      'queueAgeSeconds',
      age,
      ONBOARDING_ANALYSIS_QUEUE_AGE_WARNING_SECONDS,
      'SECONDS',
    ));
  }
  return warnings;
}

function importWarnings(run: AdminImportRow, now: Date): AdminWarning[] {
  if (run.status !== 'QUEUED') return [];
  const age = secondsBetween(now, run.startedAt);
  return age > IMPORT_QUEUE_AGE_WARNING_SECONDS
    ? [warning(
      'IMPORT_QUEUE_AGE_HIGH',
      'queueAgeSeconds',
      age,
      IMPORT_QUEUE_AGE_WARNING_SECONDS,
      'SECONDS',
    )]
    : [];
}

function preparationWarnings(run: AdminPreparationRow, now: Date): AdminWarning[] {
  if (!run.reconcileAfter || TERMINAL_PREPARATION_STATUSES.has(run.status)) return [];
  const lag = secondsBetween(now, run.reconcileAfter);
  return lag > PREPARATION_RECONCILE_LAG_WARNING_SECONDS
    ? [warning(
      'PREPARATION_RECONCILE_LAG',
      'reconcileLagSeconds',
      lag,
      PREPARATION_RECONCILE_LAG_WARNING_SECONDS,
      'SECONDS',
    )]
    : [];
}

export function createAdminDiagnosticsService(dependencies: Dependencies = {}) {
  const repository = dependencies.repository ?? AdminDiagnosticsRepository;
  const clock = dependencies.clock ?? (() => new Date());

  return {
    async listUsers(query: AdminUserListQuery): Promise<AdminUserListResponse> {
      const cursorId = decodeAdminUserCursor(query.cursor);
      const result = await repository.listUsers({ cursorId, limit: query.limit });
      const last = result.rows.at(-1);
      return {
        items: result.rows.map((row) => ({
          id: row.id,
          createdAt: row.createdAt.toISOString(),
          updatedAt: row.updatedAt.toISOString(),
          accountCount: row.accountCount,
          activeAccountCount: row.activeAccountCount,
          importedGameCount: row.importedGameCount,
          courseCount: row.courseCount,
          activeWorkCount: row.activeWorkCount,
          warnings: [],
        })),
        nextCursor: result.hasMore && last ? encodeAdminUserCursor(last.id) : null,
      };
    },

    async getUserDetail(userId: number): Promise<AdminUserDetailResponse> {
      const user = await repository.getUser(userId);
      if (!user) throw new AdminUserNotFoundError();

      const [accounts, games, courses, training, preparation, footprint] = await Promise.allSettled([
        repository.loadAccounts(userId),
        repository.loadGames(userId),
        repository.loadCourses(userId),
        repository.loadTraining(userId),
        repository.loadPreparationSummary(userId),
        repository.loadFootprint(userId),
      ]);

      return {
        user: {
          id: user.id,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        },
        sections: {
          accounts: accounts.status === 'fulfilled'
            ? {
              available: true,
              total: accounts.value.reduce((total, row) => total + row.count, 0),
              active: accounts.value.filter((row) => row.isActive).reduce((total, row) => total + row.count, 0),
              groups: accounts.value.map((row) => ({
                provider: row.provider,
                active: row.isActive,
                count: row.count,
              })),
            }
            : unavailable('QUERY_FAILED'),
          games: games.status === 'fulfilled'
            ? {
              available: true,
              total: games.value.total,
              indexed: games.value.indexed,
              analysed: games.value.analysed,
              bySpeed: games.value.bySpeed.map((row) => ({
                speed: row.speedCategory,
                count: row.count,
              })),
              byIndexState: [
                { state: 'INDEXED' as const, count: games.value.indexed },
                { state: 'INDEX_FAILED' as const, count: games.value.indexFailed },
                { state: 'NOT_INDEXED' as const, count: games.value.notIndexed },
              ],
              byAnalysisState: games.value.byAnalysisState.map((row) => ({
                state: row.latestAnalysisStatus,
                count: row.count,
              })),
            }
            : unavailable('QUERY_FAILED'),
          courses: courses.status === 'fulfilled'
            ? { available: true, ...courses.value }
            : unavailable('QUERY_FAILED'),
          training: training.status === 'fulfilled'
            ? {
              available: true,
              sessions: training.value.sessions,
              sublineAttempts: training.value.sublineAttempts,
              latestSessionAt: training.value.latestSessionAt?.toISOString() ?? null,
              latestSublineAttemptAt: training.value.latestSublineAttemptAt?.toISOString() ?? null,
            }
            : unavailable('QUERY_FAILED'),
          preparation: preparation.status === 'fulfilled'
            ? {
              available: true,
              totalRuns: preparation.value.totalRuns,
              activeRuns: preparation.value.activeRuns,
              latestUpdatedAt: preparation.value.latestUpdatedAt?.toISOString() ?? null,
              warnings: [],
            }
            : unavailable('QUERY_FAILED'),
          footprint: footprint.status === 'fulfilled'
            ? { available: true, rowCounts: footprint.value }
            : unavailable('QUERY_FAILED'),
          lifecycle: unavailable('MODEL_NOT_AVAILABLE'),
        },
      };
    },

    async getUserWork(userId: number, limit: number): Promise<AdminUserWorkResponse> {
      const user = await repository.getUser(userId);
      if (!user) throw new AdminUserNotFoundError();
      const now = clock();

      const [jobs, imports, preparation] = await Promise.allSettled([
        repository.loadJobs(userId, limit),
        repository.loadImports(userId, limit),
        repository.loadPreparationRuns(userId, limit),
      ]);

      const importSection = imports.status === 'fulfilled'
        ? (() => {
          const items = imports.value.rows.map((run) => {
            const warnings = importWarnings(run, now);
            return {
              id: run.id,
              accountId: run.accountId,
              provider: run.provider,
              status: run.status,
              gamesSeen: run.gamesSeen,
              gamesImported: run.gamesImported,
              gamesFailed: run.gamesFailed,
              startedAt: run.startedAt.toISOString(),
              completedAt: run.completedAt?.toISOString() ?? null,
              queueAgeSeconds: run.status === 'QUEUED' ? secondsBetween(now, run.startedAt) : null,
              warnings,
            };
          });
          const observedOldestQueueAge = items
            .filter((item) => item.queueAgeSeconds !== null)
            .reduce((oldest, item) => Math.max(oldest, item.queueAgeSeconds ?? 0), 0);
          const warnings = imports.value.queuedCount > IMPORT_QUEUE_BACKLOG_COUNT_WARNING
            && observedOldestQueueAge > IMPORT_QUEUE_AGE_WARNING_SECONDS
            ? [warning(
              'IMPORT_QUEUE_BACKLOG_HIGH',
              'queuedRuns',
              imports.value.queuedCount,
              IMPORT_QUEUE_BACKLOG_COUNT_WARNING,
              'COUNT',
            )]
            : [];
          return {
            available: true as const,
            queuedCount: imports.value.queuedCount,
            items,
            warnings,
          };
        })()
        : unavailable('QUERY_FAILED');

      return {
        userId,
        sections: {
          jobs: jobs.status === 'fulfilled'
            ? {
              available: true,
              items: jobs.value.map((job) => ({
                id: job.id,
                kind: job.kind,
                source: job.source,
                status: job.status,
                totalTasks: job.totalTasks,
                activeWorkKeys: job.activeWorkKeys,
                taskCounts: taskCounts(job.taskCounts),
                createdAt: job.createdAt.toISOString(),
                updatedAt: job.updatedAt.toISOString(),
                startedAt: job.startedAt?.toISOString() ?? null,
                completedAt: job.completedAt?.toISOString() ?? null,
                queueAgeSeconds: job.status === 'QUEUED' ? secondsBetween(now, job.createdAt) : null,
                warnings: jobWarnings(job, now),
              })),
            }
            : unavailable('QUERY_FAILED'),
          imports: importSection,
          preparation: preparation.status === 'fulfilled'
            ? {
              available: true,
              items: preparation.value.map((run) => ({
                id: run.id,
                purpose: run.purpose,
                status: run.status,
                attentionCode: run.attentionCode,
                reconcileAfter: run.reconcileAfter?.toISOString() ?? null,
                createdAt: run.createdAt.toISOString(),
                updatedAt: run.updatedAt.toISOString(),
                completedAt: run.completedAt?.toISOString() ?? null,
                warnings: preparationWarnings(run, now),
              })),
            }
            : unavailable('QUERY_FAILED'),
          lifecycle: unavailable('MODEL_NOT_AVAILABLE'),
        },
      };
    },
  };
}

export const AdminDiagnosticsService = createAdminDiagnosticsService();
