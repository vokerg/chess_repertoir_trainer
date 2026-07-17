import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import prismaModule from '../../dist/prisma.js';

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
  const game = await prisma.importedGame.create({
    data: {
      userId,
      accountId: account.id,
      provider: 'LICHESS',
      providerGameId: `latest-analysis-${suffix}`,
      endedAt: new Date('2026-07-16T12:00:00.000Z'),
    },
  });

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

  console.log('Latest imported-game analysis snapshot test passed.');
} finally {
  if (userId) await prisma.appUser.delete({ where: { id: userId } });
  await prisma.$disconnect();
}
