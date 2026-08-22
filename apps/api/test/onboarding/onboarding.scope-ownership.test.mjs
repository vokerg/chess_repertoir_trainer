import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createOnboardingReadRepository } from '../../dist/modules/onboarding/onboarding.repository.prisma.js';
import prismaModule from '../../dist/prisma.js';

const prisma = prismaModule.default;
const repository = createOnboardingReadRepository(prisma);
const suffix = randomUUID();
const requestedFrom = new Date('2026-05-20T00:00:00.000Z');
const requestedTo = new Date('2026-08-21T00:00:00.000Z');
let requestingUser = null;
let foreignUser = null;

try {
  requestingUser = await prisma.appUser.create({
    data: {
      displayName: 'Onboarding scope ownership requester',
      authProvider: 'test',
      authSubject: `onboarding-scope-requester-${suffix}`,
    },
  });
  foreignUser = await prisma.appUser.create({
    data: {
      displayName: 'Onboarding scope ownership foreign user',
      authProvider: 'test',
      authSubject: `onboarding-scope-foreign-${suffix}`,
    },
  });
  const foreignAccount = await prisma.externalAccount.create({
    data: {
      userId: foreignUser.id,
      provider: 'lichess',
      username: `scope-foreign-${suffix}`,
    },
  });
  const foreignPreparation = await prisma.dataPreparationRun.create({
    data: {
      userId: foreignUser.id,
      purpose: 'ONBOARDING',
      status: 'RUNNING',
      recipeVersion: 1,
      recipeJson: {},
      targets: {
        create: [{
          accountId: foreignAccount.id,
          accountProvider: 'lichess',
          accountUsername: foreignAccount.username,
          ordinal: 0,
          scopeVersion: 1,
          scopeHash: 'd'.repeat(64),
          scopeJson: { rated: 'ANY', speedCategories: [], variants: [] },
          requestedFrom,
          requestedTo,
        }],
      },
    },
    include: { targets: true },
  });
  const foreignTarget = foreignPreparation.targets[0];
  await prisma.dataPreparationBatch.createMany({
    data: [{
      preparationRunId: foreignPreparation.id,
      targetId: foreignTarget.id,
      stage: 'INDEX',
      lane: 'FIRST_INDEX',
      ordinal: 0,
      status: 'RUNNING',
      plannedLimit: 1,
      totalTasks: 1,
    }, {
      preparationRunId: foreignPreparation.id,
      targetId: foreignTarget.id,
      stage: 'ANALYSIS',
      lane: 'FIRST_ANALYSIS',
      ordinal: 1,
      status: 'RUNNING',
      plannedLimit: 1,
      totalTasks: 1,
    }],
  });

  const ownerTotals = await repository.getScopeTotals(foreignUser.id, foreignPreparation.id);
  assert.equal(ownerTotals.targetCount, 1);
  assert.equal(ownerTotals.activeIndexBatches, 1);
  assert.equal(ownerTotals.activeAnalysisBatches, 1);

  const foreignTotals = await repository.getScopeTotals(requestingUser.id, foreignPreparation.id);
  assert.equal(foreignTotals.targetCount, 0);
  assert.equal(foreignTotals.activeIndexBatches, 0);
  assert.equal(foreignTotals.activeAnalysisBatches, 0);
  assert.equal(foreignTotals.committedCount, 0);
  assert.equal(foreignTotals.indexedCount, 0);
  assert.equal(foreignTotals.analysedCount, 0);

  console.log('Onboarding scope aggregate ownership isolation tests passed.');
} finally {
  if (requestingUser) await prisma.appUser.delete({ where: { id: requestingUser.id } });
  if (foreignUser) await prisma.appUser.delete({ where: { id: foreignUser.id } });
  await prisma.$disconnect();
}
