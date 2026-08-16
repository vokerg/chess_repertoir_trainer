import { createHash, randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import prismaModule from '../../dist/prisma.js';
import { createDataLifecycleRepository } from '../../dist/modules/data-lifecycle/data-lifecycle.repository.prisma.js';
import { hashOpaqueLifecycleToken } from '../../dist/modules/data-lifecycle/data-lifecycle.hmac.js';

const prisma = prismaModule.default;
const repository = createDataLifecycleRepository(prisma);
const suffix = randomUUID();
let userId;
let operationId;
let diagnosticClient;

function hash(value) {
  return createHash('sha256').update(value).digest('hex');
}

try {
  const user = await prisma.appUser.create({
    data: {
      displayName: 'Lifecycle game start diagnostic',
      authProvider: 'lifecycle-game-start-diagnostic',
      authSubject: suffix,
    },
  });
  userId = user.id;
  const account = await prisma.externalAccount.create({
    data: {
      userId: user.id,
      provider: 'TEST',
      username: `game-start-diagnostic-${suffix}`,
    },
  });
  const game = await prisma.importedGame.create({
    data: {
      userId: user.id,
      accountId: account.id,
      provider: 'TEST',
      providerGameId: `game-start-diagnostic-${suffix}`,
      pgn: '1. e4 e5',
    },
  });

  const preview = await repository.createPreview({
    action: 'UNANALYSE_GAMES',
    actorUserId: user.id,
    targetUserId: user.id,
    actorKeyVersion: 1,
    actorKeyHash: hash(`actor:${suffix}`),
    targetKeyVersion: 1,
    targetKeyHash: hash(`target:${suffix}`),
    scope: {
      resourceType: 'GAME',
      userId: user.id,
      accountId: account.id,
      gameIds: [game.id],
    },
    previewCounts: {
      accounts: 1,
      games: 1,
      plies: 0,
      analysisRuns: 0,
      aiReviews: 0,
      tacticalDetections: 0,
      scenarioSessions: 0,
      importRuns: 0,
      jobRuns: 0,
      preparationRuns: 0,
    },
    previewHash: hash(`preview:${suffix}`),
    previewTokenHash: hash(`token:${suffix}`),
    previewExpiresAt: new Date(Date.now() + 60_000),
    confirmationPhrase: 'DIAGNOSTIC',
  });
  operationId = preview.id;

  diagnosticClient = new PrismaClient();
  const timer = setTimeout(async () => {
    try {
      const waits = await diagnosticClient.$queryRawUnsafe(`
        SELECT
          pid,
          state,
          wait_event_type AS "waitEventType",
          wait_event AS "waitEvent",
          query,
          pg_blocking_pids(pid) AS "blockingPids"
        FROM pg_stat_activity
        WHERE datname = current_database()
          AND pid <> pg_backend_pid()
          AND state <> 'idle'
        ORDER BY pid
      `);
      console.log('DATA_LIFECYCLE_GAME_START_DIAGNOSTIC', JSON.stringify(waits));
    } catch (error) {
      console.log('DATA_LIFECYCLE_GAME_START_DIAGNOSTIC_FAILED', error);
    }
  }, 750);

  try {
    await repository.startExecution({
      operationId: preview.id,
      targetUserId: user.id,
      previewTokenHash: hash(`token:${suffix}`),
      previewHash: hash(`preview:${suffix}`),
      idempotencyKeyHash: hash(`idempotency:${suffix}`),
      receiptTokenHash: hashOpaqueLifecycleToken('fence-receipt'),
      receiptExpiresAt: new Date(Date.now() + 60_000),
    });
  } finally {
    clearTimeout(timer);
  }

  console.log('Data lifecycle GAME start diagnostic passed.');
} finally {
  if (operationId) {
    await prisma.dataLifecycleOperation.deleteMany({ where: { id: operationId } });
  }
  if (userId) {
    await prisma.appUser.deleteMany({ where: { id: userId } });
  }
  if (diagnosticClient) await diagnosticClient.$disconnect();
  await prisma.$disconnect();
}
