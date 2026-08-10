import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import prismaModule from '../../dist/prisma.js';
import {
  AccountImportActiveRunError,
  AccountImportClaimLostError,
  AccountImportCoverageGapError,
  AccountImportInvalidRetryError,
  AccountImportWriteBatchTooLargeError,
  createAccountImportRepository,
} from '../../dist/modules/account-imports/account-import.repository.prisma.js';
import { canonicalizeAccountImportScope } from '../../dist/modules/account-imports/account-import.scope.js';

const prisma = prismaModule.default;
const suffix = randomUUID();
const userIds = [];
const repository = createAccountImportRepository(prisma);
const scope = { variant: 'STANDARD', speeds: ['RAPID', 'BLITZ'], rated: 'BOTH' };
const requestedFrom = new Date('2026-05-01T00:00:00.000Z');
const requestedTo = new Date('2026-08-01T00:00:00.000Z');

try {
  const canonical = canonicalizeAccountImportScope(scope);
  const reordered = canonicalizeAccountImportScope({ ...scope, speeds: ['BLITZ', 'RAPID'] });
  assert.deepEqual(canonical.scope.speeds, ['BLITZ', 'RAPID']);
  assert.equal(canonical.scopeHash, reordered.scopeHash, 'scope ordering does not change identity');
  assert.match(canonical.scopeHash, /^[a-f0-9]{64}$/);

  const primary = await createUserAccount('primary');
  const intruder = await createUserAccount('intruder');
  const cascade = await createUserAccount('cascade');
  userIds.push(primary.userId, intruder.userId, cascade.userId);

  await assert.rejects(
    repository.createRun(runInput({ userId: intruder.userId, accountId: primary.accountId })),
    /not found/i,
    'run creation is ownership scoped',
  );

  const guardRepository = createAccountImportRepository(prisma, {
    async assertAllowed() {
      throw new Error('lifecycle-fenced');
    },
  });
  await assert.rejects(
    guardRepository.createRun(runInput(primary)),
    /lifecycle-fenced/,
    'the ONB-019 guard executes inside durable acceptance',
  );
  assert.equal(await prisma.importRun.count({ where: { userId: primary.userId } }), 0);

  const concurrent = await Promise.allSettled([
    repository.createRun(runInput(primary)),
    repository.createRun(runInput(primary)),
  ]);
  const fulfilled = concurrent.filter((result) => result.status === 'fulfilled');
  const rejected = concurrent.filter((result) => result.status === 'rejected');
  assert.equal(fulfilled.length, 1, 'one concurrent creator wins');
  assert.equal(rejected.length, 1, 'one concurrent creator observes the active run');
  assert.ok(rejected[0].reason instanceof AccountImportActiveRunError);

  const initialRun = fulfilled[0].value;
  assert.equal(initialRun.mode, 'BOUNDED_INITIAL');
  assert.equal(initialRun.source, 'ONBOARDING');
  assert.equal(initialRun.status, 'QUEUED');
  assert.equal(initialRun.scopeHash, canonical.scopeHash);
  assert.deepEqual(initialRun.scope.speeds, ['BLITZ', 'RAPID']);
  assert.equal(initialRun.windowsTotal, 7);
  assert.ok(initialRun.startedAt instanceof Date, 'legacy-compatible startedAt remains non-null');

  assert.equal((await repository.getActiveRunForAccount(primary.userId, primary.accountId))?.id, initialRun.id);
  assert.equal(
    await repository.getActiveRunForAccount(intruder.userId, primary.accountId),
    null,
    'active-run reads do not cross ownership',
  );

  await assert.rejects(
    prisma.importRun.create({
      data: {
        userId: primary.userId,
        accountId: primary.accountId,
        provider: 'LICHESS',
        mode: 'BOUNDED_INITIAL',
        source: 'USER_ACTION',
        status: 'QUEUED',
        scopeVersion: canonical.scopeVersion,
        scopeHash: canonical.scopeHash,
        scopeJson: canonical.scope,
        requestedFrom,
        requestedTo,
        priority: 10,
      },
    }),
    isUniqueConstraintViolation,
    'the database independently enforces one non-terminal import per account',
  );

  await prisma.importRun.update({
    where: { id: initialRun.id },
    data: { status: 'RUNNING' },
  });
  const twoGameRepository = createAccountImportRepository(
    prisma,
    { async assertAllowed() {} },
    { maxWriteBatchSize: 2 },
  );
  await assert.rejects(
    twoGameRepository.persistGames({
      userId: primary.userId,
      importRunId: initialRun.id,
      games: [normalizedGame('batch-1'), normalizedGame('batch-2'), normalizedGame('batch-3')],
    }),
    AccountImportWriteBatchTooLargeError,
    'configured batch size is enforced before database work',
  );

  assert.deepEqual(
    await twoGameRepository.persistGames({
      userId: primary.userId,
      importRunId: initialRun.id,
      games: [normalizedGame('batch-1'), normalizedGame('batch-2')],
    }),
    { attempted: 2, inserted: 2, duplicate: 0 },
  );
  assert.deepEqual(
    await twoGameRepository.persistGames({
      userId: primary.userId,
      importRunId: initialRun.id,
      games: [normalizedGame('batch-1'), normalizedGame('batch-2')],
    }),
    { attempted: 2, inserted: 0, duplicate: 2 },
    'replay uses duplicate-safe bulk insertion',
  );
  assert.equal(await prisma.importedGame.count({ where: { accountId: primary.accountId } }), 2);
  const writeCounters = await repository.getRun(primary.userId, initialRun.id);
  assert.equal(writeCounters?.gamesMatchedScope, 4);
  assert.equal(writeCounters?.gamesImported, 2);
  assert.equal(writeCounters?.gamesDuplicate, 2);

  await assert.rejects(
    guardRepository.persistGames({
      userId: primary.userId,
      importRunId: initialRun.id,
      games: [normalizedGame('fenced-write')],
    }),
    /lifecycle-fenced/,
    'the ONB-019 guard is rechecked in the same bounded commit transaction',
  );
  assert.equal(await prisma.importedGame.count({ where: { accountId: primary.accountId } }), 2);

  const newestWindowFrom = new Date('2026-07-15T00:00:00.000Z');
  const newestWindowThrough = new Date('2026-08-01T00:00:00.000Z');
  const firstCoverage = await repository.extendCoverage({
    userId: primary.userId,
    importRunId: initialRun.id,
    coveredFrom: newestWindowFrom,
    coveredThrough: newestWindowThrough,
  });
  assert.equal(firstCoverage.coveredFrom.toISOString(), newestWindowFrom.toISOString());
  assert.equal(firstCoverage.coveredThrough.toISOString(), newestWindowThrough.toISOString());

  const extendedBack = await repository.extendCoverage({
    userId: primary.userId,
    importRunId: initialRun.id,
    coveredFrom: new Date('2026-07-01T00:00:00.000Z'),
    coveredThrough: newestWindowFrom,
  });
  assert.equal(extendedBack.coveredFrom.toISOString(), '2026-07-01T00:00:00.000Z');
  assert.equal(extendedBack.coveredThrough.toISOString(), newestWindowThrough.toISOString());
  assert.equal((await repository.extendCoverage({
    userId: primary.userId,
    importRunId: initialRun.id,
    coveredFrom: new Date('2026-07-01T00:00:00.000Z'),
    coveredThrough: newestWindowThrough,
  })).id, firstCoverage.id, 'coverage replay is idempotent');

  await assert.rejects(
    repository.extendCoverage({
      userId: primary.userId,
      importRunId: initialRun.id,
      coveredFrom: new Date('2026-06-01T00:00:00.000Z'),
      coveredThrough: new Date('2026-06-15T00:00:00.000Z'),
    }),
    AccountImportCoverageGapError,
    'coverage cannot jump an unproved gap',
  );
  assert.equal(
    (await repository.getCoverage(primary.userId, primary.accountId, {
      ...scope,
      speeds: ['BLITZ', 'RAPID'],
    }))?.id,
    firstCoverage.id,
  );

  await assert.rejects(
    prisma.accountImportCoverage.create({
      data: {
        accountId: primary.accountId,
        scopeVersion: 1,
        scopeHash: 'c'.repeat(64),
        scopeJson: canonical.scope,
        coveredFrom: new Date('2026-07-01T00:00:00.000Z'),
        coveredThrough: null,
      },
    }),
    isCheckConstraintViolation,
    'coverage boundaries are database constrained as a pair',
  );

  await prisma.importRun.update({
    where: { id: initialRun.id },
    data: { status: 'FAILED', completedAt: new Date(), errorCode: 'PROVIDER_FAILURE' },
  });
  await assert.rejects(
    repository.createRun(runInput({
      ...primary,
      retryOfImportRunId: initialRun.id,
      scope: { ...scope, rated: 'RATED' },
    })),
    AccountImportInvalidRetryError,
    'retry cannot silently change immutable scope',
  );

  const retryRun = await repository.createRun(runInput({ ...primary, retryOfImportRunId: initialRun.id }));
  assert.equal(retryRun.retryOfImportRunId, initialRun.id);
  assert.equal(retryRun.scopeHash, initialRun.scopeHash);
  assert.equal(retryRun.requestedFrom.toISOString(), requestedFrom.toISOString());
  assert.equal(retryRun.requestedTo.toISOString(), requestedTo.toISOString());

  const retryWorkKey = `account-import-${suffix}`;
  await prisma.importRun.update({
    where: { id: retryRun.id },
    data: { status: 'RUNNING', workKey: retryWorkKey, claimedAt: new Date(), heartbeatAt: new Date() },
  });
  await assert.rejects(
    repository.persistGames({
      userId: primary.userId,
      importRunId: retryRun.id,
      workKey: 'stale-work-key',
      games: [normalizedGame('stale-worker')],
    }),
    AccountImportClaimLostError,
    'a stale worker cannot persist through a mismatched work key',
  );
  assert.deepEqual(
    await repository.persistGames({
      userId: primary.userId,
      importRunId: retryRun.id,
      workKey: retryWorkKey,
      games: [normalizedGame('claimed-worker')],
    }),
    { attempted: 1, inserted: 1, duplicate: 0 },
  );
  assert.equal(await repository.hasActiveClaimForAccount(primary.userId, primary.accountId), true);
  assert.equal(await repository.hasActiveClaimForAccount(intruder.userId, primary.accountId), false);

  await prisma.importRun.update({
    where: { id: retryRun.id },
    data: { status: 'FAILED', workKey: null, completedAt: new Date() },
  });
  assert.equal(await repository.hasActiveClaimForAccount(primary.userId, primary.accountId), false);

  assert.equal(await repository.clearCoverageForAccount(primary.userId, primary.accountId), 1);
  assert.equal(await prisma.importRun.count({ where: { accountId: primary.accountId } }), 2);
  assert.equal(await repository.getCoverage(primary.userId, primary.accountId, scope), null);

  const cascadeRun = await repository.createRun(runInput(cascade));
  await repository.extendCoverage({
    userId: cascade.userId,
    importRunId: cascadeRun.id,
    coveredFrom: requestedFrom,
    coveredThrough: requestedTo,
  });
  assert.equal(await prisma.accountImportCoverage.count({ where: { accountId: cascade.accountId } }), 1);
  await prisma.externalAccount.delete({ where: { id: cascade.accountId } });
  assert.equal(await prisma.accountImportCoverage.count({ where: { accountId: cascade.accountId } }), 0);
  assert.equal(await prisma.importRun.count({ where: { accountId: cascade.accountId } }), 0);
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
    mode: overrides.mode ?? 'BOUNDED_INITIAL',
    source: overrides.source ?? 'ONBOARDING',
    scope: overrides.scope ?? scope,
    requestedFrom: overrides.requestedFrom ?? requestedFrom,
    requestedTo: overrides.requestedTo ?? requestedTo,
    priority: overrides.priority ?? 100,
    windowsTotal: overrides.windowsTotal ?? 7,
    retryOfImportRunId: overrides.retryOfImportRunId ?? null,
  };
}

