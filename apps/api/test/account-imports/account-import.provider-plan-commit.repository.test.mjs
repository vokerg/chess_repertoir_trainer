import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import prismaModule from '../../dist/prisma.js';
import {
  AccountImportClaimLostError,
  createAccountImportRepository,
} from '../../dist/modules/account-imports/account-import.repository.prisma.js';
import {
  createAccountImportProviderCommitRepository,
} from '../../dist/modules/account-imports/account-import.provider-commit.repository.prisma.js';

const prisma = prismaModule.default;
const suffix = randomUUID();
const scope = { variant: 'STANDARD', speeds: ['BLITZ', 'RAPID'], rated: 'BOTH' };
let userId = null;

try {
  const user = await prisma.appUser.create({
    data: { displayName: `ONB-014 provider plan ${suffix}` },
  });
  userId = user.id;
  const account = await prisma.externalAccount.create({
    data: {
      userId: user.id,
      provider: 'CHESS_COM',
      username: `onb014-plan-${suffix}`,
    },
  });
  const lifecycleRepository = createAccountImportRepository(prisma);
  const created = await lifecycleRepository.createRun({
    userId: user.id,
    accountId: account.id,
    mode: 'INCREMENTAL_FORWARD',
    source: 'USER_ACTION',
    scope,
    requestedFrom: new Date('2026-08-01T00:00:00.000Z'),
    requestedTo: new Date('2026-09-01T00:00:00.000Z'),
    priority: 100,
    windowsTotal: null,
  });
  const workKey = `account-import-onb014-plan-${suffix}`;
  await prisma.importRun.update({
    where: { id: created.id },
    data: {
      status: 'RUNNING',
      workKey,
      claimedAt: new Date(),
      heartbeatAt: new Date(),
    },
  });

  const repository = createAccountImportProviderCommitRepository(prisma, {
    async assertAllowed() {},
  });
  await repository.initializePlan({
    userId: user.id,
    importRunId: created.id,
    workKey,
    windowsTotal: 1,
    windowsCompleted: 0,
  });
  const initialized = await prisma.importRun.findUniqueOrThrow({ where: { id: created.id } });
  assert.equal(initialized.windowsTotal, 1);
  assert.equal(initialized.windowsCompleted, 0);

  const fencedRepository = createAccountImportProviderCommitRepository(prisma, {
    async assertAllowed() {
      throw new Error('lifecycle-fenced');
    },
  });
  await assert.rejects(
    fencedRepository.initializePlan({
      userId: user.id,
      importRunId: created.id,
      workKey,
      windowsTotal: 1,
      windowsCompleted: 1,
    }),
    /lifecycle-fenced/,
  );
  const afterFence = await prisma.importRun.findUniqueOrThrow({ where: { id: created.id } });
  assert.equal(afterFence.windowsTotal, 1);
  assert.equal(afterFence.windowsCompleted, 0, 'fenced plan progress is rolled back');

  await assert.rejects(
    repository.initializePlan({
      userId: user.id,
      importRunId: created.id,
      workKey: 'stale-work-key',
      windowsTotal: 1,
      windowsCompleted: 0,
    }),
    AccountImportClaimLostError,
  );
} finally {
  if (userId !== null) {
    await prisma.appUser.delete({ where: { id: userId } }).catch(() => undefined);
  }
  await prisma.$disconnect();
}
