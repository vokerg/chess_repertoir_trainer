import prisma from '../../prisma';

export const SINGLETON_USER_ID = 1;

export const CurrentUserService = {
  getOrCreate: async () => {
    return prisma.appUser.upsert({
      where: { id: SINGLETON_USER_ID },
      update: {},
      create: {
        id: SINGLETON_USER_ID,
        displayName: 'Local user',
      },
    });
  },
};
