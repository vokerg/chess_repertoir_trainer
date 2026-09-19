import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import prismaModule from '../../dist/prisma.js';
import { createAccountImportRepository } from '../../dist/modules/account-imports/account-import.repository.prisma.js';
import { createAccountImportLifecycleRepository } from '../../dist/modules/account-imports/account-import.lifecycle.repository.prisma.js';

const prisma = prismaModule.default;
const repository = createAccountImportRepository(prisma);
const lifecycle = createAccountImportLifecycleRepository(prisma);
const suffix = randomUUID();
let userId;

const scope = { variant: 'STANDARD', speeds: ['BLITZ'], rated: 'BOTH' };
const requestedFrom = new Date('2026-05-01T00:00:00.000Z');
const requestedTo = new Date('2026-08-01T00:00:00.000Z');
const staleHeartbeat = new Date('2026-01-01T00:00:00.000Z');
const staleBefore = new Date('2026-08-01T00:00:00.000Z');

try {
  const user = await prisma.appUser.create({
    data: {
      displayName: 'ONB-012 stale control recovery',
      authProvider: 'test',
      authSubject: `onb-012-stale-control-${suffix}`,
    },
  });
  userId = user.id;

  const pauseAccount = await createAccount(user.id, 'pause');
  const cancelAccount = await createAccount(user.id, 'cancel');

  const pauseRun = await repository.createRun(runInput(user.id, pauseAccount.id, 200));
  const pauseClaim = await lifecycle.claimNextRun(['LICHESS']);
  assert.equal(pauseClaim?.id, pauseRun.id);
  assert.equal(await lifecycle.requestPause(user.id, pauseRun.id), true);
  await prisma.importRun.update({
    where: { id: pauseRun.id },
    data: { heartbeatAt: staleHeartbeat },
  });

  assert.equal(await lifecycle.recoverStaleClaims(staleBefore), 1);
  const paused = await lifecycle.getRunForUser(user.id, pauseRun.id);
  assert.equal(paused?.status, 'PAUSED');
  assert.equal(paused?.workKey, null, 'stale pause recovery releases the exact provider claim');
  assert.equal(
    await lifecycle.checkpointRun(pauseRun.id, pauseClaim.workKey, { windowsCompleted: 1 }),
    false,
    'the pre-recovery pause worker stays fenced after stale recovery',
  );

  const cancelRun = await repository.createRun(runInput(user.id, cancelAccount.id, 100));
  const cancelClaim = await lifecycle.claimNextRun(['LICHESS']);
  assert.equal(cancelClaim?.id, cancelRun.id);
  assert.equal(await lifecycle.requestCancel(user.id, cancelRun.id), true);
  await prisma.importRun.update({
    where: { id: cancelRun.id },
    data: { heartbeatAt: staleHeartbeat },
  });

  assert.equal(await lifecycle.recoverStaleClaims(staleBefore), 1);
  const cancelled = await lifecycle.getRunForUser(user.id, cancelRun.id);
  assert.equal(cancelled?.status, 'CANCELLED');
  assert.equal(cancelled?.workKey, null, 'stale cancellation recovery releases the exact provider claim');
  assert.ok(cancelled?.completedAt instanceof Date);
  assert.equal(
    await lifecycle.completeRun(cancelRun.id, cancelClaim.workKey),
    false,
    'the pre-recovery cancelled worker cannot settle after stale recovery',
  );
} finally {
  if (userId !== undefined) {
    await prisma.appUser.deleteMany({ where: { id: userId } });
  }
  await prisma.$disconnect();
}

async function createAccount(ownerUserId, label) {
  return prisma.externalAccount.create({
    data: {
      userId: ownerUserId,
      provider: 'LICHESS',
      username: `onb-012-stale-control-${label}-${suffix}`,
    },
  });
}

function runInput(ownerUserId, accountId, priority) {
  return {
    userId: ownerUserId,
    accountId,
    mode: 'BOUNDED_INITIAL',
    source: 'USER_ACTION',
    scope,
    requestedFrom,
    requestedTo,
    priority,
    windowsTotal: 3,
  };
}
