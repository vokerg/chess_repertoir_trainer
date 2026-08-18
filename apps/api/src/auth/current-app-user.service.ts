import { PrismaClient } from '@prisma/client';
import prisma from '../prisma';
import { assertDataLifecycleWriteAllowed } from '../modules/data-lifecycle/data-lifecycle.guard';
import {
  DeletedIdentityLifecycleGuard,
  type DeletedIdentityGuard,
} from '../modules/data-lifecycle/deleted-identity.guard';
import { RequestAuth } from './request-auth';

export interface ExternalIdentity {
  provider: string;
  externalSubject: string;
  email?: string;
  displayName?: string;
}

export function createCurrentAppUserService(
  database: PrismaClient = prisma,
  deletedIdentityGuard: DeletedIdentityGuard = DeletedIdentityLifecycleGuard,
) {
  return {
    resolveDevUser: async (userId: number) => database.$transaction(async (transaction) => {
      // Identity -> user is the canonical lock order for auth provisioning and
      // final user deletion. The tombstone check therefore serializes a fresh
      // session against deletion before we touch the AppUser row.
      await deletedIdentityGuard.assertCanProvision(
        transaction,
        'dev',
        'dev-single-user',
      );
      await assertDataLifecycleWriteAllowed(transaction, { userId });

      const user = await transaction.appUser.upsert({
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
    }),

    resolveExternalUser: async (identity: ExternalIdentity) => database.$transaction(async (transaction) => {
      // Lock/check the identity before reading AppUser. Concurrent first-time
      // provisioning therefore cannot race the unique auth identity, and a
      // deleting transaction that writes the tombstone first wins atomically.
      await deletedIdentityGuard.assertCanProvision(
        transaction,
        identity.provider,
        identity.externalSubject,
      );

      const existing = await transaction.appUser.findUnique({
        where: {
          authProvider_authSubject: {
            authProvider: identity.provider,
            authSubject: identity.externalSubject,
          },
        },
        select: { id: true },
      });

      let user;
      if (existing) {
        await assertDataLifecycleWriteAllowed(transaction, { userId: existing.id });
        user = await transaction.appUser.update({
          where: { id: existing.id },
          data: {
            email: identity.email,
            displayName: identity.displayName,
          },
        });
      } else {
        user = await transaction.appUser.create({
          data: {
            authProvider: identity.provider,
            authSubject: identity.externalSubject,
            email: identity.email,
            displayName: identity.displayName,
          },
        });
      }

      return {
        user,
        auth: {
          userId: user.id,
          provider: identity.provider,
          externalSubject: identity.externalSubject,
          ...(identity.email ? { email: identity.email } : {}),
        } satisfies RequestAuth,
      };
    }),

    getById: (userId: number) => database.appUser.findUniqueOrThrow({ where: { id: userId } }),
  };
}

export const CurrentAppUserService = createCurrentAppUserService();
