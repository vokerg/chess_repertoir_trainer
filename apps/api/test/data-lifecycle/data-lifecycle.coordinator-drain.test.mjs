import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import prismaModule from '../../dist/prisma.js';
import {
  createAccountGameDataLifecycleCoordinatorRepository,
} from '../../dist/modules/data-lifecycle/data-lifecycle.coordinator.repository.prisma.js';
import {
  createAccountGameDataLifecycleExecutionRepository,
} from '../../dist/modules/data-lifecycle/data-lifecycle.account-game-execution.repository.prisma.js';

const prisma = prismaModule.default;
const repository = createAccountGameDataLifecycleCoordinatorRepository(prisma);
const executionRepository = createAccountGameDataLifecycleExecutionRepository(prisma);
const suffix = randomUUID();
let userId = null;

try {
  const user = await prisma.appUser.create({
    data: {
      displayName: `Lifecycle coordinator drain ${suffix}`,
      authProvider: 'lifecycle-coordinator-test',
      authSubject: suffix,
    },
  });
  userId = user.id;

  const [targetAccount, otherAccount] = await Promise.all([
    prisma.externalAccount.create({
      data: {
        userId: user.id,
        provider: 'TEST',
        username: `target-${suffix}`,
      },
    }),
    prisma.externalAccount.create({
      data: {
        userId: user.id,
        provider: 'TEST',
        username: `other-${suffix}`,
      },
    }),
  ]);

  const [targetGame, otherGame] = await Promise.all([
    prisma.importedGame.create({
      data: {
        userId: user.id,
        accountId: targetAccount.id,
        provider: 'TEST',
        providerGameId: `target-${suffix}`,
        pgn: '1. e4 e5',
      },
    }),
    prisma.importedGame.create({
      data: {
        userId: user.id,
        accountId: otherAccount.id,
        provider: 'TEST',
        providerGameId: `other-${suffix}`,
        pgn: '1. d4 d5',
      },
    }),
  ]);

  const jobRun = await prisma.jobRun.create({
    data: {
      userId: user.id,
      kind: 'INDEX_GAMES',
      source: 'USER_ACTION',
      priority: 100,
      status: 'RUNNING',
      totalTasks: 2,
      force: false,
      startedAt: new Date(),
      tasks: {
        create: [
          {
            importedGameId: targetGame.id,
            ordinal: 0,
            status: 'COMPLETED',
            startedAt: new Date(),
            settledAt: new Date(),
          },
          {
            importedGameId: otherGame.id,
            ordinal: 1,
            status: 'QUEUED',
          },
        ],
      },
    },
  });
  const targetTask = await prisma.jobTask.findFirstOrThrow({
    where: { jobRunId: jobRun.id, importedGameId: targetGame.id },
    select: { id: true },
  });
  const otherTask = await prisma.jobTask.findFirstOrThrow({
    where: { jobRunId: jobRun.id, importedGameId: otherGame.id },
    select: { id: true },
  });

  const scope = {
    resourceType: 'GAME',
    userId: user.id,
    accountId: targetAccount.id,
    gameIds: [targetGame.id],
  };

  {
    const snapshot = await repository.loadDrainSnapshot(scope);
    assert.equal(snapshot.activeJobRuns, 0);
    assert.equal(snapshot.activeJobTaskWorkKeys, 0);
    assert.equal(snapshot.drained, true);
    const targets = await repository.listCancellationTargets(scope);
    assert.deepEqual(targets.jobTaskIds, []);
  }

  await prisma.jobTask.update({
    where: { id: targetTask.id },
    data: { status: 'QUEUED', startedAt: null, settledAt: null },
  });

  {
    const targets = await repository.listCancellationTargets(scope);
    assert.deepEqual(targets.jobTaskIds, [targetTask.id]);
    assert.equal(await executionRepository.cancelScopedJobTasks(user.id, targets.jobTaskIds), 1);

    const [settledTarget, untouchedOther, parent] = await Promise.all([
      prisma.jobTask.findUniqueOrThrow({ where: { id: targetTask.id } }),
      prisma.jobTask.findUniqueOrThrow({ where: { id: otherTask.id } }),
      prisma.jobRun.findUniqueOrThrow({ where: { id: jobRun.id } }),
    ]);
    assert.equal(settledTarget.status, 'CANCELLED');
    assert.equal(settledTarget.workKey, null);
    assert.equal(untouchedOther.status, 'QUEUED');
    assert.equal(parent.status, 'RUNNING', 'unrelated queued work keeps the mixed run active');
  }

  await prisma.jobTask.update({
    where: { id: targetTask.id },
    data: {
      status: 'RUNNING',
      startedAt: new Date(),
      settledAt: null,
      workKey: `GAME_WORK:${suffix}`,
      error: null,
    },
  });
  assert.equal(await executionRepository.cancelScopedJobTasks(user.id, [targetTask.id]), 1);

  {
    const targetAfterCancel = await prisma.jobTask.findUniqueOrThrow({ where: { id: targetTask.id } });
    const parent = await prisma.jobRun.findUniqueOrThrow({ where: { id: jobRun.id } });
    assert.equal(targetAfterCancel.status, 'CANCELLED');
    assert.equal(targetAfterCancel.workKey, `GAME_WORK:${suffix}`, 'running-task lease remains until worker acknowledgement');
    assert.equal(parent.status, 'RUNNING', 'target cancellation must not cancel the unrelated task/run');

    const snapshot = await repository.loadDrainSnapshot(scope);
    assert.equal(snapshot.activeJobRuns, 0);
    assert.equal(snapshot.activeJobTaskWorkKeys, 1);
    assert.equal(snapshot.drained, false);
    const targets = await repository.listCancellationTargets(scope);
    assert.deepEqual(targets.jobTaskIds, []);
  }

  console.log('Data lifecycle coordinator drain and scoped cancellation tests passed.');
} finally {
  if (userId !== null) {
    await prisma.appUser.delete({ where: { id: userId } }).catch(() => undefined);
  }
  await prisma.$disconnect();
}
