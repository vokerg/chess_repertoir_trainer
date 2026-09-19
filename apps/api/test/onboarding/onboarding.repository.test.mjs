import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createOnboardingReadRepository } from '../../dist/modules/onboarding/onboarding.repository.prisma.js';
import prismaModule from '../../dist/prisma.js';

const prisma = prismaModule.default;
const repository = createOnboardingReadRepository(prisma);
const suffix = randomUUID();
const now = new Date('2026-08-20T09:00:00.000Z');
const requestedFrom = new Date('2026-05-20T00:00:00.000Z');
const requestedTo = new Date('2026-08-21T00:00:00.000Z');
let user = null;

try {
  user = await prisma.appUser.create({
    data: { displayName: 'Onboarding retention test', authProvider: 'test', authSubject: `onboarding-retention-${suffix}` },
  });
  const account = await prisma.externalAccount.create({
    data: { userId: user.id, provider: 'lichess', username: `retention-${suffix}` },
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
          accountId: account.id,
          accountProvider: 'lichess',
          accountUsername: account.username,
          ordinal: 0,
          scopeVersion: 1,
          scopeHash: 'c'.repeat(64),
          scopeJson: { rated: 'ANY', speedCategories: [], variants: [] },
          requestedFrom,
          requestedTo,
        }],
      },
    },
    include: { targets: true },
  });
  const childJob = await prisma.jobRun.create({
    data: {
      userId: user.id,
      kind: 'INDEX_GAMES',
      source: 'ONBOARDING',
      priority: 200,
      status: 'COMPLETED',
      totalTasks: 2,
      startedAt: now,
      completedAt: now,
      tasks: {
        create: [
          { ordinal: 0, status: 'COMPLETED', settledAt: now },
          { ordinal: 1, status: 'SKIPPED', settledAt: now },
        ],
      },
    },
  });
  const batch = await prisma.dataPreparationBatch.create({
    data: {
      preparationRunId: preparation.id,
      targetId: preparation.targets[0].id,
      stage: 'INDEX',
      lane: 'FIRST_INDEX',
      ordinal: 0,
      status: 'COMPLETED',
      plannedLimit: 2,
      jobRunId: childJob.id,
      totalTasks: 2,
      completedTasks: 1,
      skippedTasks: 1,
      startedAt: now,
      firstSettledAt: now,
      settledAt: now,
    },
  });

  const beforeSummary = await repository.getBatchSummary(user.id, preparation.id);
  const beforeLatest = await repository.listLatestBatches(user.id, preparation.id);
  assert.deepEqual(beforeSummary, {
    batchCount: 1,
    queuedBatches: 0,
    runningBatches: 0,
    terminalBatches: 1,
    selectedTasks: 2,
    queuedTasks: 0,
    runningTasks: 0,
    completedTasks: 1,
    skippedTasks: 1,
    failedTasks: 0,
    cancelledTasks: 0,
    remainingTasks: 0,
  });
  assert.equal(beforeLatest[0].id, batch.id);
  assert.equal(beforeLatest[0].completedTasks, 1);
  assert.equal(beforeLatest[0].skippedTasks, 1);

  await prisma.jobRun.delete({ where: { id: childJob.id } });
  const retainedBatch = await prisma.dataPreparationBatch.findUniqueOrThrow({ where: { id: batch.id } });
  assert.equal(retainedBatch.jobRunId, null);

  const afterSummary = await repository.getBatchSummary(user.id, preparation.id);
  const afterLatest = await repository.listLatestBatches(user.id, preparation.id);
  assert.deepEqual(afterSummary, beforeSummary);
  assert.deepEqual(afterLatest, beforeLatest);

  console.log('Onboarding repository child-retention tests passed.');
} finally {
  if (user) await prisma.appUser.delete({ where: { id: user.id } });
  await prisma.$disconnect();
}