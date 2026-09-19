import prisma from '../../prisma';
import {
  dataLifecycleActionSchema,
  dataLifecycleOperationStatusSchema,
  dataLifecyclePreviewCountsSchema,
  dataLifecycleResourceTypeSchema,
  dataLifecycleTerminalResultSchema,
  type DataLifecycleAction,
  type DataLifecycleOperationStatus,
  type DataLifecyclePreviewCounts,
  type DataLifecycleResourceType,
  type DataLifecycleTerminalResult,
} from '@chess-trainer/contracts/data-lifecycle';

const TERMINAL_JOB_STATUSES = ['COMPLETED', 'PARTIALLY_FAILED', 'FAILED', 'CANCELLED'];
const TERMINAL_PREPARATION_STATUSES = ['COMPLETED', 'FAILED', 'CANCELLED'];
export const ADMIN_CONNECTED_ACCOUNT_LIMIT = 100;

export interface AdminUserListRow {
  id: number;
  displayName: string | null;
  email: string | null;
  createdAt: Date;
  updatedAt: Date;
  accountCount: number;
  activeAccountCount: number;
  importedGameCount: number;
  courseCount: number;
  activeWorkCount: number;
}

export interface AdminUserRow {
  id: number;
  displayName: string | null;
  email: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminAccountGroupRow {
  provider: string;
  isActive: boolean;
  count: number;
}

export interface AdminConnectedAccountRow {
  id: number;
  provider: string;
  username: string;
  displayName: string | null;
  isActive: boolean;
}

export interface AdminAccountSectionRows {
  groups: AdminAccountGroupRow[];
  accounts: AdminConnectedAccountRow[];
  hasMore: boolean;
}

export interface AdminGamesSectionRows {
  total: number;
  indexed: number;
  analysed: number;
  indexFailed: number;
  notIndexed: number;
  bySpeed: Array<{ speedCategory: string | null; count: number }>;
  byAnalysisState: Array<{ latestAnalysisStatus: string | null; count: number }>;
}

export interface AdminCoursesSectionRows {
  courses: number;
  chapters: number;
  lines: number;
}

export interface AdminTrainingSectionRows {
  sessions: number;
  sublineAttempts: number;
  latestSessionAt: Date | null;
  latestSublineAttemptAt: Date | null;
}

export interface AdminPreparationSectionRows {
  totalRuns: number;
  activeRuns: number;
  latestUpdatedAt: Date | null;
}

export interface AdminFootprintSectionRows {
  externalAccounts: number;
  importedGames: number;
  courses: number;
  chapters: number;
  lines: number;
  trainingSessions: number;
  trainingSublineAttempts: number;
  importRuns: number;
  jobRuns: number;
  preparationRuns: number;
}

export interface AdminJobRow {
  id: number;
  kind: string;
  source: string;
  status: string;
  totalTasks: number;
  createdAt: Date;
  updatedAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  taskCounts: Record<string, number>;
  activeWorkKeys: number;
}

export interface AdminImportRow {
  id: number;
  accountId: number;
  provider: string;
  status: string;
  gamesSeen: number;
  gamesImported: number;
  gamesFailed: number;
  startedAt: Date;
  completedAt: Date | null;
}

export interface AdminPreparationRow {
  id: number;
  purpose: string;
  status: string;
  attentionCode: string | null;
  reconcileAfter: Date | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}

export interface AdminLifecycleOperationRow {
  id: number;
  action: DataLifecycleAction;
  status: DataLifecycleOperationStatus;
  resourceType: DataLifecycleResourceType;
  aggregateCounts: DataLifecyclePreviewCounts;
  terminalResult: DataLifecycleTerminalResult | null;
  errorCode: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminLifecycleAuditRow {
  id: number;
  operationId: number;
  eventType: string;
  action: DataLifecycleAction;
  status: DataLifecycleOperationStatus | null;
  resourceType: DataLifecycleResourceType | null;
  aggregateCounts: DataLifecyclePreviewCounts | null;
  reasonCode: string | null;
  errorCode: string | null;
  confirmationMethod: string | null;
  terminalResult: DataLifecycleTerminalResult | null;
  createdAt: Date;
}

export interface AdminDiagnosticsRepositoryBoundary {
  listUsers(input: {
    cursorId?: number;
    limit: number;
  }): Promise<{ rows: AdminUserListRow[]; hasMore: boolean }>;
  getUser(userId: number): Promise<AdminUserRow | null>;
  loadAccounts(userId: number): Promise<AdminAccountSectionRows>;
  loadGames(userId: number): Promise<AdminGamesSectionRows>;
  loadCourses(userId: number): Promise<AdminCoursesSectionRows>;
  loadTraining(userId: number): Promise<AdminTrainingSectionRows>;
  loadPreparationSummary(userId: number): Promise<AdminPreparationSectionRows>;
  loadFootprint(userId: number): Promise<AdminFootprintSectionRows>;
  loadJobs(userId: number, limit: number): Promise<AdminJobRow[]>;
  loadImports(
    userId: number,
    limit: number,
  ): Promise<{
    rows: AdminImportRow[];
    queuedCount: number;
    oldestQueuedStartedAt: Date | null;
  }>;
  loadPreparationRuns(userId: number, limit: number): Promise<AdminPreparationRow[]>;
  loadLifecycle(
    userId: number,
    limit: number,
  ): Promise<{
    operations: AdminLifecycleOperationRow[];
    auditEvents: AdminLifecycleAuditRow[];
  }>;
}

function countMap(rows: Array<{ userId: number; _count: { _all: number } }>): Map<number, number> {
  return new Map(rows.map((row) => [row.userId, row._count._all]));
}

export const AdminDiagnosticsRepository: AdminDiagnosticsRepositoryBoundary = {
  async listUsers(input) {
    const users = await prisma.appUser.findMany({
      where: input.cursorId ? { id: { lt: input.cursorId } } : undefined,
      orderBy: { id: 'desc' },
      take: input.limit + 1,
      select: {
        id: true,
        displayName: true,
        email: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            externalAccounts: true,
            importedGames: true,
            courses: true,
          },
        },
      },
    });

