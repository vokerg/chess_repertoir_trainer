import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import prismaModule from '../../dist/prisma.js';
import { createAccountImportRepository } from '../../dist/modules/account-imports/account-import.repository.prisma.js';
import { createAccountImportLifecycleRepository } from '../../dist/modules/account-imports/account-import.lifecycle.repository.prisma.js';

const prisma = prismaModule.default;
const suffix = randomUUID();
const userIds = [];
const repository = createAccountImportRepository(prisma);
const scope = { variant: 'STANDARD', speeds: ['BLITZ', 'RAPID'], rated: 'BOTH' };
const requestedFrom = new Date('2026-05-01T00:00:00.000Z');
const requestedTo = new Date('2026-08-01T00:00:00.000Z');

try {
  const fenced = await createUserAccount('fenced');
  const allowed = await createUserAccount('allowed');
  userIds.push(fenced.userId, allowed.userId);

  const fencedRun = await repository.createRun(runInput({ ...fenced, priority: 100 }));
  const allowedRun = await repository.createRun(runInput({ ...allowed, priority: 10 }));
  let assertAllowedCalls = 0;

  const lifecycle = createAccountImportLifecycleRepository(prisma, {
    claimCandidatePredicate(columns) {
      return Prisma.sql`${columns.accountId} <> ${fenced.accountId}`;
    },
    async assertAllowed(_transaction, input) {
      assertAllowedCalls += 1;
      assert.notEqual(
        input.accountId,
        fenced.accountId,
        'claim-time assertion must never receive a candidate excluded by the fence predicate',
      );
    },
  });

  const claimed = await lifecycle.claimNextRun(['LICHESS']);
  assert.ok(claimed);
  assert.equal(
    claimed.id,
    allowedRun.id,
    'a fenced high-priority run cannot starve an allowed lower-priority run',
  );
  assert.equal(assertAllowedCalls, 1, 'the selected candidate is rechecked transactionally before claim');
  assert.equal(
    (await lifecycle.getRunForUser(fenced.userId, fencedRun.id))?.status,
    'QUEUED',
    'the fenced candidate remains durable and queued',
  );
  assert.equal(await lifecycle.releaseRun(claimed.id, claimed.workKey), true);

  let unexpectedAssertion = false;
  const denyAllLifecycle = createAccountImportLifecycleRepository(prisma, {
    claimCandidatePredicate() {
      return Prisma.sql`FALSE`;
    },
    async assertAllowed() {
      unexpectedAssertion = true;
      throw new Error('claim assertion should not run when SQL admission rejects every candidate');
    },
  });
  assert.equal(await denyAllLifecycle.claimNextRun(['LICHESS']), null);
  assert.equal(unexpectedAssertion, false);

  assert.equal(await lifecycle.requestCancel(fenced.userId, fencedRun.id), true);
  assert.equal(await lifecycle.requestCancel(allowed.userId, allowedRun.id), true);
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
    priority: overrides.priority,
    windowsTotal: 7,
    retryOfImportRunId: null,
  };
}

async function createUserAccount(label) {
  const user = await prisma.appUser.create({
    data: {
      displayName: `ONB-012 admission ${label}`,
      authProvider: 'test',
      authSubject: `onb-012-admission-${label}-${suffix}`,
    },
  });
  const account = await prisma.externalAccount.create({
    data: {
      userId: user.id,
      provider: 'LICHESS',
      username: `onb-012-admission-${label}-${suffix}`,
    },
  });
  return { userId: user.id, accountId: account.id };
}

console.log('Account import claim admission tests passed.');
