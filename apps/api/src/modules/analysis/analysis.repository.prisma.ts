import { Prisma } from '@prisma/client';
import { normalizeFenForPosition } from 'chess-domain';
import prisma from '../../prisma';
import { SINGLETON_USER_ID } from '../../services/currentUserService';
import { PlyAnalysisUpdate, StorePositionAnalysisInput } from './analysis.types';

const positionAnalysisInclude = {
  position: {
    select: {
      normalizedFen: true,
    },
  },
} as const;

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

function compactPositionAnalysis(row: any, fromCache = true) {
  return {
    id: row.id,
    positionId: row.positionId,
    normalizedFen: row.position?.normalizedFen ?? '',
    bestMoveUci: row.bestMoveUci ?? undefined,
    bestScoreCpWhite: row.bestScoreCpWhite ?? undefined,
    bestMateWhite: row.bestMateWhite ?? undefined,
    lines: Array.isArray(row.lines) ? row.lines : [],
    fromCache,
  };
}

function dedupePlyAnalysisUpdates(updates: PlyAnalysisUpdate[]) {
  const updatesByPlyNumber = new Map<number, PlyAnalysisUpdate>();
  for (const update of updates) {
    updatesByPlyNumber.set(update.plyNumber, update);
  }
  return Array.from(updatesByPlyNumber.values()).sort((left, right) => left.plyNumber - right.plyNumber);
}

export async function findOrCreatePositionByNormalizedFen(normalizedFen: string) {
  try {
    return await prisma.position.create({ data: { normalizedFen } });
  } catch {
    const position = await prisma.position.findUnique({ where: { normalizedFen } });
    if (position) return position;
    throw new Error('Could not create or find position');
  }
}

export async function findOrCreatePositionByFen(fen: string) {
  return findOrCreatePositionByNormalizedFen(normalizeFenForPosition(fen));
}

export async function getPositionAnalysisByFen(fen: string) {
  const normalizedFen = normalizeFenForPosition(fen);
  const row = await prisma.positionAnalysis.findFirst({
    where: { position: { normalizedFen } },
    include: positionAnalysisInclude,
  });
  return row ? compactPositionAnalysis(row) : null;
}

export async function getPositionAnalysesByFens(fens: string[]) {
  const normalizedFens = Array.from(new Set(fens.map((fen) => normalizeFenForPosition(fen))));
  if (!normalizedFens.length) return [];

  const rows = await prisma.positionAnalysis.findMany({
    where: { position: { normalizedFen: { in: normalizedFens } } },
    include: positionAnalysisInclude,
  });
  return rows.map((row) => compactPositionAnalysis(row));
}

export async function getPositionAnalysisByPositionId(positionId: number) {
  const row = await prisma.positionAnalysis.findUnique({
    where: { positionId },
    include: positionAnalysisInclude,
  });
  return row ? compactPositionAnalysis(row) : null;
}

export async function upsertPositionAnalysis(positionId: number, data: StorePositionAnalysisInput) {
  const lines = (data.lines ?? []).slice(0, 3);
  const bestMoveUci = data.bestMoveUci ?? lines[0]?.moveUci ?? lines[0]?.pvUci?.[0];
  const bestScoreCpWhite = data.bestScoreCpWhite ?? lines[0]?.scoreCpWhite;
  const bestMateWhite = data.bestMateWhite ?? lines[0]?.mateWhite;

  const row = await prisma.positionAnalysis.upsert({
    where: { positionId },
    create: {
      positionId,
      bestMoveUci,
      bestScoreCpWhite,
      bestMateWhite,
      lines: lines as any,
    },
    update: {
      bestMoveUci,
      bestScoreCpWhite,
      bestMateWhite,
      lines: lines as any,
    },
    include: positionAnalysisInclude,
  });

  return compactPositionAnalysis(row, false);
}

export async function getImportedGameForAnalysis(importedGameId: number) {
  return prisma.importedGame.findFirst({
    where: { id: importedGameId, userId: SINGLETON_USER_ID },
  });
}

export async function getLatestGameAnalysisForImportedGame(importedGameId: number) {
  return prisma.gameAnalysisRun.findFirst({
    where: {
      importedGameId,
      importedGame: { userId: SINGLETON_USER_ID },
      status: { in: ['RUNNING', 'COMPLETED', 'FAILED'] },
    },
    orderBy: { createdAt: 'desc' },
    include: compactGameAnalysisRunInclude,
  });
}

export async function createClientGameAnalysisRun(data: {
  importedGameId: number;
  positionsDone: number;
  summary: unknown;
  accuracyVersion: string;
  whiteAccuracy: number | null;
  blackAccuracy: number | null;
  whiteAverageCentipawnLoss: number | null;
  blackAverageCentipawnLoss: number | null;
  whiteMovesAnalyzed: number;
  blackMovesAnalyzed: number;
}) {
  return prisma.gameAnalysisRun.create({
    data: {
      importedGameId: data.importedGameId,
      status: 'COMPLETED',
      positionsTotal: data.positionsDone,
      positionsDone: data.positionsDone,
      summary: data.summary as any,
      accuracyVersion: data.accuracyVersion,
      whiteAccuracy: data.whiteAccuracy,
      blackAccuracy: data.blackAccuracy,
      whiteAverageCentipawnLoss: data.whiteAverageCentipawnLoss,
      blackAverageCentipawnLoss: data.blackAverageCentipawnLoss,
      whiteMovesAnalyzed: data.whiteMovesAnalyzed,
      blackMovesAnalyzed: data.blackMovesAnalyzed,
      completedAt: new Date(),
    },
    include: compactGameAnalysisRunInclude,
  });
}

