import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createOnboardingReadRepository } from '../../dist/modules/onboarding/onboarding.repository.prisma.js';
import prismaModule from '../../dist/prisma.js';

const prisma = prismaModule.default;
const repository = createOnboardingReadRepository(prisma);
const suffix = randomUUID();
const requestedFrom = new Date('2026-05-20T00:00:00.000Z');
const requestedTo = new Date('2026-08-21T00:00:00.000Z');
const staleRateLimit = new Date('2026-08-20T08:10:00.000Z');
const activeRateLimit = new Date('2026-08-20T08:20:00.000Z');
let user = null;

try {
  user = await prisma.appUser.create({
    data: {
      displayName: 'Onboarding rate-limit scope test',
      authProvider: 'test',
      authSubject: `onboarding-rate-limit-${suffix}`,
    },
  });
  const completedAccount = await prisma.externalAccount.create({
    data: { userId: user.id, provider: 'lichess', username: `completed-${suffix}` },
  });
  const activeAccount = await prisma.externalAccount.create({
    data: { userId: user.id, provider: 'chess.com', username: `active-${suffix}` },
  });
  const completedImport = await prisma.importRun.create({
    data: {
      userId: user.id,
      accountId: completedAccount.id,
      provider: 'lichess',
      mode: 'BOUNDED_INITIAL',
      source: 'ONBOARDING',
      status: 'COMPLETED',
      scopeVersion: 1,
      scopeHash: 'a'.repeat(64),
      scopeJson: { rated: 'ANY', speedCategories: [], variants: [] },
      requestedFrom,
      requestedTo,
      windowsTotal: 1,
      windowsCompleted: 1,
      rateLimitUntil: staleRateLimit,
      completedAt: new Date('2026-08-20T08:00:00.000Z'),
    },
  });
  const activeImport = await prisma.importRun.create({
    data: {
      userId: user.id,
      accountId: activeAccount.id,
      provider: 'chess.com',
      mode: 'BOUNDED_INITIAL',
      source: 'ONBOARDING',
      status: 'RUNNING',
      scopeVersion: 1,
      scopeHash: 'b'.repeat(64),
      scopeJson: { rated: 'ANY', speedCategories: [], variants: [] },
      requestedFrom,
      requestedTo,
      windowsTotal: 1,
      windowsCompleted: 0,
    },
  });
  const preparation = await prisma.dataPreparationRun.create({
    data: {
      userId: user.id,
      purpose: 'ONBOARDING',
      status: 'RUNNING',
      recipeVersion: 1,
      recipeJson: {},
      targets: {
        create: [{
          accountId: completedAccount.id,
          accountProvider: 'lichess',
          accountUsername: completedAccount.username,
          ordinal: 0,
          scopeVersion: 1,
          scopeHash: 'a'.repeat(64),
          scopeJson: { rated: 'ANY', speedCategories: [], variants: [] },
          requestedFrom,
          requestedTo,
          currentImportRunId: completedImport.id,
        }, {
          accountId: activeAccount.id,
          accountProvider: 'chess.com',
          accountUsername: activeAccount.username,
          ordinal: 1,
          scopeVersion: 1,
          scopeHash: 'b'.repeat(64),
          scopeJson: { rated: 'ANY', speedCategories: [], variants: [] },
          requestedFrom,
          requestedTo,
          currentImportRunId: activeImport.id,
        }],
      },
    },
  });

  const withoutActiveLimit = await repository.getScopeTotals(user.id, preparation.id);
  assert.equal(withoutActiveLimit.rateLimitUntil, null);

  await prisma.importRun.update({
    where: { id: activeImport.id },
    data: { rateLimitUntil: activeRateLimit },
  });
  const withActiveLimit = await repository.getScopeTotals(user.id, preparation.id);
  assert.equal(withActiveLimit.rateLimitUntil?.toISOString(), activeRateLimit.toISOString());

  console.log('Onboarding active import rate-limit scope tests passed.');
} finally {
  if (user) await prisma.appUser.delete({ where: { id: user.id } });
  await prisma.$disconnect();
}
