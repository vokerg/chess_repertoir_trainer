import { Prisma } from '@prisma/client';
import prisma from '../../prisma';
import { SINGLETON_USER_ID } from '../../services/currentUserService';

export type ImportedGameForPlyIndex = {
  id: number;
  pgn: string | null;
  plyIndexedAt: Date | null;
  plyIndexError: string | null;
};

export type ImportedGamePlyCreateInput = Prisma.ImportedGamePlyCreateManyInput;

export async function getImportedGameForPlyIndex(importedGameId: number): Promise<ImportedGameForPlyIndex | null> {
  return prisma.importedGame.findFirst({
    where: { id: importedGameId, userId: SINGLETON_USER_ID },
    select: {
      id: true,
      pgn: true,
      plyIndexedAt: true,
      plyIndexError: true,
    },
  });
}

export async function clearPlyRowsForGame(importedGameId: number) {
  return prisma.$transaction(async (tx) => {
    await tx.importedGamePly.deleteMany({ where: { importedGameId } });
    return tx.importedGame.update({
      where: { id: importedGameId },
      data: {
        plyIndexedAt: null,
        plyIndexError: null,
      },
      select: { id: true },
    });
  });
}

export async function replacePlyRowsForGame(importedGameId: number, rows: ImportedGamePlyCreateInput[]) {
  return prisma.$transaction(async (tx) => {
    await tx.importedGamePly.deleteMany({ where: { importedGameId } });
    if (rows.length > 0) {
      await tx.importedGamePly.createMany({ data: rows });
    }

    const game = await tx.importedGame.update({
      where: { id: importedGameId },
      data: {
        plyIndexedAt: new Date(),
        plyIndexError: null,
      },
      select: {
        id: true,
        plyIndexedAt: true,
      },
    });

    return {
      importedGameId: game.id,
      plyIndexedAt: game.plyIndexedAt,
      pliesIndexed: rows.length,
    };
  });
}

export async function markPlyIndexFailure(importedGameId: number, message: string) {
  return prisma.importedGame.update({
    where: { id: importedGameId },
    data: {
      plyIndexedAt: null,
      plyIndexError: message,
    },
    select: { id: true, plyIndexError: true },
  });
}

export async function countPlyRowsForGame(importedGameId: number) {
  return prisma.importedGamePly.count({ where: { importedGameId } });
}
