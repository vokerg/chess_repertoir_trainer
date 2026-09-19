import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import prismaModule from '../../dist/prisma.js';
import {
  createAccountImportRepository,
} from '../../dist/modules/account-imports/account-import.repository.prisma.js';
import {
  createAccountImportProviderCommitRepository,
} from '../../dist/modules/account-imports/account-import.provider-commit.repository.prisma.js';

const prisma = prismaModule.default;
const suffix = randomUUID();
const repository = createAccountImportRepository(prisma);
const commitRepository = createAccountImportProviderCommitRepository(prisma);
let userId = null;

try {
  const user = await prisma.appUser.create({
    data: {
      displayName: 'ONB-013 shared commit',
      authProvider: 'test',
      authSubject: `onb-013-provider-commit-${suffix}`,
    },
  });
  userId = user.id;
  const account = await prisma.externalAccount.create({
    data: {
      userId: user.id,
      provider: 'LICHESS',
      username: `onb-013-${suffix}`,
    },
  });
  const run = await repository.createRun({
    userId: user.id,
    accountId: account.id,
    mode: 'BOUNDED_INITIAL',
    source: 'USER_ACTION',
    scope: { variant: 'STANDARD', speeds: ['BLITZ', 'RAPID'], rated: 'BOTH' },
    requestedFrom: new Date('2026-08-01T00:00:00.000Z'),
    requestedTo: new Date('2026-08-08T00:00:00.000Z'),
    priority: 100,
    windowsTotal: null,
  });
  const workKey = `ACCOUNT_IMPORT:${suffix}`;
  await prisma.importRun.update({
    where: { id: run.id },
    data: {
      status: 'RUNNING',
      workKey,
      claimedAt: new Date(),
      heartbeatAt: new Date(),
    },
  });

  const planCheckpoint = checkpoint(null);
  await commitRepository.initializePlan({
    userId: user.id,
    importRunId: run.id,
    workKey,
    windowsTotal: 1,
    windowsCompleted: 0,
    checkpoint: planCheckpoint,
  });
  let persistedRun = await prisma.importRun.findUniqueOrThrow({ where: { id: run.id } });
  assert.deepEqual(persistedRun.checkpointJson, planCheckpoint);
  assert.equal(persistedRun.windowsTotal, 1);

  const activeCheckpoint = checkpoint({
    index: 0,
    from: '2026-08-01T00:00:00.000Z',
    to: '2026-08-08T00:00:00.000Z',
  });
  assert.deepEqual(
    await commitRepository.persistBatch({
      userId: user.id,
      importRunId: run.id,
      workKey,
      scopeHash: run.scopeHash,
      checkpoint: activeCheckpoint,
      games: [normalizedGame('atomic-1'), normalizedGame('atomic-2')],
      gamesSeenDelta: 3,
      gamesSkippedOutOfScopeDelta: 1,
      gamesFailedDelta: 0,
    }),
    { attempted: 2, inserted: 2, duplicate: 0 },
  );
  persistedRun = await prisma.importRun.findUniqueOrThrow({ where: { id: run.id } });
  assert.equal(persistedRun.gamesSeen, 3);
  assert.equal(persistedRun.gamesMatchedScope, 2);
  assert.equal(persistedRun.gamesImported, 2);
  assert.equal(persistedRun.gamesDuplicate, 0);
  assert.equal(persistedRun.gamesSkippedOutOfScope, 1);
  assert.deepEqual(persistedRun.checkpointJson, activeCheckpoint);
  assert.equal(await prisma.importedGame.count({ where: { accountId: account.id } }), 2);

  const beforeWrongScope = snapshot(persistedRun);
  await assert.rejects(
    commitRepository.persistBatch({
      userId: user.id,
      importRunId: run.id,
      workKey,
      scopeHash: 'b'.repeat(64),
      checkpoint: activeCheckpoint,
      games: [normalizedGame('wrong-scope')],
      gamesSeenDelta: 1,
      gamesSkippedOutOfScopeDelta: 0,
      gamesFailedDelta: 0,
    }),
    /scope does not match/i,
  );
  persistedRun = await prisma.importRun.findUniqueOrThrow({ where: { id: run.id } });
  assert.deepEqual(snapshot(persistedRun), beforeWrongScope);
  assert.equal(
    await prisma.importedGame.count({ where: { accountId: account.id, providerGameId: 'wrong-scope' } }),
    0,
  );

  const fenced = createAccountImportProviderCommitRepository(prisma, {
    async assertAllowed() { throw new Error('lifecycle-fenced'); },
  });
  await assert.rejects(
    fenced.persistBatch({
      userId: user.id,
      importRunId: run.id,
      workKey,
      scopeHash: run.scopeHash,
      checkpoint: checkpoint({
        index: 0,
        from: '2026-08-01T00:00:00.000Z',
        to: '2026-08-08T00:00:00.000Z',
      }),
      games: [normalizedGame('must-rollback')],
      gamesSeenDelta: 1,
      gamesSkippedOutOfScopeDelta: 0,
      gamesFailedDelta: 0,
    }),
    /lifecycle-fenced/,
  );
  persistedRun = await prisma.importRun.findUniqueOrThrow({ where: { id: run.id } });
  assert.deepEqual(snapshot(persistedRun), beforeWrongScope, 'fence rejection rolls back rows and progress together');
  assert.equal(
    await prisma.importedGame.count({ where: { accountId: account.id, providerGameId: 'must-rollback' } }),
    0,
  );
} finally {
  if (userId !== null) await prisma.appUser.deleteMany({ where: { id: userId } });
  await prisma.$disconnect();
}

function checkpoint(currentWindow) {
  return {
    version: 1,
    provider: 'LICHESS',
    windowDays: 14,
    currentWindow,
  };
}

function normalizedGame(providerGameId) {
  return {
    providerGameId,
    providerUrl: `https://lichess.org/${providerGameId}`,
    rated: true,
    variant: 'standard',
    speedCategory: 'blitz',
    endedAt: new Date('2026-08-05T12:00:00.000Z'),
    whiteUsername: 'fixture',
    blackUsername: 'opponent',
    userColor: 'WHITE',
    opponentUsername: 'opponent',
    result: '1-0',
    resultForUser: 'WIN',
    status: 'mate',
  };
}

function snapshot(run) {
  return {
    gamesSeen: run.gamesSeen,
    gamesMatchedScope: run.gamesMatchedScope,
    gamesImported: run.gamesImported,
    gamesDuplicate: run.gamesDuplicate,
    gamesSkippedOutOfScope: run.gamesSkippedOutOfScope,
    checkpointJson: run.checkpointJson,
  };
}

console.log('Lichess shared provider commit tests passed.');
