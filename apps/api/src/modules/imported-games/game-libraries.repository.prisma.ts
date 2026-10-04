import prisma from '../../prisma';
import { lockDataLifecycleUserScope } from '../data-lifecycle/data-lifecycle.guard';

export const GameLibrariesRepository = {
  list(userId: number) {
    return prisma.gameLibrary.findMany({ where: { userId }, orderBy: [{ name: 'asc' }, { id: 'asc' }],
      select: { id: true, name: true, _count: { select: { games: true } } } });
  },
  create(userId: number, name: string) {
    return prisma.$transaction(async (tx) => {
      await lockDataLifecycleUserScope(tx, userId);
      return tx.gameLibrary.create({ data: { userId, name }, select: { id: true, name: true } });
    });
  },
  rename(userId: number, id: number, name: string) {
    return prisma.$transaction(async (tx) => {
      await lockDataLifecycleUserScope(tx, userId);
      return tx.gameLibrary.updateMany({ where: { id, userId }, data: { name } });
    });
  },
  remove(userId: number, id: number) {
    return prisma.$transaction(async (tx) => {
      await lockDataLifecycleUserScope(tx, userId);
      return tx.gameLibrary.deleteMany({ where: { id, userId } });
    });
  },
  like(userId: number, id: number, liked: boolean) {
    return prisma.$transaction(async (tx) => {
      await lockDataLifecycleUserScope(tx, userId);
      return tx.importedGame.updateMany({ where: { id, userId }, data: { liked } });
    });
  },
  async setMembership(userId: number, libraryId: number, gameId: number, included: boolean) {
    return prisma.$transaction(async (tx) => {
      // Match the lifecycle lock order before acquiring row locks.
      await lockDataLifecycleUserScope(tx, userId);
      // Lock both owned parents: deletion cannot race the membership write.
      const libraries = await tx.$queryRaw<Array<{ id: number }>>`
        SELECT "id" FROM "GameLibrary" WHERE "id" = ${libraryId} AND "userId" = ${userId} FOR UPDATE`;
      const games = await tx.$queryRaw<Array<{ id: number }>>`
        SELECT "id" FROM "ImportedGame" WHERE "id" = ${gameId} AND "userId" = ${userId} FOR UPDATE`;
      if (!libraries.length || !games.length) return false;
      if (included) {
        await tx.gameLibraryEntry.upsert({ where: { libraryId_gameId: { libraryId, gameId } },
          create: { libraryId, gameId }, update: {} });
      } else {
        await tx.gameLibraryEntry.deleteMany({ where: { libraryId, gameId } });
      }
      return true;
    });
  },
};
