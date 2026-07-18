import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import prismaModule from '../../dist/prisma.js';
import {
  getLatestGameAnalysisForImportedGame,
} from '../../dist/modules/analysis/analysis.repository.prisma.js';
import {
  abandonGameAnalysisRun,
  getLatestGameAnalysisRunDeterministic,
} from '../../dist/modules/analysis/analysis-run-lifecycle.repository.prisma.js';

const prisma = prismaModule.default;
const suffix = randomUUID();
let userId;

try {
  const user = await prisma.appUser.create({
    data: {
      displayName: 'Latest analysis snapshot test',
      authProvider: 'test',
      authSubject: `latest-analysis-${suffix}`,
    },
  });
  userId = user.id;

  const account = await prisma.externalAccount.create({
    data: {
      userId,
      provider: 'LICHESS',
      username: `latest-analysis-${suffix}`,
    },
  });

  const createGame = (name) => prisma.importedGame.create({
    data: {
      userId,
      accountId: account.id,
      provider: 'LICHESS',
      providerGameId: `${name}-${suffix}`,
      endedAt: new Date('2026-07-16T12:00:00.000Z'),
    },
  });

  {
    const game = await createGame('snapshot-order');
    const olderCreatedAt = new Date('2026-07-16T12:01:00.000Z');
    const newerCreatedAt = new Date('2026-07-16T12:02:00.000Z');
    const olderRun = await prisma.gameAnalysisRun.create({
      data: {
        importedGameId: game.id,
        status: 'FAILED',
        positionsTotal: 20,
        positionsDone: 5,
        error: 'older failure',
        createdAt: olderCreatedAt,
        completedAt: new Date('2026-07-16T12:05:00.000Z'),
      },
    });
    const newerRun = await prisma.gameAnalysisRun.create({
      data: {
        importedGameId: game.id,
        status: 'COMPLETED',
        positionsTotal: 20,
        positionsDone: 20,
        whiteAccuracy: 91,
        blackAccuracy: 84,
        createdAt: newerCreatedAt,
        completedAt: new Date('2026-07-16T12:04:00.000Z'),
      },
    });

    await prisma.importedGame.update({
      where: { id: game.id },
      data: {
        latestAnalysisRunId: newerRun.id,
        latestAnalysisStatus: newerRun.status,
        latestAnalysisCreatedAt: newerRun.createdAt,
        latestAnalysisCompletedAt: newerRun.completedAt,
        latestWhiteAccuracy: newerRun.whiteAccuracy,
        latestBlackAccuracy: newerRun.blackAccuracy,
      },
    });

    await prisma.importedGame.update({
      where: { id: game.id },
      data: {
        latestAnalysisRunId: olderRun.id,
        latestAnalysisStatus: olderRun.status,
        latestAnalysisCreatedAt: olderRun.createdAt,
        latestAnalysisCompletedAt: olderRun.completedAt,
        latestWhiteAccuracy: olderRun.whiteAccuracy,
        latestBlackAccuracy: olderRun.blackAccuracy,
      },
    });

    const stored = await prisma.importedGame.findUniqueOrThrow({ where: { id: game.id } });
    assert.equal(stored.latestAnalysisRunId, newerRun.id);
    assert.equal(stored.latestAnalysisStatus, 'COMPLETED');
    assert.equal(stored.latestAnalysisCreatedAt.toISOString(), newerCreatedAt.toISOString());
    assert.equal(stored.latestWhiteAccuracy, 91);
    assert.equal(stored.latestBlackAccuracy, 84);
  }

  {
    const game = await createGame('equal-timestamp-order');
    const sharedCreatedAt = new Date('2026-07-16T13:00:00.000Z');
    await prisma.gameAnalysisRun.create({
      data: {
        importedGameId: game.id,
        status: 'FAILED',
        positionsTotal: 12,
        positionsDone: 3,
        error: 'lower id',
        createdAt: sharedCreatedAt,
        completedAt: sharedCreatedAt,
      },
    });
    const higherIdRun = await prisma.gameAnalysisRun.create({
      data: {
        importedGameId: game.id,
        status: 'COMPLETED',
        positionsTotal: 12,
        positionsDone: 12,
        createdAt: sharedCreatedAt,
        completedAt: sharedCreatedAt,
      },
    });

    const latest = await getLatestGameAnalysisRunDeterministic(userId, game.id);
    assert.equal(latest?.id, higherIdRun.id, 'equal timestamps use the higher run id');

    const legacyLatest = await getLatestGameAnalysisForImportedGame(userId, game.id);
    assert.equal(
      legacyLatest?.id,
      higherIdRun.id,
      'the imported-game analysis helper uses the same deterministic tie-breaker',
    );
  }

  {
    const game = await createGame('abort-restore');
    const previousRun = await prisma.gameAnalysisRun.create({
      data: {
        importedGameId: game.id,
        status: 'COMPLETED',
        positionsTotal: 10,
        positionsDone: 10,
        whiteAccuracy: 88,
        blackAccuracy: 82,
        createdAt: new Date('2026-07-16T14:00:00.000Z'),
        completedAt: new Date('2026-07-16T14:01:00.000Z'),
      },
    });
    const abortedRun = await prisma.gameAnalysisRun.create({
      data: {
        importedGameId: game.id,
        status: 'FAILED',
        positionsTotal: 10,
        positionsDone: 4,
        error: 'Worker received SIGTERM.',
        createdAt: new Date('2026-07-16T14:02:00.000Z'),
        completedAt: new Date('2026-07-16T14:03:00.000Z'),
      },
    });

    await prisma.importedGame.update({
      where: { id: game.id },
      data: {
        latestAnalysisRunId: abortedRun.id,
        latestAnalysisStatus: abortedRun.status,
        latestAnalysisCreatedAt: abortedRun.createdAt,
        latestAnalysisCompletedAt: abortedRun.completedAt,
      },
    });

    assert.equal(await abandonGameAnalysisRun(abortedRun.id), true);
    assert.equal(
      await prisma.gameAnalysisRun.findUnique({ where: { id: abortedRun.id } }),
      null,
      'controlled abort attempts are removed rather than retained as failures',
    );

    const stored = await prisma.importedGame.findUniqueOrThrow({ where: { id: game.id } });
    assert.equal(stored.latestAnalysisRunId, previousRun.id);
    assert.equal(stored.latestAnalysisStatus, 'COMPLETED');
    assert.equal(stored.latestWhiteAccuracy, 88);
    assert.equal(stored.latestBlackAccuracy, 82);
  }

  {
    const game = await createGame('incomplete-completion');
    await assert.rejects(
      prisma.gameAnalysisRun.create({
        data: {
          importedGameId: game.id,
          status: 'COMPLETED',
          positionsTotal: 10,
          positionsDone: 4,
          createdAt: new Date('2026-07-16T15:00:00.000Z'),
          completedAt: new Date('2026-07-16T15:01:00.000Z'),
        },
      }),
      'PostgreSQL rejects completed runs with incomplete progress',
    );
  }

  console.log('Latest imported-game analysis lifecycle tests passed.');
} finally {
  if (userId) await prisma.appUser.delete({ where: { id: userId } });
  await prisma.$disconnect();
}
