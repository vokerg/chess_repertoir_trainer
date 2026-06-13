import prisma from '../prisma';
import { RequestAuth } from './request-auth';

interface ClerkIdentity {
  externalSubject: string;
  email?: string;
}

export const CurrentAppUserService = {
  resolveDevUser: async (userId: number) => {
    const user = await prisma.appUser.upsert({
      where: { id: userId },
      update: {
        authProvider: 'dev',
        authSubject: 'dev-single-user',
      },
      create: {
        id: userId,
        displayName: 'Local user',
        authProvider: 'dev',
        authSubject: 'dev-single-user',
      },
    });

    return {
      user,
      auth: {
        userId: user.id,
        provider: 'dev',
        externalSubject: 'dev-single-user',
      } satisfies RequestAuth,
    };
  },

  resolveClerkUser: async (identity: ClerkIdentity) => {
    const user = await prisma.appUser.upsert({
      where: {
        authProvider_authSubject: {
          authProvider: 'clerk',
          authSubject: identity.externalSubject,
        },
      },
      update: { email: identity.email },
      create: {
        authProvider: 'clerk',
        authSubject: identity.externalSubject,
        email: identity.email,
      },
    });

    return {
      user,
      auth: {
        userId: user.id,
        provider: 'clerk',
        externalSubject: identity.externalSubject,
        ...(identity.email ? { email: identity.email } : {}),
      } satisfies RequestAuth,
    };
  },

  getById: (userId: number) => prisma.appUser.findUniqueOrThrow({ where: { id: userId } }),
};
