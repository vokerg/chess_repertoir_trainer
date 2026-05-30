import prisma from '../prisma';
import { CurrentUserService, SINGLETON_USER_ID } from './currentUserService';

export type ExternalProvider = 'LICHESS' | 'CHESS_COM';

function normalizeUsername(username: string) {
  return username.trim();
}

export const ExternalAccountService = {
  listForCurrentUser: async () => {
    await CurrentUserService.getOrCreate();
    return prisma.externalAccount.findMany({
      where: { userId: SINGLETON_USER_ID },
      orderBy: [{ provider: 'asc' }, { username: 'asc' }],
    });
  },

  createForCurrentUser: async (data: { provider: ExternalProvider; username: string; displayName?: string }) => {
    await CurrentUserService.getOrCreate();
    const username = normalizeUsername(data.username);

    return prisma.externalAccount.upsert({
      where: {
        userId_provider_username: {
          userId: SINGLETON_USER_ID,
          provider: data.provider,
          username,
        },
      },
      update: {
        displayName: data.displayName ?? undefined,
        isActive: true,
      },
      create: {
        userId: SINGLETON_USER_ID,
        provider: data.provider,
        username,
        displayName: data.displayName,
      },
    });
  },

  getForCurrentUser: async (id: number) => {
    await CurrentUserService.getOrCreate();
    return prisma.externalAccount.findFirst({
      where: { id, userId: SINGLETON_USER_ID },
    });
  },

  updateForCurrentUser: async (id: number, data: { displayName?: string | null; isActive?: boolean }) => {
    await CurrentUserService.getOrCreate();
    const existing = await prisma.externalAccount.findFirst({ where: { id, userId: SINGLETON_USER_ID } });
    if (!existing) return null;

    return prisma.externalAccount.update({
      where: { id },
      data,
    });
  },

  resetSyncCursorForCurrentUser: async (id: number) => {
    await CurrentUserService.getOrCreate();
    const existing = await prisma.externalAccount.findFirst({ where: { id, userId: SINGLETON_USER_ID } });
    if (!existing) return null;

    return prisma.externalAccount.update({
      where: { id },
      data: {
        syncCursorTime: null,
      },
    });
  },

  deleteForCurrentUser: async (id: number) => {
    await CurrentUserService.getOrCreate();
    const existing = await prisma.externalAccount.findFirst({ where: { id, userId: SINGLETON_USER_ID } });
    if (!existing) return null;

    await prisma.externalAccount.delete({
      where: { id },
    });

    return existing;
  },

  listGamesForCurrentUser: async (accountId: number, take = 50, skip = 0) => {
    await CurrentUserService.getOrCreate();
    return prisma.importedGame.findMany({
      where: { userId: SINGLETON_USER_ID, accountId },
      orderBy: [{ endedAt: 'desc' }, { id: 'desc' }],
      take,
      skip,
    });
  },
};