    const hasMore = users.length > input.limit;
    const page = users.slice(0, input.limit);
    const userIds = page.map((user) => user.id);
    if (userIds.length === 0) return { rows: [], hasMore };

    const [activeAccountsRows, activeImportRows, activeJobRows, activePreparationRows] =
      await Promise.all([
        prisma.externalAccount.groupBy({
          by: ['userId'],
          where: { userId: { in: userIds }, isActive: true },
          _count: { _all: true },
        }),
        prisma.importRun.groupBy({
          by: ['userId'],
          where: { userId: { in: userIds }, completedAt: null },
          _count: { _all: true },
        }),
        prisma.jobRun.groupBy({
          by: ['userId'],
          where: { userId: { in: userIds }, status: { notIn: TERMINAL_JOB_STATUSES } },
          _count: { _all: true },
        }),
        prisma.dataPreparationRun.groupBy({
          by: ['userId'],
          where: { userId: { in: userIds }, status: { notIn: TERMINAL_PREPARATION_STATUSES } },
          _count: { _all: true },
        }),
      ]);

    const activeAccounts = countMap(activeAccountsRows);
    const activeImports = countMap(activeImportRows);
    const activeJobs = countMap(activeJobRows);
    const activePreparation = countMap(activePreparationRows);

    return {
      rows: page.map((user) => ({
        id: user.id,
        displayName: user.displayName,
        email: user.email,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        accountCount: user._count.externalAccounts,
        activeAccountCount: activeAccounts.get(user.id) ?? 0,
        importedGameCount: user._count.importedGames,
        courseCount: user._count.courses,
        activeWorkCount:
          (activeImports.get(user.id) ?? 0) +
          (activeJobs.get(user.id) ?? 0) +
          (activePreparation.get(user.id) ?? 0),
      })),
      hasMore,
    };
  },

  getUser: (userId) =>
    prisma.appUser.findUnique({
      where: { id: userId },
      select: { id: true, displayName: true, email: true, createdAt: true, updatedAt: true },
    }),

  async loadAccounts(userId) {
    const [groupRows, accountRows] = await Promise.all([
      prisma.externalAccount.groupBy({
        by: ['provider', 'isActive'],
        where: { userId },
        _count: { _all: true },
        orderBy: [{ provider: 'asc' }, { isActive: 'desc' }],
      }),
      prisma.externalAccount.findMany({
        where: { userId },
        orderBy: [{ provider: 'asc' }, { username: 'asc' }, { id: 'asc' }],
        take: ADMIN_CONNECTED_ACCOUNT_LIMIT + 1,
        select: {
          id: true,
          provider: true,
          username: true,
          displayName: true,
          isActive: true,
        },
      }),
    ]);
    return {
      groups: groupRows.map((row) => ({
        provider: row.provider,
        isActive: row.isActive,
        count: row._count._all,
      })),
      accounts: accountRows.slice(0, ADMIN_CONNECTED_ACCOUNT_LIMIT),
      hasMore: accountRows.length > ADMIN_CONNECTED_ACCOUNT_LIMIT,
    };
  },

