import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import prismaModule from '../../dist/prisma.js';
import { createAccountImportRepository } from '../../dist/modules/account-imports/account-import.repository.prisma.js';
import {
  AccountImportIncompleteCoverageError,
  createAccountImportLifecycleRepository,
} from '../../dist/modules/account-imports/account-import.lifecycle.repository.prisma.js';

const prisma = prismaModule.default;
const suffix = randomUUID();
const repository = createAccountImportRepository(prisma);
const lifecycle = createAccountImportLifecycleRepository(prisma);
const userIds = [];
const scope = { variant: 'STANDARD', speeds: ['BLITZ', 'RAPID'], rated: 'BOTH' };
const requestedFrom = new Date('2026-05-01T00:00:00.000Z');
const requestedTo = new Date('2026-08-01T00:00:00.000Z');

try {
  const first = await createUserAccount('first');
  const second = await createUserAccount('second');
  userIds.push(first.userId, second.userId);

  const firstRun = await repository.createRun(runInput({ ...first, windowsTotal: null }));
  const secondRun = await repository.createRun(runInput({ ...second, priority: 10 }));

  const candidatesBeforeClaim = await prisma.importRun.findMany({
    where: { id: { in: [firstRun.id, secondRun.id] } },
    orderBy: { id: 'asc' },
    select: {
      id: true,
      provider: true,
      mode: true,
      status: true,
      workKey: true,
      retryAt: true,
      rateLimitUntil: true,
      priority: true,
    },
  });
  assert.equal(candidatesBeforeClaim.length, 2, 'both lifecycle-test imports exist before claiming');
  for (const candidate of candidatesBeforeClaim) {
    assert.equal(candidate.provider, 'LICHESS');
    assert.equal(candidate.mode, 'BOUNDED_INITIAL');
    assert.equal(candidate.status, 'QUEUED');
    assert.equal(candidate.workKey, null);
    assert.equal(candidate.retryAt, null);
    assert.equal(candidate.rateLimitUntil, null);
  }

  const activeBeforeClaim = await prisma.importRun.findMany({
    where: {
      workKey: { not: null },
      status: { in: ['RUNNING', 'PAUSE_REQUESTED', 'CANCEL_REQUESTED'] },
    },
    select: {
      id: true,
      userId: true,
      accountId: true,
      provider: true,
      mode: true,
      status: true,
      workKey: true,
    },
  });
  assert.deepEqual(
    activeBeforeClaim,
    [],
    `unexpected global account-import claim before lifecycle test: ${JSON.stringify(activeBeforeClaim)}`,
  );

  const concurrentClaims = await Promise.all([
    lifecycle.claimNextRun(['LICHESS']),
    lifecycle.claimNextRun(['LICHESS']),
  ]);
  const claimed = concurrentClaims.filter(Boolean);
  assert.equal(claimed.length, 1, 'the account-import worker admits one global active claim');
  assert.equal(concurrentClaims.filter((value) => value === null).length, 1);
  assert.match(claimed[0].workKey, /^ACCOUNT_IMPORT:/);

  const active = claimed[0];
  assert.equal(active.id, firstRun.id, 'priority orders runnable account imports before age');
  assert.equal(await lifecycle.heartbeatRun(active.id, 'stale-key'), null);
  assert.equal(
    await lifecycle.checkpointRun(active.id, 'stale-key', { windowsCompleted: 1 }),
    false,
    'stale work cannot checkpoint',
  );
  assert.equal(
    await lifecycle.checkpointRun(active.id, active.workKey, {
      checkpoint: { window: 1 },
      windowsTotal: 3,
      windowsCompleted: 1,
      gamesSeenDelta: 3,
      gamesSkippedOutOfScopeDelta: 1,
    }),
    true,
    'the exact claimed worker can establish its fixed window denominator',
  );
  assert.equal(
    await lifecycle.checkpointRun(active.id, active.workKey, {
      windowsTotal: 4,
      windowsCompleted: 1,
    }),
    false,
    'a fixed window denominator cannot change after it is established',
  );
  assert.equal(
    await lifecycle.checkpointRun(active.id, active.workKey, {
      checkpoint: { window: 0 },
      windowsCompleted: 0,
    }),
    false,
    'the active worker cannot move durable completed-window progress backwards',
  );
  const monotonicProgress = await lifecycle.getRunForUser(active.userId, active.id);
  assert.equal(monotonicProgress.windowsTotal, 3);
  assert.equal(monotonicProgress.windowsCompleted, 1);
  assert.deepEqual(monotonicProgress.checkpoint, { window: 1 });

  assert.equal(await lifecycle.requestPause(active.userId, active.id), true);
  const pauseRequested = await lifecycle.getRunForUser(active.userId, active.id);
  assert.equal(pauseRequested.status, 'PAUSE_REQUESTED');
  assert.equal(pauseRequested.workKey, active.workKey, 'pause is not acknowledged before quiescence');
  assert.equal(await repository.hasActiveClaimForAccount(active.userId, active.accountId), true);

  assert.equal(
    await lifecycle.acknowledgeRequestedControl(active.id, active.workKey),
    'PAUSED',
  );
  const paused = await lifecycle.getRunForUser(active.userId, active.id);
  assert.equal(paused.status, 'PAUSED');
  assert.equal(paused.workKey, null);
  assert.equal(await repository.hasActiveClaimForAccount(active.userId, active.accountId), false);

  assert.equal(await lifecycle.resume(active.userId, active.id), true);
  assert.equal((await lifecycle.getRunForUser(active.userId, active.id)).status, 'QUEUED');

  const reclaimed = await lifecycle.claimNextRun(['LICHESS']);
  assert.ok(reclaimed);
  assert.equal(reclaimed.id, active.id, 'the same highest-priority resumed run is reclaimable');
  assert.notEqual(reclaimed.workKey, active.workKey, 'a new claim gets a new fencing key');
  assert.deepEqual(reclaimed.checkpoint, { window: 1 }, 'provider checkpoint survives pause/resume/reclaim');

  assert.equal(await lifecycle.requestCancel(reclaimed.userId, reclaimed.id), true);
  const cancelRequested = await lifecycle.getRunForUser(reclaimed.userId, reclaimed.id);
  assert.equal(cancelRequested.status, 'CANCEL_REQUESTED');
  assert.equal(cancelRequested.workKey, reclaimed.workKey);
  assert.equal(
    await lifecycle.acknowledgeRequestedControl(reclaimed.id, reclaimed.workKey),
    'CANCELLED',
  );
  assert.equal((await lifecycle.getRunForUser(reclaimed.userId, reclaimed.id)).status, 'CANCELLED');

  const retry = await repository.createRun({
    ...runInput({ userId: reclaimed.userId, accountId: reclaimed.accountId }),
    retryOfImportRunId: reclaimed.id,
  });
  const retryClaim = await lifecycle.claimNextRun(['LICHESS']);
  assert.ok(retryClaim);
  assert.equal(retryClaim.id, retry.id);

  await prisma.importRun.update({
    where: { id: retry.id },
    data: { heartbeatAt: new Date('2026-01-01T00:00:00.000Z') },
  });
  assert.equal(
    await lifecycle.recoverStaleClaims(new Date('2026-08-01T00:00:00.000Z')),
    1,
  );
  const recovered = await lifecycle.getRunForUser(retry.userId, retry.id);
  assert.equal(recovered.status, 'QUEUED');
  assert.equal(recovered.workKey, null);
  assert.equal(
    await lifecycle.checkpointRun(retry.id, retryClaim.workKey, { windowsCompleted: 2 }),
    false,
    'a recovered stale worker cannot checkpoint later',
  );
  assert.equal(
    await lifecycle.completeRun(retry.id, retryClaim.workKey),
    false,
    'a recovered stale worker cannot complete later',
  );

  const completionClaim = await lifecycle.claimNextRun(['LICHESS']);
  assert.ok(completionClaim);
  assert.equal(completionClaim.id, retry.id);
  await assert.rejects(
    lifecycle.completeRun(retry.id, completionClaim.workKey),
    AccountImportIncompleteCoverageError,
    'terminal success requires exact proved coverage',
  );

  await repository.extendCoverage({
    userId: retry.userId,
    importRunId: retry.id,
    workKey: completionClaim.workKey,
    coveredFrom: requestedFrom,
    coveredThrough: requestedTo,
  });
  assert.equal(await lifecycle.completeRun(retry.id, completionClaim.workKey), true);
  const completed = await lifecycle.getRunForUser(retry.userId, retry.id);
  assert.equal(completed.status, 'COMPLETED');
  assert.equal(completed.workKey, null);
  const coverage = await repository.getCoverage(retry.userId, retry.accountId, scope);
  assert.equal(coverage.lastCompletedImportRunId, retry.id);

  const remaining = await lifecycle.claimNextRun(['LICHESS']);
  assert.ok(remaining);
  assert.equal(remaining.id, secondRun.id);
  assert.equal(await lifecycle.releaseRun(remaining.id, remaining.workKey), true);
  assert.equal((await lifecycle.getRunForUser(second.userId, secondRun.id)).status, 'QUEUED');

  const deferredClaim = await lifecycle.claimNextRun(['LICHESS']);
  assert.ok(deferredClaim);
  assert.equal(deferredClaim.id, secondRun.id);
  const retryAt = new Date(Date.now() + 60_000);
  const rateLimitUntil = new Date(Date.now() + 45_000);
  assert.equal(await lifecycle.deferRun({
    importRunId: deferredClaim.id,
    workKey: deferredClaim.workKey,
    retryAt,
    rateLimitUntil,
    errorCode: 'HTTP_429',
    error: 'rate limited',
  }), true);
  const deferred = await lifecycle.getRunForUser(second.userId, secondRun.id);
  assert.equal(deferred.status, 'QUEUED');
  assert.equal(deferred.workKey, null, 'provider retry-at releases the active claim');
  assert.equal(deferred.retryAt?.getTime(), retryAt.getTime());
  assert.equal(deferred.rateLimitUntil?.getTime(), rateLimitUntil.getTime());
  assert.equal(
    await lifecycle.recoverStaleClaims(new Date(Date.now() + 24 * 60 * 60_000)),
    0,
    'a provider-deferred run is not a stale worker claim',
  );
  assert.equal(
    await lifecycle.claimNextRun(['LICHESS']),
    null,
    'provider retry-at keeps the released run non-runnable until its retry window',
  );

  const firstUserRuns = await lifecycle.listRunsForUser(first.userId, 20, false);
  assert.deepEqual(firstUserRuns.map((run) => run.id), [retry.id, firstRun.id]);
  assert.equal(
    await lifecycle.getRunForUser(second.userId, firstRun.id),
    null,
    'lifecycle reads remain ownership scoped',
  );

  const queue = await lifecycle.getQueueStats();
  assert.ok(queue.queuedCount >= 1);
  assert.ok(queue.oldestQueuedAt instanceof Date);
} finally {
  if (userIds.length > 0) {
    await prisma.appUser.deleteMany({ where: { id: { in: userIds } } });
  }
  await prisma.$disconnect();
}

function runInput(overrides) {
  return {
    userId: overrides.userId,
    accountId: overrides.accountId,
    mode: 'BOUNDED_INITIAL',
    source: 'USER_ACTION',
    scope,
    requestedFrom,
    requestedTo,
    priority: overrides.priority ?? 100,
    windowsTotal: overrides.windowsTotal === undefined ? 3 : overrides.windowsTotal,
    retryOfImportRunId: overrides.retryOfImportRunId ?? null,
  };
}

async function createUserAccount(label) {
  const user = await prisma.appUser.create({
    data: {
      displayName: `ONB-012 ${label}`,
      authProvider: 'test',
      authSubject: `onb-012-${label}-${suffix}`,
    },
  });
  const account = await prisma.externalAccount.create({
    data: {
      userId: user.id,
      provider: 'LICHESS',
      username: `onb-012-${label}-${suffix}`,
    },
  });
  return { userId: user.id, accountId: account.id };
}
