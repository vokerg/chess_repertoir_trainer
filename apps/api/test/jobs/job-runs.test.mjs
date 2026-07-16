import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { buildApp } from '../../dist/app.js';
import prismaModule from '../../dist/prisma.js';

const prisma = prismaModule.default;
const suffix = randomUUID();
let otherUserId;
let accountId;
let otherAccountId;
let createdJobRunId;
let foreignJobRunId;

try {
  const existingDevUser = await prisma.appUser.findUnique({
    where: { authProvider_authSubject: { authProvider: 'dev', authSubject: 'dev-single-user' } },
  });
  const devUser = existingDevUser ?? await prisma.appUser.create({
    data: { displayName: 'Local user', authProvider: 'dev', authSubject: 'dev-single-user' },
  });
  const userId = devUser.id;

  const otherUser = await prisma.appUser.create({
    data: {
      displayName: 'Other job user',
      authProvider: 'test',
      authSubject: `jobs-other-${suffix}`,
    },
  });
  otherUserId = otherUser.id;

  const account = await prisma.externalAccount.create({
    data: { userId, provider: 'LICHESS', username: `jobs-${suffix}` },
  });
  accountId = account.id;
  const otherAccount = await prisma.externalAccount.create({
    data: { userId: otherUserId, provider: 'LICHESS', username: `jobs-other-${suffix}` },
  });
  otherAccountId = otherAccount.id;

  const olderGame = await prisma.importedGame.create({
    data: {
      userId,
      accountId,
      provider: 'LICHESS',
      providerGameId: `older-${suffix}`,
      endedAt: new Date('2026-07-14T12:00:00.000Z'),
    },
  });
  const newerGame = await prisma.importedGame.create({
    data: {
      userId,
      accountId,
      provider: 'LICHESS',
      providerGameId: `newer-${suffix}`,
      endedAt: new Date('2026-07-15T12:00:00.000Z'),
    },
  });
  const undatedGame = await prisma.importedGame.create({
    data: {
      userId,
      accountId,
      provider: 'LICHESS',
      providerGameId: `undated-${suffix}`,
      endedAt: null,
    },
  });
  const foreignGame = await prisma.importedGame.create({
    data: {
      userId: otherUserId,
      accountId: otherAccountId,
      provider: 'LICHESS',
      providerGameId: `foreign-${suffix}`,
      endedAt: new Date('2026-07-16T12:00:00.000Z'),
    },
  });

  const foreignJob = await prisma.jobRun.create({
    data: {
      userId: otherUserId,
      kind: 'INDEX_GAMES',
      source: 'USER_ACTION',
      priority: 400,
      status: 'QUEUED',
      totalTasks: 1,
      tasks: {
        create: {
          importedGameId: foreignGame.id,
          ordinal: 0,
          status: 'QUEUED',
        },
      },
    },
  });
  foreignJobRunId = foreignJob.id;

  const app = await buildApp({ logger: false, authConfig: { mode: 'dev-single-user', userId } });
  try {
    await app.ready();

    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/imported-games/job-runs',
      payload: {
        kind: 'PROCESS_GAMES',
        gameIds: [undatedGame.id, olderGame.id, foreignGame.id, newerGame.id, olderGame.id],
      },
    });
    assert.equal(createResponse.statusCode, 202);
    const created = createResponse.json();
    createdJobRunId = created.jobRun.id;
    assert.equal(created.jobRun.kind, 'PROCESS_GAMES');
    assert.equal(created.jobRun.source, 'USER_ACTION');
    assert.equal(created.jobRun.priority, 350);
    assert.equal(created.jobRun.status, 'QUEUED');
    assert.equal(created.jobRun.totalTasks, 3);
    assert.equal(created.jobRun.force, false);
    assert.deepEqual(created.jobRun.taskCounts, {
      queued: 3,
      running: 0,
      completed: 0,
      skipped: 0,
      failed: 0,
      cancelled: 0,
    });
    assert.deepEqual(created.rejectedGameIds, [foreignGame.id]);

    const taskResponse = await app.inject({
      method: 'GET',
      url: `/api/job-runs/${created.jobRun.id}/tasks`,
    });
    assert.equal(taskResponse.statusCode, 200);
    assert.equal(taskResponse.json().total, 3);
    assert.deepEqual(
      taskResponse.json().items.map((task) => [task.importedGameId, task.ordinal, task.status]),
      [
        [newerGame.id, 0, 'QUEUED'],
        [olderGame.id, 1, 'QUEUED'],
        [undatedGame.id, 2, 'QUEUED'],
      ],
    );

    const listResponse = await app.inject({ method: 'GET', url: '/api/job-runs?active=true' });
    assert.equal(listResponse.statusCode, 200);
    assert.equal(
      listResponse.json().items.some((jobRun) => jobRun.id === created.jobRun.id),
      true,
    );
    assert.equal(
      listResponse.json().items.some((jobRun) => jobRun.id === foreignJob.id),
      false,
    );

    const detailResponse = await app.inject({
      method: 'GET',
      url: `/api/job-runs/${created.jobRun.id}`,
    });
    assert.equal(detailResponse.statusCode, 200);
    assert.deepEqual(detailResponse.json().jobRun.taskCounts, created.jobRun.taskCounts);

    const foreignDetailResponse = await app.inject({
      method: 'GET',
      url: `/api/job-runs/${foreignJob.id}`,
    });
    assert.equal(foreignDetailResponse.statusCode, 404);
    assert.equal(foreignDetailResponse.json().code, 'JOB_RUN_NOT_FOUND');

    const foreignTasksResponse = await app.inject({
      method: 'GET',
      url: `/api/job-runs/${foreignJob.id}/tasks`,
    });
    assert.equal(foreignTasksResponse.statusCode, 404);

    const noOwnedGamesResponse = await app.inject({
      method: 'POST',
      url: '/api/imported-games/job-runs',
      payload: { kind: 'INDEX_GAMES', gameIds: [foreignGame.id] },
    });
    assert.equal(noOwnedGamesResponse.statusCode, 404);
    assert.equal(noOwnedGamesResponse.json().code, 'NO_IMPORTED_GAMES_FOUND');

    const invalidResponse = await app.inject({
      method: 'POST',
      url: '/api/imported-games/job-runs',
      payload: { kind: 'INDEX_GAMES', gameIds: [] },
    });
    assert.equal(invalidResponse.statusCode, 400);
    assert.deepEqual(invalidResponse.json(), { error: 'Validation failed' });

    const openApiResponse = await app.inject({ method: 'GET', url: '/api/docs/openapi.json' });
    assert.equal(openApiResponse.statusCode, 200);
    const paths = openApiResponse.json().paths;
    assert.equal(paths['/api/imported-games/job-runs'].post.operationId, 'createImportedGameJobRun');
    assert.equal(paths['/api/job-runs'].get.operationId, 'listJobRuns');
    assert.equal(paths['/api/job-runs/{jobRunId}'].get.operationId, 'getJobRun');
    assert.equal(paths['/api/job-runs/{jobRunId}/tasks'].get.operationId, 'listJobRunTasks');
  } finally {
    await app.close();
  }

  console.log('Persistent job run tests passed.');
} finally {
  const jobRunIds = [createdJobRunId, foreignJobRunId].filter(Boolean);
  if (jobRunIds.length > 0) {
    await prisma.jobRun.deleteMany({ where: { id: { in: jobRunIds } } });
  }
  if (accountId) await prisma.externalAccount.delete({ where: { id: accountId } });
  if (otherAccountId) await prisma.externalAccount.delete({ where: { id: otherAccountId } });
  if (otherUserId) await prisma.appUser.delete({ where: { id: otherUserId } });
  await prisma.$disconnect();
}
