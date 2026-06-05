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

export async function updateImportedGamePlyAnalysis(gameId: number, updates: PlyAnalysisUpdate[]) {
  return prisma.$transaction(async (tx) => {
    const game = await tx.importedGame.findFirst({
      where: { id: gameId, userId: SINGLETON_USER_ID },
      select: { id: true },
    });
    if (!game) throw new Error('Imported game not found');

    let updatedPlies = 0;
    for (const update of updates) {
      const result = await tx.importedGamePly.updateMany({
        where: { importedGameId: gameId, plyNumber: update.plyNumber },
        data: {
          scoreLossCp: update.scoreLossCp,
          classificationCode: update.classificationCode,
        },
      });
      updatedPlies += result.count;
    }

    return { importedGameId: gameId, updatedPlies };
  });
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
