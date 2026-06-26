import { Prisma } from '@prisma/client';
import prisma from '../../prisma';
import {
  assertPositionKeyMatchesFen,
  positionKeyHex,
} from '../positions/position-key';

export type ImportedGameForPlyIndex = {
  id: number;
  pgn: string | null;
  plyIndexedAt: Date | null;
  plyIndexError: string | null;
};

export type ImportedGamePlyCreateInput = Pick<Prisma.ImportedGamePlyCreateManyInput, 'importedGameId' | 'plyNumber' | 'moveUci'> & {
  normalizedFen: string;
  positionKey: Buffer;
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
      const positionsByKey = new Map<string, { normalizedFen: string; positionKey: Buffer }>();

      for (const row of rows) {
        const keyHex = positionKeyHex(row.positionKey);
        const existing = positionsByKey.get(keyHex);

        if (existing && existing.normalizedFen !== row.normalizedFen) {
          throw new Error(
            `Position key collision before DB write for key ${keyHex}: ${existing.normalizedFen} vs ${row.normalizedFen}`,
          );
        }

        positionsByKey.set(keyHex, {
          normalizedFen: row.normalizedFen,
          positionKey: row.positionKey,
        });
      }

      const uniquePositions = Array.from(positionsByKey.values());

      await tx.position.createMany({
        data: uniquePositions.map((position) => ({
          normalizedFen: position.normalizedFen,
          positionKey: new Uint8Array(position.positionKey),
        })),
        skipDuplicates: true,
      });

      const positions = await tx.position.findMany({
        where: {
          positionKey: {
            in: uniquePositions.map((position) => new Uint8Array(position.positionKey)),
          },
        },
        select: {
          id: true,
          positionKey: true,
          normalizedFen: true,
        },
      });

      const expectedFenByKey = new Map(
        uniquePositions.map((position) => [
          positionKeyHex(position.positionKey),
          position.normalizedFen,
        ]),
      );

      const positionIdsByKey = new Map<string, number>();

      for (const position of positions) {
        if (!position.positionKey) {
          throw new Error(`Resolved position ${position.id} has null positionKey`);
        }

        const keyHex = positionKeyHex(position.positionKey);
        const expectedNormalizedFen = expectedFenByKey.get(keyHex);

        if (!expectedNormalizedFen) {
          throw new Error(`Resolved unexpected position key ${keyHex}`);
        }

        assertPositionKeyMatchesFen({
          expectedNormalizedFen,
          actualNormalizedFen: position.normalizedFen,
          positionKey: position.positionKey,
        });

        positionIdsByKey.set(keyHex, position.id);
      }

      await tx.importedGamePly.createMany({
        data: rows.map((row) => {
          const positionId = positionIdsByKey.get(positionKeyHex(row.positionKey));
          if (!positionId) throw new Error(`Could not resolve position for ${row.normalizedFen}`);
          return {
            importedGameId: row.importedGameId,
            plyNumber: row.plyNumber,
            positionId,
            moveUci: row.moveUci,
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
