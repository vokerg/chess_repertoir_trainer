import prisma from '../prisma';

export type ExternalProvider = 'LICHESS' | 'CHESS_COM';

function normalizeUsername(username: string) {
  return username.trim();
}

export const ExternalAccountService = {
  listForUser: async (userId: number) => {
    return prisma.externalAccount.findMany({
      where: { userId },
      orderBy: [{ provider: 'asc' }, { username: 'asc' }],
    });
  },

  createForUser: async (userId: number, data: { provider: ExternalProvider; username: string; displayName?: string }) => {
    const username = normalizeUsername(data.username);

    return prisma.externalAccount.upsert({
      where: {
        userId_provider_username: {
          userId,
          provider: data.provider,
          username,
        },
      },
      update: {
        displayName: data.displayName ?? undefined,
        isActive: true,
      },
      create: {
        userId,
        provider: data.provider,
        username,
        displayName: data.displayName,
      },
    });
  },

  getForUser: async (userId: number, id: number) => {
    return prisma.externalAccount.findFirst({
      where: { id, userId },
    });
  },

  updateForUser: async (userId: number, id: number, data: { displayName?: string | null; isActive?: boolean }) => {
    const existing = await prisma.externalAccount.findFirst({ where: { id, userId } });
    if (!existing) return null;

    return prisma.externalAccount.update({
      where: { id },
      data,
    });
  },

  resetSyncCursorForUser: async (userId: number, id: number) => {
    const existing = await prisma.externalAccount.findFirst({ where: { id, userId } });
    if (!existing) return null;

    return prisma.externalAccount.update({
      where: { id },
      data: {
        syncCursorTime: null,
      },
    });
  },

  deleteForUser: async (userId: number, id: number) => {
    const existing = await prisma.externalAccount.findFirst({ where: { id, userId } });
    if (!existing) return null;

    await prisma.externalAccount.delete({
      where: { id },
    });

    return existing;
  },

  listGamesForUser: async (userId: number, accountId: number, take = 50, skip = 0) => {
    return prisma.importedGame.findMany({
      where: { userId, accountId },
      orderBy: [{ endedAt: 'desc' }, { id: 'desc' }],
      take,
      skip,
    });
  },
};
