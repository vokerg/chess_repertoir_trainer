import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import prismaModule from '../../dist/prisma.js';
import { DEFAULT_PREPARATION_CONFIG } from '../../dist/modules/preparation/preparation.config.js';
import { createPreparationRepository } from '../../dist/modules/preparation/preparation.repository.prisma.js';

const prisma = prismaModule.default;
const repository = createPreparationRepository(prisma, DEFAULT_PREPARATION_CONFIG);
const suffix = randomUUID();
let userId = null;

try {
  const user = await prisma.appUser.create({
    data: {
      displayName: 'Preparation max tasks',
      authProvider: 'test',
      authSubject: `preparation-max-tasks-${suffix}`,
    },
  });
  userId = user.id;
  const account = await prisma.externalAccount.create({
    data: {
      userId: user.id,
      provider: 'LICHESS',
      username: `preparation-max-tasks-${suffix}`,
    },
  });

  const games = await Promise.all([
    createIndexedGame(user.id, account.id, 'older', new Date('2026-01-01T00:00:00.000Z')),
    createIndexedGame(user.id, account.id, 'newer', new Date('2026-01-02T00:00:00.000Z')),
  ]);
  const preparation = await repository.createRun({
    userId: user.id,
    purpose: 'ONBOARDING',
    recipeVersion: 1,
    recipe: { accountId: account.id },
    targets: [{
      accountId: account.id,
      ordinal: 0,
      scopeVersion: 1,
      scopeHash: 'a'.repeat(64),
      scope: {
        rated: 'ANY',
        speedCategories: ['BLITZ'],
        variants: ['STANDARD'],
      },
      requestedFrom: new Date('2025-01-01T00:00:00.000Z'),
      requestedTo: new Date('2027-01-01T00:00:00.000Z'),
    }],
  });

  const admission = await repository.admitNextBatch({
    userId: user.id,
    preparationRunId: preparation.run.id,
    targetId: preparation.targets[0].id,
    stage: 'ANALYSIS',
    lane: 'FIRST_ANALYSIS',
    maxTasks: 1,
  });

  assert.equal(admission.outcome, 'CREATED');
  assert.equal(admission.plannedLimit, 1, 'the retained batch records the stricter fallback cap');
  assert.deepEqual(
    admission.importedGameIds,
    [games[1].id],
    'the stricter cap still preserves newest-first candidate selection',
  );

  const batch = await prisma.dataPreparationBatch.findUnique({
    where: { id: admission.batchId },
    select: { plannedLimit: true, totalTasks: true },
  });
  assert.deepEqual(batch, { plannedLimit: 1, totalTasks: 1 });

  const tasks = await prisma.jobTask.findMany({
    where: { jobRunId: admission.jobRunId },
    select: { importedGameId: true },
  });
  assert.deepEqual(tasks, [{ importedGameId: games[1].id }]);
} finally {
  if (userId !== null) {
    await prisma.appUser.deleteMany({ where: { id: userId } });
  }
  await prisma.$disconnect();
}

console.log('Preparation maxTasks admission test passed.');

function createIndexedGame(userIdValue, accountId, label, endedAt) {
  return prisma.importedGame.create({
    data: {
      userId: userIdValue,
      accountId,
      provider: 'LICHESS',
      providerGameId: `preparation-max-tasks-${label}-${suffix}`,
      pgn: '1. e4 e5',
      rated: true,
      variant: 'standard',
      speedCategory: 'blitz',
      endedAt,
      plyIndexedAt: new Date('2026-01-03T00:00:00.000Z'),
    },
  });
}
