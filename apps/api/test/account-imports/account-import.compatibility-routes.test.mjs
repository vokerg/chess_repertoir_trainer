import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { buildApp } from '../../dist/app.js';
import prismaModule from '../../dist/prisma.js';
import { canonicalizeAccountImportScope } from '../../dist/modules/account-imports/account-import.scope.js';

const prisma = prismaModule.default;
const suffix = randomUUID();
const scope = { variant: 'STANDARD', speeds: ['BULLET', 'BLITZ', 'RAPID'], rated: 'BOTH' };
let userId;

try {
  const user = await prisma.appUser.create({
    data: {
      displayName: 'ONB-020 compatibility routes',
      authProvider: 'test',
      authSubject: `onb-020-compatibility-${suffix}`,
    },
  });
  userId = user.id;
  const legacyCursor = new Date('2026-08-01T00:00:00.000Z');
  const account = await prisma.externalAccount.create({
    data: {
      userId: user.id,
      provider: 'LICHESS',
      username: `onb-020-compatibility-${suffix}`,
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
    assert.equal(reset.statusCode, 410, reset.body);
    assert.match(reset.json().message, /Raw sync-cursor reset has been removed/);

    const persistedAfterReset = await prisma.externalAccount.findUnique({ where: { id: account.id } });
    assert.equal(
      persistedAfterReset?.syncCursorTime?.getTime(),
      legacyCursor.getTime(),
      'deprecated raw reset cannot mutate the legacy sync frontier after lifecycle cutover',
    );
    const coverageAfterReset = await prisma.accountImportCoverage.findUnique({
      where: { accountId_scopeHash: { accountId: account.id, scopeHash: canonical.scopeHash } },
    });
    assert.equal(
      coverageAfterReset?.coveredFrom?.getTime(),
      coveredFrom.getTime(),
      'raw reset cutover does not rewind durable coverage',
    );
    assert.equal(coverageAfterReset?.coveredThrough?.getTime(), coveredThrough.getTime());

    const deletion = await app.inject({
      method: 'DELETE',
      url: `/api/me/accounts/${account.id}`,
    });
    assert.equal(deletion.statusCode, 409, deletion.body);
    assert.equal(deletion.json().code, 'DATA_LIFECYCLE_INVALID_STATE');
    assert.equal(await prisma.externalAccount.count({ where: { id: account.id } }), 1);

    const openApi = (await app.inject({ method: 'GET', url: '/api/docs/openapi.json' })).json();
    const legacyDelete = openApi.paths['/api/me/accounts/{id}'].delete;
    const legacyReset = openApi.paths['/api/me/accounts/{id}/reset-cursor'].post;
    assert.equal(legacyDelete.deprecated, true);
    assert.equal(legacyDelete.responses['200'], undefined);
    assert.notEqual(legacyDelete.responses['409'], undefined);
    assert.equal(legacyReset.deprecated, true);
    assert.equal(legacyReset.responses['200'], undefined);
    assert.notEqual(legacyReset.responses['410'], undefined);

    const backfill = await app.inject({
      method: 'POST',
      url: `/api/me/accounts/${account.id}/backfill`,
    });
    assert.equal(backfill.statusCode, 202, backfill.body);
    const run = backfill.json().importRun;
    assert.equal(run.accountId, account.id);
    assert.equal(run.mode, 'HISTORICAL_BACKFILL');
    assert.equal(run.source, 'ACCOUNT_REFRESH');
    assert.equal(run.status, 'QUEUED');
    assert.equal(run.requestedTo, coveredFrom.toISOString());
    assert.equal(Date.parse(run.requestedFrom) < Date.parse(run.requestedTo), true);

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
