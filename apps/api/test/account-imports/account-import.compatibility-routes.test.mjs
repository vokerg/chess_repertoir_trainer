import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { buildApp } from '../../dist/app.js';
import prismaModule from '../../dist/prisma.js';
import { canonicalizeAccountImportScope } from '../../dist/modules/account-imports/account-import.scope.js';

const prisma = prismaModule.default;
const suffix = randomUUID();
const scope = { variant: 'STANDARD', speeds: ['BLITZ', 'RAPID'], rated: 'BOTH' };
let userId;

try {
  const user = await prisma.appUser.create({
    data: {
      displayName: 'ONB-015 compatibility routes',
      authProvider: 'test',
      authSubject: `onb-015-compatibility-${suffix}`,
    },
  });
  userId = user.id;
  const legacyCursor = new Date('2026-08-01T00:00:00.000Z');
  const account = await prisma.externalAccount.create({
    data: {
      userId: user.id,
      provider: 'LICHESS',
      username: `onb-015-compatibility-${suffix}`,
      syncCursorTime: legacyCursor,
    },
  });
  const canonical = canonicalizeAccountImportScope(scope);
  const coveredFrom = new Date('2026-05-01T00:00:00.000Z');
  const coveredThrough = new Date('2026-08-01T00:00:00.000Z');
  await prisma.accountImportCoverage.create({
    data: {
      accountId: account.id,
      scopeVersion: canonical.scopeVersion,
      scopeHash: canonical.scopeHash,
      scopeJson: canonical.scope,
      coveredFrom,
      coveredThrough,
    },
  });

  const app = await buildApp({
    logger: false,
    authConfig: { mode: 'dev-single-user', userId: user.id },
  });
  try {
    await app.ready();

    const reset = await app.inject({
      method: 'POST',
      url: `/api/me/accounts/${account.id}/reset-cursor`,
    });
    assert.equal(reset.statusCode, 202, reset.body);
    const run = reset.json().importRun;
    assert.equal(run.accountId, account.id);
    assert.equal(run.mode, 'HISTORICAL_BACKFILL');
    assert.equal(run.status, 'QUEUED');
    assert.equal(run.requestedTo, coveredFrom.toISOString());
    assert.equal(Date.parse(run.requestedFrom) < Date.parse(run.requestedTo), true);

    const persisted = await prisma.externalAccount.findUnique({ where: { id: account.id } });
    assert.equal(
      persisted?.syncCursorTime?.getTime(),
      legacyCursor.getTime(),
      'deprecated reset no longer mutates the legacy forward cursor',
    );

    const duplicateBackfill = await app.inject({
      method: 'POST',
      url: `/api/me/accounts/${account.id}/backfill`,
    });
    assert.equal(duplicateBackfill.statusCode, 409);
    assert.equal(duplicateBackfill.json().code, 'ACCOUNT_IMPORT_ACTIVE');
  } finally {
    await app.close();
  }

  console.log('Account-import compatibility route tests passed.');
} finally {
  if (userId !== undefined) {
    await prisma.appUser.deleteMany({ where: { id: userId } });
  }
  await prisma.$disconnect();
}
