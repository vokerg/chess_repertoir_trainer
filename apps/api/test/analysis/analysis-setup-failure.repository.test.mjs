import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import prismaModule from '../../dist/prisma.js';
import {
  recordGameAnalysisSetupFailure,
} from '../../dist/modules/analysis/analysis-run-lifecycle.repository.prisma.js';

const prisma = prismaModule.default;
const suffix = randomUUID();
let userId;

try {
  const user = await prisma.appUser.create({
    data: {
      displayName: 'Analysis setup failure repository test',
      authProvider: 'test',
      authSubject: `analysis-setup-failure-${suffix}`,
    },
  });
  userId = user.id;

  const account = await prisma.externalAccount.create({
    data: {
      userId,
      provider: 'LICHESS',
      username: `analysis-setup-failure-${suffix}`,
    },
  });

  const createGame = (name) => prisma.importedGame.create({
    data: {
      userId,
      accountId: account.id,
      provider: 'LICHESS',
      providerGameId: `${name}-${suffix}`,
      endedAt: new Date('2026-08-17T00:00:00.000Z'),
    },
  });

  {
    const game = await createGame('fresh');
    const failed = await recordGameAnalysisSetupFailure({
      userId,
      importedGameId: game.id,
      force: false,
      error: 'Local batch Stockfish analysis is disabled',
    });
    assert.equal(failed?.status, 'FAILED');

    const stored = await prisma.importedGame.findUniqueOrThrow({ where: { id: game.id } });
    assert.equal(stored.latestAnalysisRunId, failed?.id);
    assert.equal(stored.latestAnalysisStatus, 'FAILED');
    assert.ok(stored.latestAnalysisCompletedAt);

    const runs = await prisma.gameAnalysisRun.findMany({ where: { importedGameId: game.id } });
    assert.equal(runs.length, 1);
    assert.equal(runs[0].status, 'FAILED');
    assert.equal(runs[0].positionsTotal, 0);
    assert.equal(runs[0].positionsDone, 0);
    assert.equal(runs[0].error, 'Local batch Stockfish analysis is disabled');
  }

  {
    const game = await createGame('current');
    const completedAt = new Date('2026-08-17T00:01:00.000Z');
    const completed = await prisma.gameAnalysisRun.create({
      data: {
        importedGameId: game.id,
        status: 'COMPLETED',
        positionsTotal: 0,
        positionsDone: 0,
        completedAt,
      },
    });
    await prisma.importedGame.update({
      where: { id: game.id },
      data: {
        latestAnalysisRunId: completed.id,
        latestAnalysisStatus: completed.status,
        latestAnalysisCreatedAt: completed.createdAt,
        latestAnalysisCompletedAt: completed.completedAt,
      },
    });

    const skipped = await recordGameAnalysisSetupFailure({
      userId,
      importedGameId: game.id,
      force: false,
      error: 'engine unavailable',
    });
    assert.equal(skipped, null, 'non-forced setup failure preserves a current completed analysis');

    let stored = await prisma.importedGame.findUniqueOrThrow({ where: { id: game.id } });
    assert.equal(stored.latestAnalysisRunId, completed.id);
    assert.equal(stored.latestAnalysisStatus, 'COMPLETED');
    assert.equal(
      await prisma.gameAnalysisRun.count({ where: { importedGameId: game.id } }),
      1,
    );

    const forced = await recordGameAnalysisSetupFailure({
      userId,
      importedGameId: game.id,
      force: true,
      error: 'forced refresh setup failed',
    });
    assert.equal(forced?.status, 'FAILED');

    stored = await prisma.importedGame.findUniqueOrThrow({ where: { id: game.id } });
    assert.equal(stored.latestAnalysisRunId, forced?.id);
    assert.equal(stored.latestAnalysisStatus, 'FAILED');
    assert.equal(
      await prisma.gameAnalysisRun.count({ where: { importedGameId: game.id } }),
      2,
      'forced setup failure is retained as a distinct failed attempt',
    );
  }

  await assert.rejects(
    recordGameAnalysisSetupFailure({
      userId,
      importedGameId: 2_147_000_000,
      force: false,
      error: 'missing game',
    }),
    /Imported game not found/,
  );

  console.log('Atomic analysis setup-failure repository tests passed.');
} finally {
  if (userId !== undefined) {
    await prisma.appUser.deleteMany({ where: { id: userId } });
  }
  await prisma.$disconnect();
}
