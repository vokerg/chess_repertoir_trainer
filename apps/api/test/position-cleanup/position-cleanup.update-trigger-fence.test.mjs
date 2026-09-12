import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import prismaModule from '../../dist/prisma.js';

const prisma = prismaModule.default;
const blockerClient = new PrismaClient();
const writerClient = new PrismaClient();
const suffix = randomUUID();
let userId;
let positionId;
let releaseBlocker;
let blockerPromise;

try {
  await prisma.$executeRaw`DELETE FROM "PositionCleanupRun"`;
  await prisma.$executeRaw`DELETE FROM "PositionCleanupCandidate"`;

  const user = await prisma.appUser.create({
    data: {
      displayName: `Position cleanup update fence ${suffix}`,
      authProvider: 'position-cleanup-update-fence-test',
      authSubject: suffix,
    },
  });
  userId = user.id;
  const account = await prisma.externalAccount.create({
    data: {
      userId: user.id,
      provider: 'TEST',
      username: `position-cleanup-update-fence-${suffix}`,
    },
  });
  const game = await prisma.importedGame.create({
    data: {
      userId: user.id,
      accountId: account.id,
      provider: 'TEST',
      providerGameId: `position-cleanup-update-fence-${suffix}`,
      pgn: '1. e4',
    },
  });
  const position = await prisma.position.create({
    data: {
      positionKey: Buffer.from(randomUUID().replaceAll('-', ''), 'hex'),
      normalizedFen: `position-cleanup-update-fence-${suffix}`,
    },
  });
  positionId = position.id;
  await prisma.importedGamePly.create({
    data: {
      importedGameId: game.id,
      positionId: position.id,
      plyNumber: 1,
      moveUci: 'e2e4',
    },
  });

  let markBlockerReady;
  const blockerReady = new Promise((resolve) => { markBlockerReady = resolve; });
  const blockerRelease = new Promise((resolve) => { releaseBlocker = resolve; });
  blockerPromise = blockerClient.$transaction(async (transaction) => {
    await transaction.$queryRaw`
      SELECT "position_cleanup_lock_reference_ids"(
        ARRAY[${position.id}]::integer[]
      ) AS "lockedCount"
    `;
    markBlockerReady();
    await blockerRelease;
  });
  await blockerReady;

  // With no candidate, an analysis-only update retaining the same position
  // must not enter the cleanup advisory-lock path.
  await writerClient.$transaction(async (transaction) => {
    await transaction.$executeRawUnsafe("SET LOCAL lock_timeout = '150ms'");
    await transaction.importedGamePly.update({
      where: {
        importedGameId_plyNumber: {
          importedGameId: game.id,
          plyNumber: 1,
        },
      },
      data: { scoreLossCp: 12 },
    });
  });

  await prisma.$executeRaw`
    INSERT INTO "PositionCleanupCandidate" (
      "positionId", "firstObservedOrphanAt", "lastObservedOrphanAt"
    ) VALUES (
      ${position.id}, NOW() - INTERVAL '31 days', NOW() - INTERVAL '31 days'
    )
  `;

  // A retained reference with a stale candidate is intentionally different:
  // it must take the observer fence before deleting the candidate.
  await assert.rejects(
    writerClient.$transaction(async (transaction) => {
      await transaction.$executeRawUnsafe("SET LOCAL lock_timeout = '150ms'");
      await transaction.importedGamePly.update({
        where: {
          importedGameId_plyNumber: {
            importedGameId: game.id,
            plyNumber: 1,
          },
        },
        data: { classificationCode: 1 },
      });
    }),
    /lock timeout|55P03|canceling statement due to lock timeout|Raw query failed/i,
  );
  assert.equal(
    await prisma.positionCleanupCandidate.count({ where: { positionId: position.id } }),
    1,
    'failed fenced update must roll back without resetting the candidate',
  );

  releaseBlocker();
  await blockerPromise;
  blockerPromise = undefined;

  await writerClient.importedGamePly.update({
    where: {
      importedGameId_plyNumber: {
        importedGameId: game.id,
        plyNumber: 1,
      },
    },
    data: { classificationCode: 1 },
  });
  assert.equal(
    await prisma.positionCleanupCandidate.count({ where: { positionId: position.id } }),
    0,
    'retained-reference update must reset a stale candidate after acquiring the fence',
  );

  console.log('Position cleanup update trigger fence tests passed.');
} finally {
  releaseBlocker?.();
  if (blockerPromise) await blockerPromise.catch(() => {});
  await prisma.$executeRaw`DELETE FROM "PositionCleanupRun"`.catch(() => {});
  await prisma.$executeRaw`DELETE FROM "PositionCleanupCandidate"`.catch(() => {});
  if (userId) await prisma.appUser.delete({ where: { id: userId } }).catch(() => {});
  if (positionId) await prisma.position.delete({ where: { id: positionId } }).catch(() => {});
  await blockerClient.$disconnect();
  await writerClient.$disconnect();
}
