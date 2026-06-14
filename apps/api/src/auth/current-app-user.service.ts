import prisma from '../prisma';
import { RequestAuth } from './request-auth';

export interface ExternalIdentity {
  provider: string;
  externalSubject: string;
  email?: string;
  displayName?: string;
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

  resolveExternalUser: async (identity: ExternalIdentity) => {
    const user = await prisma.appUser.upsert({
      where: {
        authProvider_authSubject: {
          authProvider: identity.provider,
          authSubject: identity.externalSubject,
        },
      },
      update: {
        email: identity.email,
        displayName: identity.displayName,
      },
      create: {
        authProvider: identity.provider,
        authSubject: identity.externalSubject,
        email: identity.email,
        displayName: identity.displayName,
      },
    });

    return {
      user,
      auth: {
        userId: user.id,
        provider: identity.provider,
        externalSubject: identity.externalSubject,
        ...(identity.email ? { email: identity.email } : {}),
      } satisfies RequestAuth,
    };
  },

  getById: (userId: number) => prisma.appUser.findUniqueOrThrow({ where: { id: userId } }),
};
