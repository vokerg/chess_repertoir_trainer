import prisma from '../prisma';

export type ExternalProvider = 'LICHESS' | 'CHESS_COM';

function normalizeUsername(username: string) {
  return username.trim();
}

async function getDefaultProgressAccountId(userId: number): Promise<number | null> {
  const user = await prisma.appUser.findUnique({
    where: { id: userId },
    select: { defaultProgressAccountId: true },
  });
  return user?.defaultProgressAccountId ?? null;
}

function withDefaultProgressFlag<T extends { id: number }>(account: T, defaultProgressAccountId: number | null) {
  return {
    ...account,
    isDefaultProgressAccount: account.id === defaultProgressAccountId,
  };
}

async function listAccountsForUser(userId: number) {
  const [accounts, defaultProgressAccountId] = await Promise.all([
    prisma.externalAccount.findMany({
      where: { userId },
      orderBy: [{ provider: 'asc' }, { username: 'asc' }],
    }),
    getDefaultProgressAccountId(userId),
  ]);

  return accounts.map((account) => withDefaultProgressFlag(account, defaultProgressAccountId));
}

export const ExternalAccountService = {
  listForUser: async (userId: number) => {
    return listAccountsForUser(userId);
  },

  createForUser: async (userId: number, data: { provider: ExternalProvider; username: string; displayName?: string }) => {
    const username = normalizeUsername(data.username);

    const account = await prisma.externalAccount.upsert({
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
    return withDefaultProgressFlag(account, await getDefaultProgressAccountId(userId));
  },

  getForUser: async (userId: number, id: number) => {
    const account = await prisma.externalAccount.findFirst({
      where: { id, userId },
    });
    if (!account) return null;
    return withDefaultProgressFlag(account, await getDefaultProgressAccountId(userId));
  },

  updateForUser: async (userId: number, id: number, data: { displayName?: string | null; isActive?: boolean }) => {
    const existing = await prisma.externalAccount.findFirst({ where: { id, userId } });
    if (!existing) return null;

    const account = await prisma.externalAccount.update({
      where: { id },
      data,
    });
    return withDefaultProgressFlag(account, await getDefaultProgressAccountId(userId));
  },

  resetSyncCursorForUser: async (userId: number, id: number) => {
    const existing = await prisma.externalAccount.findFirst({ where: { id, userId } });
    if (!existing) return null;

    const account = await prisma.externalAccount.update({
      where: { id },
      data: {
        syncCursorTime: null,
      },
    });
    return withDefaultProgressFlag(account, await getDefaultProgressAccountId(userId));
  },

  deleteForUser: async (userId: number, id: number) => {
    const existing = await prisma.externalAccount.findFirst({ where: { id, userId } });
    if (!existing) return null;
    const defaultProgressAccountId = await getDefaultProgressAccountId(userId);

    await prisma.$transaction(async (tx) => {
      if (defaultProgressAccountId === id) {
        await tx.appUser.update({
          where: { id: userId },
          data: { defaultProgressAccountId: null },
        });
      }

      await tx.externalAccount.delete({
        where: { id },
      });
    });

    return withDefaultProgressFlag(existing, defaultProgressAccountId);
  },

  setDefaultProgressAccount: async (userId: number, accountId: number | null) => {
    if (accountId !== null) {
      const account = await prisma.externalAccount.findFirst({
        where: { id: accountId, userId },
      });
      if (!account) return null;
    }

    await prisma.appUser.update({
      where: { id: userId },
      data: { defaultProgressAccountId: accountId },
    });

    const accounts = await listAccountsForUser(userId);
    return {
      defaultProgressAccountId: accountId,
      account: accounts.find((account) => account.id === accountId) ?? null,
      accounts,
    };
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