  async loadGames(userId) {
    const [total, indexed, analysed, indexFailed, notIndexed, speedRows, analysisRows] =
      await Promise.all([
        prisma.importedGame.count({ where: { userId } }),
        prisma.importedGame.count({ where: { userId, plyIndexedAt: { not: null } } }),
        prisma.importedGame.count({ where: { userId, latestAnalysisCompletedAt: { not: null } } }),
        prisma.importedGame.count({
          where: { userId, plyIndexedAt: null, plyIndexError: { not: null } },
        }),
        prisma.importedGame.count({ where: { userId, plyIndexedAt: null, plyIndexError: null } }),
        prisma.importedGame.groupBy({
          by: ['speedCategory'],
          where: { userId },
          _count: { _all: true },
          orderBy: { speedCategory: 'asc' },
        }),
        prisma.importedGame.groupBy({
          by: ['latestAnalysisStatus'],
          where: { userId },
          _count: { _all: true },
          orderBy: { latestAnalysisStatus: 'asc' },
        }),
      ]);

    return {
      total,
      indexed,
      analysed,
      indexFailed,
      notIndexed,
      bySpeed: speedRows.map((row) => ({
        speedCategory: row.speedCategory,
        count: row._count._all,
      })),
      byAnalysisState: analysisRows.map((row) => ({
        latestAnalysisStatus: row.latestAnalysisStatus,
        count: row._count._all,
      })),
    };
  },

  async loadCourses(userId) {
    const [courses, chapters, lines] = await Promise.all([
      prisma.course.count({ where: { userId } }),
      prisma.chapter.count({ where: { course: { userId } } }),
      prisma.line.count({ where: { chapter: { course: { userId } } } }),
    ]);
    return { courses, chapters, lines };
  },

  async loadTraining(userId) {
    const [sessions, sublineAttempts] = await Promise.all([
      prisma.trainingSession.aggregate({
        where: { userId },
        _count: { _all: true },
        _max: { startedAt: true },
      }),
      prisma.trainingSublineAttempt.aggregate({
        where: { userId },
        _count: { _all: true },
        _max: { startedAt: true },
      }),
    ]);
    return {
      sessions: sessions._count._all,
      sublineAttempts: sublineAttempts._count._all,
      latestSessionAt: sessions._max.startedAt,
      latestSublineAttemptAt: sublineAttempts._max.startedAt,
    };
  },

  async loadPreparationSummary(userId) {
    const [totalRuns, activeRuns, latest] = await Promise.all([
      prisma.dataPreparationRun.count({ where: { userId } }),
      prisma.dataPreparationRun.count({
        where: { userId, status: { notIn: TERMINAL_PREPARATION_STATUSES } },
      }),
      prisma.dataPreparationRun.aggregate({
        where: { userId },
        _max: { updatedAt: true },
      }),
    ]);
    return { totalRuns, activeRuns, latestUpdatedAt: latest._max.updatedAt };
  },

  async loadFootprint(userId) {
    const [
      externalAccounts,
      importedGames,
      courses,
      chapters,
      lines,
      trainingSessions,
      trainingSublineAttempts,
      importRuns,
      jobRuns,
      preparationRuns,
    ] = await Promise.all([
      prisma.externalAccount.count({ where: { userId } }),
      prisma.importedGame.count({ where: { userId } }),
      prisma.course.count({ where: { userId } }),
      prisma.chapter.count({ where: { course: { userId } } }),
      prisma.line.count({ where: { chapter: { course: { userId } } } }),
      prisma.trainingSession.count({ where: { userId } }),
      prisma.trainingSublineAttempt.count({ where: { userId } }),
      prisma.importRun.count({ where: { userId } }),
      prisma.jobRun.count({ where: { userId } }),
      prisma.dataPreparationRun.count({ where: { userId } }),
    ]);
    return {
      externalAccounts,
      importedGames,
      courses,
      chapters,
      lines,
      trainingSessions,
      trainingSublineAttempts,
      importRuns,
      jobRuns,
      preparationRuns,
    };
  },

