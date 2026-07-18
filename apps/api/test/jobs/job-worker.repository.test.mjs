import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import prismaModule from '../../dist/prisma.js';
import {
  createJobWorkerRepository,
} from '../../dist/modules/jobs/job-worker.repository.prisma.js';

const prisma = prismaModule.default;
const repository = createJobWorkerRepository(prisma);
const suffix = randomUUID();
let userId;

try {
  const user = await prisma.appUser.create({
    data: {
      displayName: 'Job worker repository test',
      authProvider: 'test',
      authSubject: `job-worker-${suffix}`,
    },
  });
  userId = user.id;

  const account = await prisma.externalAccount.create({
    data: { userId, provider: 'LICHESS', username: `job-worker-${suffix}` },
  });

  const games = await Promise.all([
    'a',
    'b',
    'c',
    'orphan',
    'fair-a1',
    'fair-a2',
    'fair-b1',
    'fair-b2',
    'cancel-stale',
  ].map((name) => (
    prisma.importedGame.create({
      data: {
        userId,
        accountId: account.id,
        provider: 'LICHESS',
        providerGameId: `${name}-${suffix}`,
        endedAt: new Date(`2026-07-${10 + name.length}T12:00:00.000Z`),
      },
    })
  )));
  const [
    gameA,
    gameB,
    gameC,
    orphanGame,
    fairGameA1,
    fairGameA2,
    fairGameB1,
    fairGameB2,
    cancelStaleGame,
  ] = games;

  const lowJob = await createJob({
    userId,
    priority: 100,
    gameIds: [gameA.id],
  });
  const highJob = await createJob({
    userId,
    priority: 200,
    gameIds: [gameB.id, gameC.id],
  });
  await prisma.jobTask.updateMany({
    where: { jobRunId: highJob.id, ordinal: 0 },
    data: { settledAt: new Date('2026-07-01T00:00:00.000Z') },
  });

  assert.equal(
    await repository.hasHigherPriorityRunnableWork(100, ['INDEX_GAMES']),
    true,
  );

  const first = await repository.claimNextTask({ supportedKinds: ['INDEX_GAMES'] });
  assert.ok(first);
  assert.equal(first.jobRunId, highJob.id);
  assert.equal(first.importedGameId, gameB.id);
  assert.equal(first.ordinal, 0);
  assert.match(first.workKey, /^GAME_WORK:/);
  const firstClaimedTask = await prisma.jobTask.findUniqueOrThrow({ where: { id: first.id } });
  assert.ok(firstClaimedTask.startedAt);
  assert.equal(firstClaimedTask.settledAt, null, 'claim clears timing from any prior settlement');
  assert.equal(await repository.finishTask(first, 'COMPLETED'), true);
  const firstSettledTask = await prisma.jobTask.findUniqueOrThrow({ where: { id: first.id } });
  assert.ok(firstSettledTask.settledAt);
  assert.ok(firstSettledTask.settledAt >= firstClaimedTask.startedAt);

  const second = await repository.claimNextTask({
    supportedKinds: ['INDEX_GAMES'],
    jobRunId: highJob.id,
  });
  assert.ok(second);
  assert.equal(second.importedGameId, gameC.id);
  assert.equal(await repository.finishTask(second, 'SKIPPED'), true);

  const completedHighJob = await prisma.jobRun.findUniqueOrThrow({ where: { id: highJob.id } });
  assert.equal(completedHighJob.status, 'COMPLETED');
  assert.ok(completedHighJob.completedAt);

  const duplicateJob = await createJob({
    userId,
    priority: 300,
    gameIds: [gameA.id],
  });

  const concurrentClaims = await Promise.all([
    repository.claimNextTask({ supportedKinds: ['INDEX_GAMES'] }),
    repository.claimNextTask({ supportedKinds: ['INDEX_GAMES'] }),
  ]);
  const retainedClaims = concurrentClaims.filter(Boolean);
  assert.equal(retainedClaims.length, 1, 'only one running task is allowed per imported game');
  const originalClaim = retainedClaims[0];
  assert.equal(originalClaim.jobRunId, duplicateJob.id);
  assert.equal(originalClaim.importedGameId, gameA.id);

  const abandonedStartedAt = new Date('2026-07-01T00:00:00.000Z');
  const abandonedSettledAt = new Date('2026-07-01T00:00:01.000Z');
  await prisma.jobTask.update({
    where: { id: originalClaim.id },
    data: {
      startedAt: abandonedStartedAt,
      settledAt: abandonedSettledAt,
      updatedAt: new Date('2026-07-01T00:00:00.000Z'),
    },
  });
  assert.equal(
    await repository.recoverStaleTasks(new Date('2026-07-02T00:00:00.000Z')),
    1,
  );
  const recoveredTask = await prisma.jobTask.findUniqueOrThrow({ where: { id: originalClaim.id } });
  assert.equal(recoveredTask.status, 'QUEUED');
  assert.equal(recoveredTask.startedAt, null);
  assert.equal(recoveredTask.settledAt, null);

  const replacementClaim = await repository.claimNextTask({
    supportedKinds: ['INDEX_GAMES'],
    jobRunId: duplicateJob.id,
  });
  assert.ok(replacementClaim);
  assert.notEqual(replacementClaim.workKey, originalClaim.workKey);
  const replacementClaimedTask = await prisma.jobTask.findUniqueOrThrow({
    where: { id: replacementClaim.id },
  });
  assert.ok(replacementClaimedTask.startedAt > abandonedStartedAt);
  assert.equal(replacementClaimedTask.settledAt, null);
  assert.equal(
    await repository.finishTask(originalClaim, 'COMPLETED'),
    false,
    'a stale worker cannot settle a replacement claim',
  );
  assert.equal(await repository.finishTask(replacementClaim, 'COMPLETED'), true);

  const cancelStaleJob = await createJob({
    userId,
    priority: 250,
    gameIds: [cancelStaleGame.id],
  });
  const cancelStaleClaim = await repository.claimNextTask({
    supportedKinds: ['INDEX_GAMES'],
    jobRunId: cancelStaleJob.id,
  });
  assert.ok(cancelStaleClaim);
  await prisma.$transaction([
    prisma.jobTask.update({
      where: { id: cancelStaleClaim.id },
      data: {
        status: 'CANCELLED',
        error: 'Cancelled by user.',
        updatedAt: new Date('2026-07-01T00:00:00.000Z'),
      },
    }),
    prisma.jobRun.update({
      where: { id: cancelStaleJob.id },
      data: {
        status: 'CANCELLED',
        completedAt: new Date('2026-07-01T00:00:00.000Z'),
      },
    }),
  ]);
  assert.equal(
    await repository.recoverStaleTasks(new Date('2026-07-02T00:00:00.000Z')),
    1,
  );
  const recoveredCancelledTask = await prisma.jobTask.findUniqueOrThrow({
    where: { id: cancelStaleClaim.id },
  });
  assert.equal(recoveredCancelledTask.status, 'CANCELLED');
  assert.equal(recoveredCancelledTask.workKey, null);

  const lowClaim = await repository.claimNextTask({ supportedKinds: ['INDEX_GAMES'] });
  assert.ok(lowClaim);
  assert.equal(lowClaim.jobRunId, lowJob.id);
  await prisma.jobTask.update({
    where: { id: lowClaim.id },
    data: {
      startedAt: new Date('2026-07-03T00:00:00.000Z'),
      settledAt: new Date('2026-07-03T00:00:01.000Z'),
    },
  });
  assert.equal(await repository.releaseTask(lowClaim), true);
  const released = await prisma.jobTask.findUniqueOrThrow({ where: { id: lowClaim.id } });
  assert.equal(released.status, 'QUEUED');
  assert.equal(released.workKey, null);
  assert.equal(released.startedAt, null);
  assert.equal(released.settledAt, null);

  const failedClaim = await repository.claimNextTask({
    supportedKinds: ['INDEX_GAMES'],
    jobRunId: lowJob.id,
  });
  assert.ok(failedClaim);
  assert.equal(await repository.failTask(failedClaim, 'Expected test failure.'), true);
  const failedTask = await prisma.jobTask.findUniqueOrThrow({ where: { id: failedClaim.id } });
  assert.equal(failedTask.status, 'FAILED');
  assert.ok(failedTask.startedAt);
  assert.ok(failedTask.settledAt);
  assert.ok(failedTask.settledAt >= failedTask.startedAt);

  const orphanJob = await createJob({
    userId,
    priority: 50,
    gameIds: [orphanGame.id],
  });
  await prisma.importedGame.delete({ where: { id: orphanGame.id } });
  assert.equal(await repository.skipOrphanedTasks(), 1);

  const orphanTask = await prisma.jobTask.findFirstOrThrow({ where: { jobRunId: orphanJob.id } });
  assert.equal(orphanTask.status, 'SKIPPED');
  assert.equal(orphanTask.importedGameId, null);
  assert.equal(orphanTask.startedAt, null);
  assert.ok(orphanTask.settledAt);
  const completedOrphanJob = await prisma.jobRun.findUniqueOrThrow({ where: { id: orphanJob.id } });
  assert.equal(completedOrphanJob.status, 'COMPLETED');

  const fairJobA = await createJob({
    userId,
    priority: 400,
    gameIds: [fairGameA1.id, fairGameA2.id],
  });
  const fairJobB = await createJob({
    userId,
    priority: 400,
    gameIds: [fairGameB1.id, fairGameB2.id],
  });
  await prisma.jobRun.update({
    where: { id: fairJobA.id },
    data: { updatedAt: new Date('2026-01-01T00:00:00.000Z') },
  });
  await prisma.jobRun.update({
    where: { id: fairJobB.id },
    data: { updatedAt: new Date('2026-01-02T00:00:00.000Z') },
  });

  const fairFirstClaim = await repository.claimNextTask({ supportedKinds: ['INDEX_GAMES'] });
  assert.ok(fairFirstClaim);
  assert.equal(fairFirstClaim.jobRunId, fairJobA.id);

  const fairSecondClaim = await repository.claimNextTask({ supportedKinds: ['INDEX_GAMES'] });
  assert.ok(fairSecondClaim);
  assert.equal(
    fairSecondClaim.jobRunId,
    fairJobB.id,
    'a global claim leases the selected job so another worker selects the next equally prioritized job',
  );

  assert.equal(await repository.finishTask(fairFirstClaim, 'COMPLETED'), true);
  assert.equal(await repository.finishTask(fairSecondClaim, 'COMPLETED'), true);

  const fairASecondClaim = await repository.claimNextTask({
    supportedKinds: ['INDEX_GAMES'],
    jobRunId: fairJobA.id,
  });
  const fairBSecondClaim = await repository.claimNextTask({
    supportedKinds: ['INDEX_GAMES'],
    jobRunId: fairJobB.id,
  });
  assert.ok(fairASecondClaim);
  assert.ok(fairBSecondClaim);
  assert.equal(await repository.finishTask(fairASecondClaim, 'COMPLETED'), true);
  assert.equal(await repository.finishTask(fairBSecondClaim, 'COMPLETED'), true);

  console.log('Persistent job worker repository tests passed.');
} finally {
  if (userId) await prisma.appUser.delete({ where: { id: userId } });
  await prisma.$disconnect();
}

async function createJob({ userId, priority, gameIds }) {
  return prisma.jobRun.create({
    data: {
      userId,
      kind: 'INDEX_GAMES',
      source: 'MAINTENANCE',
      priority,
      status: 'QUEUED',
      totalTasks: gameIds.length,
      tasks: {
        create: gameIds.map((importedGameId, ordinal) => ({
          importedGameId,
          ordinal,
          status: 'QUEUED',
        })),
      },
    },
  });
}
