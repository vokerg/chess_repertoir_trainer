import prisma from '../../prisma';
import { SINGLETON_USER_ID } from '../../services/currentUserService';
import { PositionAnalysisResult } from './analysis.types';

const compactGameAnalysisRunInclude = {
  moves: {
    orderBy: { plyNumber: 'asc' as const },
    include: {
      positionAnalysis: {
        select: {
          id: true,
          bestMoveUci: true,
          bestScoreCpWhite: true,
          playedScoreCpWhite: true,
        },
      },
    },
  },
};

export async function getImportedGameForAnalysis(importedGameId: number) {
  return prisma.importedGame.findFirst({
    where: { id: importedGameId, userId: SINGLETON_USER_ID },
  });
}

export async function getExistingGameAnalysis(importedGameId: number, settings: {
  depth: number;
  multipv: number;
  engineName: string;
  engineVersion?: string;
}) {
  return prisma.gameAnalysisRun.findFirst({
    where: {
      importedGameId,
      importedGame: { userId: SINGLETON_USER_ID },
      status: { in: ['RUNNING', 'COMPLETED'] },
      depth: settings.depth,
      multipv: settings.multipv,
      engineName: settings.engineName,
      engineVersion: settings.engineVersion ?? null,
    },
    orderBy: { createdAt: 'desc' },
    include: compactGameAnalysisRunInclude,
  });
}

export async function getLatestGameAnalysisForImportedGame(importedGameId: number) {
  return prisma.gameAnalysisRun.findFirst({
    where: {
      importedGameId,
      importedGame: { userId: SINGLETON_USER_ID },
      status: { in: ['RUNNING', 'COMPLETED'] },
    },
    orderBy: { createdAt: 'desc' },
    include: compactGameAnalysisRunInclude,
  });
}

export async function createGameAnalysisRun(data: {
  importedGameId: number;
  depth: number;
  multipv: number;
  engineName: string;
  engineVersion?: string;
  positionsTotal: number;
}) {
  return prisma.gameAnalysisRun.create({
    data: {
      importedGameId: data.importedGameId,
      status: 'RUNNING',
      depth: data.depth,
      multipv: data.multipv,
      engineName: data.engineName,
      engineVersion: data.engineVersion,
      positionsTotal: data.positionsTotal,
      positionsDone: 0,
    },
  });
}

export async function completeGameAnalysisRun(id: number, summary: unknown, positionsDone: number) {
  return prisma.gameAnalysisRun.update({
    where: { id },
    data: {
      status: 'COMPLETED',
      summary: summary as any,
      positionsDone,
      completedAt: new Date(),
    },
    include: compactGameAnalysisRunInclude,
  });
}

export async function failGameAnalysisRun(id: number, error: string, positionsDone: number) {
  return prisma.gameAnalysisRun.update({
    where: { id },
    data: {
      status: 'FAILED',
      error,
      positionsDone,
      completedAt: new Date(),
    },
  });
}

export async function findPositionAnalysis(cacheKey: string) {
  return prisma.positionAnalysis.findUnique({ where: { cacheKey } });
}

export async function createPositionAnalysis(cacheKey: string, result: PositionAnalysisResult) {
  return prisma.positionAnalysis.create({
    data: {
      cacheKey,
      fen: result.fen,
      normalizedFen: result.normalizedFen,
      playedMoveUci: result.playedMoveUci,
      depth: result.depth,
      multipv: result.multipv,
      engineName: result.engineName,
      engineVersion: result.engineVersion,
      classificationVersion: result.classificationVersion,
      bestMoveUci: result.bestMoveUci,
      bestScoreCpWhite: result.bestScoreCpWhite,
      playedScoreCpWhite: result.playedScoreCpWhite,
      scoreLossCp: result.scoreLossCp,
      classification: result.classification,
      lines: result.lines as any,
      playedLine: result.playedLine as any,
    },
  });
}

export async function createGameMoveAnalysis(data: {
  analysisRunId: number;
  importedGameId: number;
  positionAnalysisId: number;
  plyNumber: number;
  moveNumber: number;
  side: string;
  fenBefore: string;
  fenAfter: string;
  playedMoveUci: string;
  playedMoveSan?: string;
  classification?: string;
  scoreLossCp?: number;
}) {
  return prisma.gameMoveAnalysis.create({
    data: {
      analysisRunId: data.analysisRunId,
      importedGameId: data.importedGameId,
      positionAnalysisId: data.positionAnalysisId,
      plyNumber: data.plyNumber,
      moveNumber: data.moveNumber,
      side: data.side,
      fenBefore: data.fenBefore,
      fenAfter: data.fenAfter,
      playedMoveUci: data.playedMoveUci,
      playedMoveSan: data.playedMoveSan,
      classification: data.classification,
      scoreLossCp: data.scoreLossCp,
    },
  });
}