function normalizedGame(providerGameId) {
  return {
    providerGameId,
    providerUrl: `https://example.invalid/game/${providerGameId}`,
    pgn: '[Event "ONB-011"]\n\n1. e4 e5 2. Nf3 Nc6 *',
    rated: true,
    variant: 'standard',
    speedCategory: 'blitz',
    endedAt: new Date('2026-07-20T12:00:00.000Z'),
    whiteUsername: 'white',
    blackUsername: 'black',
    userColor: 'WHITE',
    opponentUsername: 'black',
    result: '*',
    resultForUser: 'DRAW',
  };
}

async function createUserAccount(label) {
  const user = await prisma.appUser.create({
    data: {
      displayName: `Account import ${label}`,
      authProvider: 'test',
      authSubject: `account-import-${label}-${suffix}`,
    },
  });
  const account = await prisma.externalAccount.create({
    data: {
      userId: user.id,
      provider: 'LICHESS',
      username: `account-import-${label}-${suffix}`,
    },
  });
  return { userId: user.id, accountId: account.id };
}

function isUniqueConstraintViolation(error) {
  return error?.code === 'P2002'
    || (error?.code === 'P2010' && error?.meta?.code === '23505');
}

function isCheckConstraintViolation(error) {
  return error?.code === 'P2004'
    || (error?.code === 'P2010' && error?.meta?.code === '23514');
}
