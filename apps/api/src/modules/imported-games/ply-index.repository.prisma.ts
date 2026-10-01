import { Prisma } from '@prisma/client';
import { encodeUciMove } from 'chess-domain';
import prisma from '../../prisma';
import {
  compactPositionIdentity,
  compactPositionMapKey,
  normalizedFenFromPosition,
  positionIdentitySelect,
  transitionalPositionWriteFields,
} from '../positions/position-storage';

export type ImportedGameForPlyIndex = {
  id: number;
  pgn: string | null;
  plyIndexedAt: Date | null;
  plyIndexError: string | null;
};

export type ImportedGamePlyCreateInput = Pick<Prisma.ImportedGamePlyCreateManyInput, 'importedGameId' | 'plyNumber'> & {
  moveUci: string;
  normalizedFen: string;
};

export async function getImportedGameForPlyIndex(userId: number, importedGameId: number): Promise<ImportedGameForPlyIndex | null> {
  return prisma.importedGame.findFirst({
    where: { id: importedGameId, userId },
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
      const positionsByCompact = new Map<string, { normalizedFen: string; positionDataCompact: Uint8Array<ArrayBuffer> }>();
      for (const row of rows) {
        const positionDataCompact = compactPositionIdentity(row.normalizedFen);
        const key = compactPositionMapKey(positionDataCompact);
        const existing = positionsByCompact.get(key);
        if (existing && existing.normalizedFen !== row.normalizedFen) {
          throw new Error(`Position compact invariant failed before ply write: ${existing.normalizedFen} vs ${row.normalizedFen}`);
        }
        positionsByCompact.set(key, { normalizedFen: row.normalizedFen, positionDataCompact });
      }
      const uniquePositions = [...positionsByCompact.values()];
      await tx.position.createMany({
        data: uniquePositions.map(({ normalizedFen, positionDataCompact }) => transitionalPositionWriteFields(normalizedFen, positionDataCompact)),
        skipDuplicates: true,
      });
      const positions = await tx.position.findMany({
        where: { positionDataCompact: { in: uniquePositions.map(({ positionDataCompact }) => positionDataCompact) } },
        select: positionIdentitySelect,
      });
      const positionIdsByCompact = new Map<string, number>();
      for (const position of positions) {
        normalizedFenFromPosition(position);
        const key = compactPositionMapKey(position.positionDataCompact!);
        const expected = positionsByCompact.get(key);
        if (!expected) throw new Error(`Position compact invariant failed: unexpected Position id=${position.id}`);
        normalizedFenFromPosition(position, expected.normalizedFen);
        positionIdsByCompact.set(key, position.id);
      }

      await tx.importedGamePly.createMany({
        data: rows.map((row) => {
          const positionId = positionIdsByCompact.get(compactPositionMapKey(compactPositionIdentity(row.normalizedFen)));
          if (!positionId) throw new Error(`Position compact invariant failed: could not resolve position for ${row.normalizedFen}`);
          return {
            importedGameId: row.importedGameId,
            plyNumber: row.plyNumber,
            positionId,
            moveCode: encodeUciMove(row.moveUci),
          };
        }),
      });
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
