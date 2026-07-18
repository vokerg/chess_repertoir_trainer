import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import prismaModule from '../../dist/prisma.js';
import {
  clearImportedGamePlyAnalysis,
  getLatestGameAnalysisForImportedGame,
} from '../../dist/modules/analysis/analysis.repository.prisma.js';
import {
  createImportedGameAnalysisExecutionService,
} from '../../dist/modules/analysis/imported-game-analysis-execution.service.js';
import {
  abandonGameAnalysisRun,
  getImportedGameAnalysisExecutionState,
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
    const game = await createGame('clear-then-analyse');
    const position = await prisma.position.create({
      data: {
        positionKey: Buffer.from(randomUUID().replaceAll('-', ''), 'hex'),
        normalizedFen: '8/8/8/8/8/8/8/K6k w - -',
      },
    });
    await prisma.importedGamePly.createMany({
      data: [
        {
          importedGameId: game.id,
          positionId: position.id,
          plyNumber: 1,
          moveUci: 'a1a2',
          scoreLossCp: 12,
          classificationCode: 2,
        },
        {
          importedGameId: game.id,
          positionId: position.id,
          plyNumber: 2,
          moveUci: 'h1h2',
          scoreLossCp: 8,
          classificationCode: 2,
        },
      ],
    });
    const completedRun = await prisma.gameAnalysisRun.create({
      data: {
        importedGameId: game.id,
        status: 'COMPLETED',
        positionsTotal: 2,
        positionsDone: 2,
        createdAt: new Date('2026-07-16T14:30:00.000Z'),
        completedAt: new Date('2026-07-16T14:31:00.000Z'),
      },
    });
    await prisma.importedGame.update({
      where: { id: game.id },
      data: {
        latestAnalysisRunId: completedRun.id,
        latestAnalysisStatus: 'COMPLETED',
        latestAnalysisCreatedAt: completedRun.createdAt,
        latestAnalysisCompletedAt: completedRun.completedAt,
      },
    });

    await clearImportedGamePlyAnalysis(userId, game.id);
    let analyseCalls = 0;
    const execution = createImportedGameAnalysisExecutionService({
      analyseOne: async () => {
        analyseCalls += 1;
        return 'COMPLETED';
      },
      refreshTags: async () => {},
      getExecutionState: getImportedGameAnalysisExecutionState,
      findAbortCleanupCandidate: async () => null,
      abandonRun: async () => true,
    });
    assert.equal(await execution.analyseOne({}, userId, game.id, {
      depth: 12,
      multipv: 1,
      force: false,
      refreshTagsAfterAnalysis: false,
    }), 'COMPLETED');
    assert.equal(analyseCalls, 1, 'cleared ply fields force analysis despite a complete latest run');
  }

  {
    const game = await createGame('migration-result-cleanup');
    const failedRun = await prisma.gameAnalysisRun.create({
      data: {
        importedGameId: game.id,
        status: 'FAILED',
        positionsTotal: 10,
        positionsDone: 4,
        summary: { totalMoves: 10 },
        accuracyVersion: 'v1',
        whiteAccuracy: 73,
        blackAccuracy: 69,
        whiteAverageCentipawnLoss: 42,
        blackAverageCentipawnLoss: 51,
        whiteMovesAnalyzed: 2,
        blackMovesAnalyzed: 2,
        error: 'Analysis run completed with incomplete progress.',
        completedAt: new Date('2026-07-16T14:40:00.000Z'),
      },
    });
    await prisma.importedGame.update({
      where: { id: game.id },
      data: {
        latestAnalysisRunId: failedRun.id,
        latestAnalysisStatus: 'FAILED',
        latestAnalysisCreatedAt: failedRun.createdAt,
        latestAnalysisCompletedAt: failedRun.completedAt,
        latestWhiteAccuracy: 73,
        latestBlackAccuracy: 69,
      },
    });

    const migration = await readFile(
      'prisma/migrations/20260718110000_preserve_cancelled_claim_fence/migration.sql',
      'utf8',
    );
    for (const statement of sqlStatements(migration).filter((sql) => sql.startsWith('UPDATE'))) {
      await prisma.$executeRawUnsafe(statement);
    }

    const storedRun = await prisma.gameAnalysisRun.findUniqueOrThrow({ where: { id: failedRun.id } });
    assert.equal(storedRun.summary, null);
    assert.equal(storedRun.accuracyVersion, null);
    assert.equal(storedRun.whiteAccuracy, null);
    assert.equal(storedRun.blackAccuracy, null);
    assert.equal(storedRun.whiteAverageCentipawnLoss, null);
    assert.equal(storedRun.blackAverageCentipawnLoss, null);
    assert.equal(storedRun.whiteMovesAnalyzed, 0);
    assert.equal(storedRun.blackMovesAnalyzed, 0);
    const storedGame = await prisma.importedGame.findUniqueOrThrow({ where: { id: game.id } });
    assert.equal(storedGame.latestAnalysisStatus, 'FAILED');
    assert.equal(storedGame.latestWhiteAccuracy, null);
    assert.equal(storedGame.latestBlackAccuracy, null);
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

function sqlStatements(sql) {
  return sql
    .split(';')
    .map((statement) => statement.replace(/^--.*$/gm, '').trim())
    .filter(Boolean);
}
