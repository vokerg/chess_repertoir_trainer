import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import prismaModule from '../../dist/prisma.js';
import { createAccountImportRepository } from '../../dist/modules/account-imports/account-import.repository.prisma.js';
import { canonicalizeAccountImportScope } from '../../dist/modules/account-imports/account-import.scope.js';
import {
  AccountImportRangeUnavailableError,
  AccountImportService,
} from '../../dist/modules/account-imports/account-import.service.js';

const prisma = prismaModule.default;
const accountImports = createAccountImportRepository(prisma);
const suffix = randomUUID();
const scope = { variant: 'STANDARD', speeds: ['BULLET', 'BLITZ', 'RAPID'], rated: 'BOTH' };
const canonical = canonicalizeAccountImportScope(scope);
let userId;

try {
  const user = await prisma.appUser.create({
    data: {
      displayName: 'ONB-015 partial initial refresh recovery',
      authProvider: 'test',
      authSubject: `onb-015-partial-refresh-${suffix}`,
    },
  });
  userId = user.id;
  const account = await prisma.externalAccount.create({
    data: {
      userId: user.id,
      provider: 'LICHESS',
      username: `onb-015-partial-refresh-${suffix}`,
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
  const coverage = await prisma.accountImportCoverage.create({
    data: {
      accountId: account.id,
      scopeVersion: canonical.scopeVersion,
      scopeHash: canonical.scopeHash,
      scopeJson: canonical.scope,
      coveredFrom: new Date('2026-07-01T00:00:00.000Z'),
      coveredThrough: original.requestedTo,
      lastCompletedImportRunId: null,
    },
  });
  await prisma.importRun.update({
    where: { id: original.id },
    data: {
      status: 'CANCELLED',
      completedAt: new Date(coverage.createdAt.getTime() + 1),
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
    'partial newest-first initial coverage must not be abandoned by a new forward refresh',
  );

  await prisma.accountImportCoverage.delete({ where: { id: coverage.id } });
  const afterPurge = await AccountImportService.createNormalRefreshForUser(
    user.id,
    account.id,
    new Date('2026-08-02T00:00:00.000Z'),
  );
  assert.equal(afterPurge.importRun.mode, 'BOUNDED_INITIAL');
  assert.equal(afterPurge.importRun.source, 'ACCOUNT_REFRESH');
  assert.equal(afterPurge.importRun.retryOfImportRunId, null);
  assert.equal(
    afterPurge.importRun.status,
    'QUEUED',
    'cleared coverage leaves retained terminal history reusable after a future purge',
  );

  console.log('Account-import partial initial coverage recovery tests passed.');
} finally {
  if (userId !== undefined) {
    await prisma.appUser.deleteMany({ where: { id: userId } });
  }
  await prisma.$disconnect();
}
