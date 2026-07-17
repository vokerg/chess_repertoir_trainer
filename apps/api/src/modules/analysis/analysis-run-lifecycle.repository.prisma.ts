import { Prisma } from '@prisma/client';
import prisma from '../../prisma';

const compactGameAnalysisRunInclude = {
  importedGame: {
    select: {
      plies: {
        orderBy: { plyNumber: 'asc' as const },
        select: {
          plyNumber: true,
          moveUci: true,
          scoreLossCp: true,
          classificationCode: true,
          position: {
            select: {
              analysis: {
                select: {
                  id: true,
                  bestMoveUci: true,
                  bestScoreCpWhite: true,
                  bestMateWhite: true,
                },
              },
            },
          },
        },
      },
    },
  },
} as const;

const latestRunStatuses = ['RUNNING', 'COMPLETED', 'FAILED'] as const;

export async function getLatestGameAnalysisRunDeterministic(
  userId: number,
  importedGameId: number,
) {
  return prisma.gameAnalysisRun.findFirst({
    where: {
      importedGameId,
      importedGame: { userId },
      status: { in: [...latestRunStatuses] },
    },
    orderBy: [
      { createdAt: 'desc' },
      { id: 'desc' },
    ],
    include: compactGameAnalysisRunInclude,
  });
}

export interface ImportedGameAnalysisExecutionState {
  totalPlies: number;
  maxRunId: number;
  latest: {
    id: number;
    status: string;
    positionsTotal: number;
    positionsDone: number;
    createdAt: Date;
  } | null;
  hasOtherCurrentRunAtLatestTimestamp: boolean;
}

export async function getImportedGameAnalysisExecutionState(
  userId: number,
  importedGameId: number,
): Promise<ImportedGameAnalysisExecutionState | null> {
  const game = await prisma.importedGame.findFirst({
    where: { id: importedGameId, userId },
    select: {
      id: true,
      _count: { select: { plies: true } },
    },
  });
  if (!game) return null;

  const [latest, maxRun] = await Promise.all([
    prisma.gameAnalysisRun.findFirst({
      where: {
        importedGameId,
        status: { in: [...latestRunStatuses] },
      },
      orderBy: [
        { createdAt: 'desc' },
        { id: 'desc' },
      ],
      select: {
        id: true,
        status: true,
        positionsTotal: true,
        positionsDone: true,
        createdAt: true,
      },
    }),
    prisma.gameAnalysisRun.findFirst({
      where: { importedGameId },
      orderBy: { id: 'desc' },
      select: { id: true },
    }),
  ]);

  const hasOtherCurrentRunAtLatestTimestamp = latest
    ? await prisma.gameAnalysisRun.findFirst({
      where: {
        importedGameId,
        id: { not: latest.id },
        createdAt: latest.createdAt,
        status: 'COMPLETED',
        positionsDone: { gte: game._count.plies },
        positionsTotal: { gte: game._count.plies },
      },
      select: { id: true },
    }).then(Boolean)
    : false;

  return {
    totalPlies: game._count.plies,
    maxRunId: maxRun?.id ?? 0,
    latest,
    hasOtherCurrentRunAtLatestTimestamp,
  };
}

export async function findAbortCleanupCandidate(input: {
  userId: number;
  importedGameId: number;
  afterRunId: number;
  error: string;
}): Promise<number | null> {
  const failed = await prisma.gameAnalysisRun.findFirst({
    where: {
      importedGameId: input.importedGameId,
      importedGame: { userId: input.userId },
      id: { gt: input.afterRunId },
      status: 'FAILED',
      error: input.error,
    },
    orderBy: { id: 'desc' },
    select: { id: true },
  });
  if (failed) return failed.id;

  const running = await prisma.gameAnalysisRun.findMany({
    where: {
      importedGameId: input.importedGameId,
      importedGame: { userId: input.userId },
      id: { gt: input.afterRunId },
      status: 'RUNNING',
    },
    orderBy: { id: 'desc' },
    take: 2,
    select: { id: true },
  });
  return running.length === 1 ? running[0].id : null;
}

export async function abandonGameAnalysisRun(runId: number): Promise<boolean> {
  return prisma.$transaction(async (transaction) => {
    const run = await transaction.gameAnalysisRun.findUnique({
      where: { id: runId },
      select: { id: true, importedGameId: true, status: true },
    });
    if (!run || !['RUNNING', 'FAILED'].includes(run.status)) return false;

    const snapshots = await transaction.$queryRaw<Array<{ latestAnalysisRunId: number | null }>>(
      Prisma.sql`
        SELECT "latestAnalysisRunId"
        FROM "ImportedGame"
        WHERE "id" = ${run.importedGameId}
        FOR UPDATE
      `,
    );
    if (!snapshots.length) return false;

    const deleted = await transaction.gameAnalysisRun.deleteMany({
      where: {
        id: run.id,
        status: { in: ['RUNNING', 'FAILED'] },
      },
    });
    if (deleted.count !== 1) return false;

    if (snapshots[0].latestAnalysisRunId !== run.id) return true;

    const previous = await transaction.gameAnalysisRun.findFirst({
      where: {
        importedGameId: run.importedGameId,
        status: { in: [...latestRunStatuses] },
      },
      orderBy: [
        { createdAt: 'desc' },
        { id: 'desc' },
      ],
      select: {
        id: true,
        status: true,
        createdAt: true,
        completedAt: true,
        whiteAccuracy: true,
        blackAccuracy: true,
      },
    });

    await transaction.importedGame.update({
      where: { id: run.importedGameId },
      data: {
        latestAnalysisRunId: null,
        latestAnalysisStatus: null,
        latestAnalysisCreatedAt: null,
        latestAnalysisCompletedAt: null,
        latestWhiteAccuracy: null,
        latestBlackAccuracy: null,
      },
    });

    if (previous) {
      await transaction.importedGame.update({
        where: { id: run.importedGameId },
        data: {
          latestAnalysisRunId: previous.id,
          latestAnalysisStatus: previous.status,
          latestAnalysisCreatedAt: previous.createdAt,
          latestAnalysisCompletedAt: previous.completedAt,
          latestWhiteAccuracy: previous.whiteAccuracy,
          latestBlackAccuracy: previous.blackAccuracy,
        },
      });
    }

    return true;
  });
}
