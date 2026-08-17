import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import prismaModule from '../../dist/prisma.js';
import { LifecycleHmacKeyring } from '../../dist/modules/data-lifecycle/data-lifecycle.hmac.js';
import {
  createDeletedIdentityGuard,
  DeletedIdentityBlockedError,
} from '../../dist/modules/data-lifecycle/deleted-identity.guard.js';
import { createDataLifecycleRepository } from '../../dist/modules/data-lifecycle/data-lifecycle.repository.prisma.js';

const prisma = prismaModule.default;
const repository = createDataLifecycleRepository(prisma);
const suffix = randomUUID();
let userId;
let operationId;

function hash(value) {
  return createHash('sha256').update(value).digest('hex');
}

try {
  const provider = `rotation-provider-${suffix}`;
  const externalSubject = `deleted-subject-${suffix}`;
  const user = await prisma.appUser.create({
    data: {
      displayName: 'Deleted identity rotation test',
      authProvider: provider,
      authSubject: externalSubject,
    },
  });
  userId = user.id;

  const operation = await repository.createPreview({
    action: 'DELETE_APP_USER',
    actorUserId: user.id,
    targetUserId: user.id,
    actorKeyVersion: 1,
    actorKeyHash: hash(`actor:${suffix}`),
    targetKeyVersion: 1,
    targetKeyHash: hash(`target:${suffix}`),
    scope: { resourceType: 'USER', userId: user.id },
    previewCounts: {
      accounts: 0,
      games: 0,
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
    confirmationPhrase: 'DELETE TEST USER',
  });
  operationId = operation.id;

  const oldKeyring = new LifecycleHmacKeyring([
    { version: 1, secret: 'deleted-identity-old-key' },
  ]);
  const oldGuard = createDeletedIdentityGuard(prisma, oldKeyring);
  await prisma.$transaction((tx) => oldGuard.createTombstone(tx, {
    provider,
    externalSubject,
    operationId: operation.id,
  }));

  const missingHistoricalKeyGuard = createDeletedIdentityGuard(
    prisma,
    new LifecycleHmacKeyring([{ version: 2, secret: 'deleted-identity-current-key' }]),
  );
  await assert.rejects(
    prisma.$transaction((tx) => missingHistoricalKeyGuard.assertCanProvision(
      tx,
      provider,
      `unrelated-subject-${suffix}`,
    )),
    /unconfigured HMAC key version\(s\): 1/,
  );

  const rotatedGuard = createDeletedIdentityGuard(
    prisma,
    new LifecycleHmacKeyring([
      { version: 2, secret: 'deleted-identity-current-key' },
      { version: 1, secret: 'deleted-identity-old-key' },
    ]),
  );
  await prisma.$transaction((tx) => rotatedGuard.assertCanProvision(
    tx,
    provider,
    `unrelated-subject-${suffix}`,
  ));
  await assert.rejects(
    prisma.$transaction((tx) => rotatedGuard.assertCanProvision(tx, provider, externalSubject)),
    DeletedIdentityBlockedError,
  );

  console.log('Deleted identity keyring rotation tests passed.');
} finally {
  if (operationId) {
    await prisma.deletedAuthIdentityTombstone.deleteMany({ where: { operationId } });
    await prisma.dataLifecycleOperation.deleteMany({ where: { id: operationId } });
  }
  if (userId) await prisma.appUser.deleteMany({ where: { id: userId } });
  await prisma.$disconnect();
}