  async loadJobs(userId, limit) {
    const jobs = await prisma.jobRun.findMany({
      where: { userId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit,
      select: {
        id: true,
        kind: true,
        source: true,
        status: true,
        totalTasks: true,
        createdAt: true,
        updatedAt: true,
        startedAt: true,
        completedAt: true,
      },
    });
    if (jobs.length === 0) return [];

    const jobRunIds = jobs.map((job) => job.id);
    const [taskCountRows, activeWorkRows] = await Promise.all([
      prisma.jobTask.groupBy({
        by: ['jobRunId', 'status'],
        where: { jobRunId: { in: jobRunIds } },
        _count: { _all: true },
      }),
      prisma.jobTask.groupBy({
        by: ['jobRunId'],
        where: { jobRunId: { in: jobRunIds }, workKey: { not: null } },
        _count: { _all: true },
      }),
    ]);

    const taskCounts = new Map<number, Record<string, number>>();
    for (const row of taskCountRows) {
      const counts = taskCounts.get(row.jobRunId) ?? {};
      counts[row.status] = row._count._all;
      taskCounts.set(row.jobRunId, counts);
    }
    const activeWork = new Map(activeWorkRows.map((row) => [row.jobRunId, row._count._all]));

    return jobs.map((job) => ({
      ...job,
      taskCounts: taskCounts.get(job.id) ?? {},
      activeWorkKeys: activeWork.get(job.id) ?? 0,
    }));
  },

  async loadImports(userId, limit) {
    const [rows, queuedCount, oldestQueued] = await Promise.all([
      prisma.importRun.findMany({
        where: { userId },
        orderBy: [{ startedAt: 'desc' }, { id: 'desc' }],
        take: limit,
        select: {
          id: true,
          accountId: true,
          provider: true,
          status: true,
          gamesSeen: true,
          gamesImported: true,
          gamesFailed: true,
          startedAt: true,
          completedAt: true,
        },
      }),
      prisma.importRun.count({ where: { userId, status: 'QUEUED' } }),
      prisma.importRun.aggregate({
        where: { userId, status: 'QUEUED' },
        _min: { startedAt: true },
      }),
    ]);
    return {
      rows,
      queuedCount,
      oldestQueuedStartedAt: oldestQueued._min.startedAt,
    };
  },

  loadPreparationRuns: (userId, limit) =>
    prisma.dataPreparationRun.findMany({
      where: { userId },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: limit,
      select: {
        id: true,
        purpose: true,
        status: true,
        attentionCode: true,
        reconcileAfter: true,
        createdAt: true,
        updatedAt: true,
        completedAt: true,
      },
    }),

  async loadLifecycle(userId, limit) {
    const operations = await prisma.dataLifecycleOperation.findMany({
      where: { targetUserId: userId },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: limit,
      select: {
        id: true,
        action: true,
        status: true,
        scopeResourceType: true,
        previewCountsJson: true,
        terminalResult: true,
        errorCode: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    const operationIds = operations.map((operation) => operation.id);
    const auditEvents = operationIds.length
      ? await prisma.dataLifecycleAuditEvent.findMany({
          where: { operationId: { in: operationIds } },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: limit,
          select: {
            id: true,
            operationId: true,
            eventType: true,
            action: true,
            status: true,
            resourceType: true,
            aggregateCountsJson: true,
            reasonCode: true,
            errorCode: true,
            confirmationMethod: true,
            terminalResult: true,
            createdAt: true,
          },
        })
      : [];

    return {
      operations: operations.map((operation) => ({
        id: operation.id,
        action: dataLifecycleActionSchema.parse(operation.action),
        status: dataLifecycleOperationStatusSchema.parse(operation.status),
        resourceType: dataLifecycleResourceTypeSchema.parse(operation.scopeResourceType),
        aggregateCounts: dataLifecyclePreviewCountsSchema.parse(operation.previewCountsJson),
        terminalResult:
          operation.terminalResult === null
            ? null
            : dataLifecycleTerminalResultSchema.parse(operation.terminalResult),
        errorCode: operation.errorCode,
        createdAt: operation.createdAt,
        updatedAt: operation.updatedAt,
      })),
      auditEvents: auditEvents.map((event) => ({
        id: event.id,
        operationId: event.operationId,
        eventType: event.eventType,
        action: dataLifecycleActionSchema.parse(event.action),
        status:
          event.status === null ? null : dataLifecycleOperationStatusSchema.parse(event.status),
        resourceType:
          event.resourceType === null
            ? null
            : dataLifecycleResourceTypeSchema.parse(event.resourceType),
        aggregateCounts:
          event.aggregateCountsJson === null
            ? null
            : dataLifecyclePreviewCountsSchema.parse(event.aggregateCountsJson),
        reasonCode: event.reasonCode,
        errorCode: event.errorCode,
        confirmationMethod: event.confirmationMethod,
        terminalResult:
          event.terminalResult === null
            ? null
            : dataLifecycleTerminalResultSchema.parse(event.terminalResult),
        createdAt: event.createdAt,
      })),
    };
  },
};
