import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import prismaModule from '../../dist/prisma.js';
import { createAccountImportRepository } from '../../dist/modules/account-imports/account-import.repository.prisma.js';
import {
  AccountImportRangeUnavailableError,
  AccountImportService,
} from '../../dist/modules/account-imports/account-import.service.js';
import { createAccountImportPreparationHandoffRepository } from '../../dist/modules/preparation/account-import-preparation-handoff.repository.prisma.js';

const prisma = prismaModule.default;
const accountImports = createAccountImportRepository(prisma);
const handoff = createAccountImportPreparationHandoffRepository(prisma);
const suffix = randomUUID();
const scope = { variant: 'STANDARD', speeds: ['BULLET', 'BLITZ', 'RAPID'], rated: 'BOTH' };
let userId;

try {
  const user = await prisma.appUser.create({
    data: {
      displayName: 'ONB-015 refresh recovery policy',
      authProvider: 'test',
      authSubject: `onb-015-refresh-policy-${suffix}`,
    },
  });
  userId = user.id;
  const account = await prisma.externalAccount.create({
    data: {
      userId: user.id,
      provider: 'LICHESS',
      username: `onb-015-refresh-policy-${suffix}`,
    },
  });

  const original = await accountImports.createRun({
    userId: user.id,
    accountId: account.id,
    mode: 'BOUNDED_INITIAL',
    source: 'ACCOUNT_REFRESH',
    scope,
    requestedFrom: new Date('2026-05-01T00:00:00.000Z'),
    requestedTo: new Date('2026-08-01T00:00:00.000Z'),
    priority: 100,
    windowsTotal: null,
  });
  assert.equal(await handoff.reconcileNext(), true);
  const target = await prisma.dataPreparationTarget.findFirst({
    where: { currentImportRunId: original.id },
    include: { preparationRun: true },
  });
  assert.ok(target);

  await prisma.importRun.update({
    where: { id: original.id },
    data: {
      status: 'CANCELLED',
      completedAt: new Date(),
      errorCode: 'CANCELLED_BY_USER',
      error: 'Cancelled by user.',
    },
  });
  await assert.rejects(
    AccountImportService.createNormalRefreshForUser(
      user.id,
      account.id,
      new Date('2026-08-02T00:00:00.000Z'),
    ),
    (error) => {
      assert.ok(error instanceof AccountImportRangeUnavailableError);
      assert.match(error.message, /Retry the cancelled account import/);
      return true;
    },
  );

  const retryResponse = await AccountImportService.retryForUser(user.id, original.id);
  const retry = retryResponse.importRun;
  assert.equal(retry.source, 'ACCOUNT_REFRESH');
  assert.equal(retry.retryOfImportRunId, original.id);
  assert.equal(await handoff.reconcileNext(), true);
  const relinked = await prisma.dataPreparationTarget.findUnique({ where: { id: target.id } });
  assert.equal(relinked?.currentImportRunId, retry.id);

  await prisma.importRun.update({
    where: { id: retry.id },
    data: {
      status: 'CANCELLED',
      completedAt: new Date(),
      errorCode: 'CANCELLED_BY_USER',
      error: 'Cancelled by user.',
    },
  });
  await assert.rejects(
    AccountImportService.createHistoricalBackfillForUser(user.id, account.id),
    (error) => {
      assert.ok(error instanceof AccountImportRangeUnavailableError);
      assert.match(error.message, /Import the recent account range before requesting older history/);
      return true;
    },
    'backfill still requires proved recent coverage before refresh-retry admission is relevant',
  );

  await prisma.dataPreparationRun.update({
    where: { id: target.preparationRunId },
    data: {
      status: 'CANCELLED',
      attentionCode: null,
      attentionDetail: null,
      reconcileAfter: null,
    },
  });

  const replacement = await AccountImportService.createNormalRefreshForUser(
    user.id,
    account.id,
    new Date('2026-08-02T00:00:00.000Z'),
  );
  assert.equal(replacement.importRun.source, 'ACCOUNT_REFRESH');
  assert.equal(replacement.importRun.retryOfImportRunId, null);
  assert.equal(
    replacement.importRun.status,
    'QUEUED',
    'terminal preparation state leaves retained cancelled import history reusable',
  );

  console.log('Account-import refresh recovery policy integration tests passed.');
} finally {
  if (userId !== undefined) {
    await prisma.appUser.deleteMany({ where: { id: userId } });
  }
  await prisma.$disconnect();
}