export async function createRunningGameAnalysisRun(data: {
  importedGameId: number;
  positionsTotal: number;
  positionsDone?: number;
}) {
  return prisma.gameAnalysisRun.create({
    data: {
      importedGameId: data.importedGameId,
      status: 'RUNNING',
      positionsTotal: data.positionsTotal,
      positionsDone: data.positionsDone ?? 0,
    },
    include: compactGameAnalysisRunInclude,
  });
}

export async function updateGameAnalysisRunProgress(
  runId: number,
  data: {
    positionsDone: number;
    positionsTotal?: number;
  },
) {
  return prisma.gameAnalysisRun.update({
    where: { id: runId },
    data: {
      positionsDone: data.positionsDone,
      ...(typeof data.positionsTotal === 'number' ? { positionsTotal: data.positionsTotal } : {}),
    },
  });
}

export async function completeGameAnalysisRun(
  runId: number,
  data: {
    positionsTotal: number;
    positionsDone: number;
    summary: unknown;
    accuracyVersion: string;
    whiteAccuracy: number | null;
    blackAccuracy: number | null;
    whiteAverageCentipawnLoss: number | null;
    blackAverageCentipawnLoss: number | null;
    whiteMovesAnalyzed: number;
    blackMovesAnalyzed: number;
  },
) {
  return prisma.gameAnalysisRun.update({
    where: { id: runId },
    data: {
      status: 'COMPLETED',
      positionsTotal: data.positionsTotal,
      positionsDone: data.positionsDone,
      summary: data.summary as any,
      accuracyVersion: data.accuracyVersion,
      whiteAccuracy: data.whiteAccuracy,
      blackAccuracy: data.blackAccuracy,
      whiteAverageCentipawnLoss: data.whiteAverageCentipawnLoss,
      blackAverageCentipawnLoss: data.blackAverageCentipawnLoss,
      whiteMovesAnalyzed: data.whiteMovesAnalyzed,
      blackMovesAnalyzed: data.blackMovesAnalyzed,
      error: null,
      completedAt: new Date(),
    },
    include: compactGameAnalysisRunInclude,
  });
}

export async function failGameAnalysisRun(runId: number, error: string) {
  return prisma.gameAnalysisRun.update({
    where: { id: runId },
    data: {
      status: 'FAILED',
      error,
      completedAt: new Date(),
    },
    include: compactGameAnalysisRunInclude,
  });
}

export async function updateImportedGamePlyAnalysis(gameId: number, updates: PlyAnalysisUpdate[]) {
  const game = await prisma.importedGame.findFirst({
    where: { id: gameId, userId: SINGLETON_USER_ID },
    select: { id: true },
  });
  if (!game) throw new Error('Imported game not found');

  const dedupedUpdates = dedupePlyAnalysisUpdates(updates);
  const updatedRows = dedupedUpdates.length
    ? await prisma.$queryRaw<Array<{ plyNumber: number }>>(Prisma.sql`
        WITH payload AS (
          SELECT *
          FROM unnest(
            ARRAY[${Prisma.join(dedupedUpdates.map((update) => Prisma.sql`${update.plyNumber}`))}]::smallint[],
            ARRAY[${Prisma.join(dedupedUpdates.map((update) => Prisma.sql`${update.scoreLossCp}`))}]::smallint[],
            ARRAY[${Prisma.join(dedupedUpdates.map((update) => Prisma.sql`${update.classificationCode}`))}]::smallint[]
          ) AS input("plyNumber", "scoreLossCp", "classificationCode")
        )
        UPDATE "ImportedGamePly" AS ply
        SET
          "scoreLossCp" = payload."scoreLossCp",
          "classificationCode" = payload."classificationCode"
        FROM payload
        WHERE ply."importedGameId" = ${gameId}
          AND ply."plyNumber" = payload."plyNumber"
        RETURNING ply."plyNumber"
      `)
    : [];

  return { importedGameId: gameId, updatedPlies: updatedRows.length };
}

export async function clearImportedGamePlyAnalysis(gameId: number) {
  return prisma.$transaction(async (tx) => {
    const game = await tx.importedGame.findFirst({
      where: { id: gameId, userId: SINGLETON_USER_ID },
      select: { id: true },
    });
    if (!game) throw new Error('Imported game not found');

    const result = await tx.importedGamePly.updateMany({
      where: { importedGameId: gameId },
      data: { scoreLossCp: null, classificationCode: null },
    });

    return { importedGameId: gameId, clearedPlies: result.count };
  });
}

export async function getImportedGamePliesForAnalysisSummary(gameId: number) {
  return prisma.importedGamePly.findMany({
    where: { importedGameId: gameId, importedGame: { userId: SINGLETON_USER_ID } },
    orderBy: { plyNumber: 'asc' },
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
              lines: true,
            },
          },
        },
      },
    },
  });
}

export async function getImportedGamePliesForBatchAnalysis(gameId: number) {
  return prisma.importedGamePly.findMany({
    where: { importedGameId: gameId, importedGame: { userId: SINGLETON_USER_ID } },
    orderBy: { plyNumber: 'asc' },
    select: {
      plyNumber: true,
      moveUci: true,
      scoreLossCp: true,
      classificationCode: true,
      positionId: true,
      position: {
        select: {
          normalizedFen: true,
          analysis: {
            select: {
              id: true,
              positionId: true,
              bestMoveUci: true,
              bestScoreCpWhite: true,
              bestMateWhite: true,
              lines: true,
              position: {
                select: {
                  normalizedFen: true,
                },
              },
            },
          },
        },
      },
    },
  });
}
