import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import prismaModule from '../../dist/prisma.js';
import { JobRunRepository } from '../../dist/modules/jobs/job-run.repository.prisma.js';

const prisma = prismaModule.default;
const suffix = randomUUID();
let userId;

try {
  const user = await prisma.appUser.create({
    data: {
      displayName: 'Job retention test',
      authProvider: 'test',
      authSubject: `job-retention-${suffix}`,
    },
  });
  userId = user.id;

  const account = await prisma.externalAccount.create({
    data: { userId, provider: 'LICHESS', username: `job-retention-${suffix}` },
  });
  const games = await Promise.all(['old', 'recent', 'active'].map((name, index) => (
    prisma.importedGame.create({
      data: {
        userId,
        accountId: account.id,
        provider: 'LICHESS',
        providerGameId: `${name}-${suffix}`,
        endedAt: new Date(`2026-07-${10 + index}T12:00:00.000Z`),
      },
    })
  )));

  const oldJob = await createJob({
    userId,
    gameId: games[0].id,
    status: 'COMPLETED',
    taskStatus: 'COMPLETED',
    completedAt: new Date('2026-06-01T00:00:00.000Z'),
  });
  const recentJob = await createJob({
    userId,
    gameId: games[1].id,
    status: 'FAILED',
    taskStatus: 'FAILED',
    completedAt: new Date('2026-07-15T00:00:00.000Z'),
  });
  const activeJob = await createJob({
    userId,
    gameId: games[2].id,
    status: 'QUEUED',
    taskStatus: 'QUEUED',
    completedAt: null,
  });
  const oldTask = await prisma.jobTask.findFirstOrThrow({ where: { jobRunId: oldJob.id } });

  const deleted = await JobRunRepository.deleteTerminalCompletedBefore(
    new Date('2026-07-01T00:00:00.000Z'),
  );

  assert.equal(deleted, 1);
  assert.equal(await prisma.jobRun.findUnique({ where: { id: oldJob.id } }), null);
  assert.equal(await prisma.jobTask.findUnique({ where: { id: oldTask.id } }), null);
  assert.ok(await prisma.jobRun.findUnique({ where: { id: recentJob.id } }));
  assert.ok(await prisma.jobRun.findUnique({ where: { id: activeJob.id } }));

  console.log('Persistent job retention tests passed.');
} finally {
  if (userId) await prisma.appUser.delete({ where: { id: userId } });
  await prisma.$disconnect();
}

function createJob({ userId, gameId, status, taskStatus, completedAt }) {
  return prisma.jobRun.create({
    data: {
      userId,
      kind: 'INDEX_GAMES',
      source: 'MAINTENANCE',
      priority: 100,
      status,
      totalTasks: 1,
      completedAt,
      tasks: {
        create: {
          importedGameId: gameId,
          ordinal: 0,
          status: taskStatus,
          error: taskStatus === 'FAILED' ? 'Test failure.' : null,
        },
      },
    },
  });
}
