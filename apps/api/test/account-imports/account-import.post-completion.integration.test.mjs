import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import prismaModule from '../../dist/prisma.js';
import { createAccountImportRepository } from '../../dist/modules/account-imports/account-import.repository.prisma.js';
import { createAccountImportPostCompletionService } from '../../dist/modules/account-imports/account-import.post-completion.service.js';

const prisma = prismaModule.default;
const accountImports = createAccountImportRepository(prisma);
const service = createAccountImportPostCompletionService();
const suffix = randomUUID();
const scope = { variant: 'STANDARD', speeds: ['BLITZ', 'RAPID'], rated: 'BOTH' };
let userId;

try {
  const user = await prisma.appUser.create({
    data: {
      displayName: 'ONB-015 post-completion integration',
      authProvider: 'test',
      authSubject: `onb-015-post-completion-${suffix}`,
    },
  });
  userId = user.id;
  const account = await prisma.externalAccount.create({
    data: {
      userId: user.id,
      provider: 'LICHESS',
      username: `onb-015-post-completion-${suffix}`,
    },
  });

  await prisma.importedGame.create({
    data: {
      userId: user.id,
      accountId: account.id,
      provider: 'LICHESS',
      providerGameId: `forward-${suffix}`,
      endedAt: new Date('2026-08-20T09:00:00.000Z'),
      speedCategory: 'blitz',
      variant: 'standard',
      userColor: 'WHITE',
      whiteRating: 1800,
      blackRating: 1750,
    },
  });

  const forward = await accountImports.createRun({
    userId: user.id,
    accountId: account.id,
    mode: 'BOUNDED_INITIAL',
    source: 'USER_ACTION',
    scope,
    requestedFrom: new Date('2026-05-20T00:00:00.000Z'),
    requestedTo: new Date('2026-08-20T10:00:00.000Z'),
    priority: 100,
    windowsTotal: null,
  });
  const forwardCompletedAt = new Date('2026-08-20T10:00:00.000Z');
  await prisma.importRun.update({
    where: { id: forward.id },
    data: { status: 'COMPLETED', completedAt: forwardCompletedAt },
  });

  assert.equal(await service.reconcileNext(), true);
  const firstStats = await prisma.accountRatingStats.findUnique({ where: { accountId: account.id } });
  assert.equal(firstStats?.gamesCount, 1);
  const afterForward = await prisma.externalAccount.findUnique({ where: { id: account.id } });
  assert.equal(afterForward?.lastSyncRunId, forward.id);
  assert.equal(afterForward?.lastSyncAt?.getTime(), forwardCompletedAt.getTime());

  await prisma.importedGame.create({
    data: {
      userId: user.id,
      accountId: account.id,
      provider: 'LICHESS',
      providerGameId: `backfill-${suffix}`,
      endedAt: new Date('2026-04-12T09:00:00.000Z'),
      speedCategory: 'rapid',
      variant: 'standard',
      userColor: 'BLACK',
      whiteRating: 1700,
      blackRating: 1825,
    },
  });

  const backfill = await accountImports.createRun({
    userId: user.id,
    accountId: account.id,
    mode: 'HISTORICAL_BACKFILL',
    source: 'USER_ACTION',
    scope,
    requestedFrom: new Date('2026-02-20T00:00:00.000Z'),
    requestedTo: new Date('2026-05-20T00:00:00.000Z'),
    priority: 100,
    windowsTotal: null,
  });
  const firstComputedAt = firstStats?.computedAt ?? new Date();
  const backfillCompletedAt = new Date(firstComputedAt.getTime() + 1_000);
  await prisma.importRun.update({
    where: { id: backfill.id },
    data: { status: 'COMPLETED', completedAt: backfillCompletedAt },
  });

  assert.equal(await service.reconcileNext(), true);
  const secondStats = await prisma.accountRatingStats.findUnique({ where: { accountId: account.id } });
  assert.equal(secondStats?.gamesCount, 2, 'historical expansion rebuilds the account projection');
  assert.equal(
    (secondStats?.computedAt.getTime() ?? 0) > firstComputedAt.getTime(),
    true,
    'post-completion reconciliation records a newer projection',
  );

  const afterBackfill = await prisma.externalAccount.findUnique({ where: { id: account.id } });
  assert.equal(
    afterBackfill?.lastSyncRunId,
    forward.id,
    'historical backfill must not replace the latest forward-sync compatibility marker',
  );
  assert.equal(afterBackfill?.lastSyncAt?.getTime(), forwardCompletedAt.getTime());
  assert.equal(await service.reconcileNext(), false, 'clean derived state does not reconcile repeatedly');

  console.log('Account-import post-completion integration tests passed.');
} finally {
  if (userId !== undefined) {
    await prisma.appUser.deleteMany({ where: { id: userId } });
  }
  await prisma.$disconnect();
}
