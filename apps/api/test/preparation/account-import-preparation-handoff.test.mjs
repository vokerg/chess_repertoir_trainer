import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import prismaModule from '../../dist/prisma.js';
import { createAccountImportRepository } from '../../dist/modules/account-imports/account-import.repository.prisma.js';
import { canonicalizeAccountImportScope } from '../../dist/modules/account-imports/account-import.scope.js';
import { createAccountImportPreparationHandoffRepository } from '../../dist/modules/preparation/account-import-preparation-handoff.repository.prisma.js';

const prisma = prismaModule.default;
const accountImports = createAccountImportRepository(prisma);
const handoff = createAccountImportPreparationHandoffRepository(prisma);
const suffix = randomUUID();
const userIds = [];
const scope = { variant: 'STANDARD', speeds: ['BULLET', 'BLITZ', 'RAPID'], rated: 'BOTH' };

try {
  {
    const user = await createUser('multi-account');
    userIds.push(user.id);
    const firstAccount = await createAccount(user.id, 'first');
    const secondAccount = await createAccount(user.id, 'second');
    const firstRun = await createImport(user.id, firstAccount.id, '2026-05-01', '2026-08-01');
    const secondRun = await createImport(user.id, secondAccount.id, '2026-05-01', '2026-08-01');

    assert.equal(await handoff.reconcileNext(), true);
    const preparation = await prisma.dataPreparationRun.findFirst({
      where: { userId: user.id },
      include: { targets: { orderBy: { ordinal: 'asc' } } },
    });
    assert.ok(preparation);
    assert.equal(preparation.purpose, 'EXPANSION');
    assert.equal(preparation.status, 'QUEUED');
    assert.equal(preparation.targets.length, 2);
    assert.deepEqual(
      preparation.targets.map((target) => [target.accountId, target.currentImportRunId, target.ordinal]),
      [
        [firstAccount.id, firstRun.id, 0],
        [secondAccount.id, secondRun.id, 1],
      ],
    );
    for (const target of preparation.targets) {
      assert.deepEqual(target.scopeJson, {
        rated: 'ANY',
        speedCategories: ['BLITZ', 'RAPID'],
        variants: ['STANDARD'],
      });
      assert.equal(target.scopeHash.length, 64);
    }
    assert.equal(
      preparation.targets[0].scopeHash,
      preparation.targets[1].scopeHash,
      'identical preparation scopes have identical canonical hashes',
    );
    assert.equal(
      await handoff.reconcileNext(),
      false,
      'already linked imports do not create duplicate expansion runs',
    );
  }

  {
    const user = await createUser('retry');
    userIds.push(user.id);
    const account = await createAccount(user.id, 'retry');
    const original = await createImport(user.id, account.id, '2026-05-01', '2026-08-01');

    assert.equal(await handoff.reconcileNext(), true);
    const target = await prisma.dataPreparationTarget.findFirst({
      where: { currentImportRunId: original.id },
      include: { preparationRun: true },
    });
    assert.ok(target);

    await prisma.importRun.update({
      where: { id: original.id },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        errorCode: 'TEST_FAILURE',
        error: 'test failure',
      },
    });
    await prisma.dataPreparationRun.update({
      where: { id: target.preparationRunId },
      data: {
        status: 'NEEDS_ATTENTION',
        attentionCode: 'IMPORT_RETRY_AVAILABLE',
        attentionDetail: 'Retry import.',
      },
    });

    const retry = await accountImports.createRun({
      userId: user.id,
      accountId: account.id,
      mode: 'BOUNDED_INITIAL',
      source: 'ACCOUNT_REFRESH',
      scope,
      requestedFrom: original.requestedFrom,
      requestedTo: original.requestedTo,
      priority: 100,
      windowsTotal: null,
      retryOfImportRunId: original.id,
    });

    assert.equal(await handoff.reconcileNext(), true);
    const relinked = await prisma.dataPreparationTarget.findUnique({
      where: { id: target.id },
      include: { preparationRun: true },
    });
    assert.equal(relinked?.currentImportRunId, retry.id);
    assert.equal(relinked?.preparationRun.id, target.preparationRunId);
    assert.equal(
      await prisma.dataPreparationRun.count({ where: { userId: user.id } }),
      1,
      'retry relinks the existing recoverable parent instead of creating duplicate preparation',
    );
  }

  {
    const user = await createUser('generic-user-action');
    userIds.push(user.id);
    const account = await createAccount(user.id, 'generic-user-action');
    const generic = await createImport(
      user.id,
      account.id,
      '2026-05-01',
      '2026-08-01',
      scope,
      'USER_ACTION',
    );

    assert.equal(await handoff.reconcileNext(), false);
    assert.equal(
      await prisma.dataPreparationTarget.count({ where: { currentImportRunId: generic.id } }),
      0,
      'generic durable user actions are not silently adopted into account-refresh preparation',
    );
  }

  {
    const user = await createUser('completed-coverage');
    userIds.push(user.id);
    const account = await createAccount(user.id, 'completed-coverage');
    const completed = await createImport(user.id, account.id, '2026-05-01', '2026-08-01');
    const completedAt = new Date('2026-08-01T01:00:00.000Z');
    await prisma.importRun.update({
      where: { id: completed.id },
      data: { status: 'COMPLETED', completedAt },
    });

    assert.equal(
      await handoff.reconcileNext(),
      false,
      'retained completed import history without exact coverage cannot manufacture preparation',
    );
    const canonical = canonicalizeAccountImportScope(scope);
    await prisma.accountImportCoverage.create({
      data: {
        accountId: account.id,
        scopeVersion: canonical.scopeVersion,
        scopeHash: canonical.scopeHash,
        scopeJson: canonical.scope,
        coveredFrom: completed.requestedFrom,
        coveredThrough: completed.requestedTo,
        lastCompletedImportRunId: completed.id,
      },
    });
    assert.equal(
      await handoff.reconcileNext(),
      true,
      'surviving exact coverage makes a completed account refresh eligible for restart-safe handoff',
    );
  }

  {
    const user = await createUser('bullet-only');
    userIds.push(user.id);
    const account = await createAccount(user.id, 'bullet-only');
    const bulletOnly = await createImport(
      user.id,
      account.id,
      '2026-05-01',
      '2026-08-01',
      { variant: 'STANDARD', speeds: ['BULLET'], rated: 'BOTH' },
    );

    assert.equal(await handoff.reconcileNext(), false);
    assert.equal(
      await prisma.dataPreparationTarget.count({ where: { currentImportRunId: bulletOnly.id } }),
      0,
      'bullet-only durable imports do not enter the standard Blitz/Rapid preparation pipeline',
    );
  }

  console.log('Account-import preparation handoff tests passed.');
} finally {
  if (userIds.length > 0) {
    await prisma.appUser.deleteMany({ where: { id: { in: userIds } } });
  }
  await prisma.$disconnect();
}

async function createUser(label) {
  return prisma.appUser.create({
    data: {
      displayName: `ONB-015 handoff ${label}`,
      authProvider: 'test',
      authSubject: `onb-015-handoff-${label}-${suffix}`,
    },
  });
}

async function createAccount(userId, label) {
  return prisma.externalAccount.create({
    data: {
      userId,
      provider: 'LICHESS',
      username: `onb-015-${label}-${suffix}`,
    },
  });
}

function createImport(
  userId,
  accountId,
  fromDate,
  toDate,
  importScope = scope,
  source = 'ACCOUNT_REFRESH',
) {
  return accountImports.createRun({
    userId,
    accountId,
    mode: 'BOUNDED_INITIAL',
    source,
    scope: importScope,
    requestedFrom: new Date(`${fromDate}T00:00:00.000Z`),
    requestedTo: new Date(`${toDate}T00:00:00.000Z`),
    priority: 100,
    windowsTotal: null,
  });
}
