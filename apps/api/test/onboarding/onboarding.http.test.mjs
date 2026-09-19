import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { onboardingReadinessResponseSchema } from '@chess-trainer/contracts/onboarding';
import { buildApp } from '../../dist/app.js';
import prismaModule from '../../dist/prisma.js';

const prisma = prismaModule.default;
const suffix = randomUUID();
const primaryScopeHash = createHash('sha256').update(`primary:${suffix}`).digest('hex');
const secondaryScopeHash = createHash('sha256').update(`secondary:${suffix}`).digest('hex');
let user = null;
let createdDevUser = false;
let originalDisposition = null;
let otherUser = null;
let preparation = null;
const accountIds = [];

try {
  const existingDevUser = await prisma.appUser.findUnique({
    where: {
      authProvider_authSubject: {
        authProvider: 'dev',
        authSubject: 'dev-single-user',
      },
    },
  });
  if (existingDevUser) {
    user = existingDevUser;
    originalDisposition = {
      onboardingDisposition: existingDevUser.onboardingDisposition,
      onboardingDispositionReason: existingDevUser.onboardingDispositionReason,
      onboardingDispositionAt: existingDevUser.onboardingDispositionAt,
    };
    user = await prisma.appUser.update({
      where: { id: user.id },
      data: {
        onboardingDisposition: 'PENDING',
        onboardingDispositionReason: null,
        onboardingDispositionAt: null,
      },
    });
  } else {
    user = await prisma.appUser.create({
      data: {
        displayName: 'Local user',
        authProvider: 'dev',
        authSubject: 'dev-single-user',
      },
    });
    createdDevUser = true;
  }
  otherUser = await prisma.appUser.create({
    data: {
      displayName: 'Other onboarding test',
      authProvider: 'test',
      authSubject: `onboarding-other-${suffix}`,
    },
  });
  assert.equal(user.onboardingDisposition, 'PENDING');

  const account = await prisma.externalAccount.create({
    data: { userId: user.id, provider: 'lichess', username: `onboarding-${suffix}` },
  });
  accountIds.push(account.id);
  const secondAccount = await prisma.externalAccount.create({
    data: { userId: user.id, provider: 'chess.com', username: `onboarding-second-${suffix}` },
  });
  accountIds.push(secondAccount.id);
  const otherAccount = await prisma.externalAccount.create({
    data: { userId: otherUser.id, provider: 'lichess', username: `other-${suffix}` },
  });
  const now = new Date('2026-08-20T07:30:00.000Z');
  const requestedFrom = new Date('2026-05-20T00:00:00.000Z');
  const requestedTo = new Date('2026-08-21T00:00:00.000Z');
  const importRun = await prisma.importRun.create({
    data: {
      userId: user.id,
      accountId: account.id,
      provider: 'lichess',
      mode: 'BOUNDED_INITIAL',
      source: 'ONBOARDING',
      status: 'RUNNING',
      scopeVersion: 1,
      scopeHash: primaryScopeHash,
      scopeJson: { rated: 'ANY', speedCategories: [], variants: [] },
      requestedFrom,
      requestedTo,
      windowsTotal: 4,
      windowsCompleted: 2,
    },
  });
  const secondImportRun = await prisma.importRun.create({
    data: {
      userId: user.id,
      accountId: secondAccount.id,
      provider: 'chess.com',
      mode: 'BOUNDED_INITIAL',
      source: 'ONBOARDING',
      status: 'RUNNING',
      scopeVersion: 1,
      scopeHash: secondaryScopeHash,
      scopeJson: { rated: 'ANY', speedCategories: [], variants: [] },
      requestedFrom,
      requestedTo,
      windowsTotal: 2,
      windowsCompleted: 1,
    },
  });
  preparation = await prisma.dataPreparationRun.create({
    data: {
      userId: user.id,
      purpose: 'ONBOARDING',
      status: 'RUNNING',
      recipeVersion: 1,
      recipeJson: {},
      firstImportedAt: now,
      targets: {
        create: [{
          accountId: account.id,
          accountProvider: 'lichess',
          accountUsername: account.username,
          ordinal: 0,
          scopeVersion: 1,
          scopeHash: primaryScopeHash,
          scopeJson: { rated: 'ANY', speedCategories: [], variants: [] },
          requestedFrom,
          requestedTo,
          currentImportRunId: importRun.id,
          firstImportedAt: now,
        }, {
          accountId: secondAccount.id,
          accountProvider: 'chess.com',
          accountUsername: secondAccount.username,
          ordinal: 1,
          scopeVersion: 1,
          scopeHash: secondaryScopeHash,
          scopeJson: { rated: 'ANY', speedCategories: [], variants: [] },
          requestedFrom,
          requestedTo,
          currentImportRunId: secondImportRun.id,
          firstImportedAt: now,
        }],
      },
    },
    include: { targets: { orderBy: { ordinal: 'asc' } } },
  });
  await prisma.importedGame.create({
    data: {
      userId: user.id,
      accountId: account.id,
      provider: 'lichess',
      providerGameId: `game-${suffix}`,
      pgn: '1. e4 e5',
      rated: true,
      variant: 'standard',
      speedCategory: 'rapid',
      endedAt: now,
      openingName: 'King Pawn Game',
      openingEco: 'C20',
      plyIndexedAt: now,
    },
  });
  await prisma.importedGame.create({
    data: {
      userId: user.id,
      accountId: secondAccount.id,
      provider: 'chess.com',
      providerGameId: `second-game-${suffix}`,
      pgn: '1. d4 d5',
      rated: true,
      variant: 'standard',
      speedCategory: 'blitz',
      endedAt: now,
    },
  });
  await prisma.importedGame.create({
    data: {
      userId: otherUser.id,
      accountId: otherAccount.id,
      provider: 'lichess',
      providerGameId: `other-game-${suffix}`,
      pgn: '1. c4 e5',
      endedAt: now,
      plyIndexedAt: now,
    },
  });
  await prisma.dataPreparationBatch.create({
    data: {
      preparationRunId: preparation.id,
      targetId: preparation.targets[0].id,
      stage: 'INDEX',
      lane: 'FIRST_INDEX',
      ordinal: 0,
      status: 'RUNNING',
      plannedLimit: 50,
      totalTasks: 2,
      completedTasks: 1,
    },
  });

  const app = await buildApp({
    logger: false,
    authConfig: { mode: 'dev-single-user', userId: user.id },
    prisma: { $disconnect: async () => {} },
  });
  try {
    await app.ready();
    const response = await app.inject({ method: 'GET', url: '/api/me/onboarding' });
    assert.equal(response.statusCode, 200, response.body);
    const body = onboardingReadinessResponseSchema.parse(response.json());
    assert.equal(body.disposition.value, 'PENDING');
    assert.equal(body.presentationState, 'PREPARING');
    assert.equal(body.preparation.targetsTotal, 2);
    assert.equal(body.preparation.targets.length, 2);
    assert.equal(body.preparation.providerWindows.completed, 3);
    assert.equal(body.preparation.providerWindows.total, 6);
    assert.equal(body.preparation.providerWindows.percentage, 50);
    assert.equal(body.preparation.games.committed, 2);
    assert.equal(body.preparation.games.indexed, 1);
    assert.equal(body.preparation.games.indexPending, 1);
    assert.equal(body.preparation.latestBatches[0].selected, 2);
    assert.equal(body.preparation.latestBatches[0].remaining, 1);
    assert.equal(body.preparation.latestBatches[0].percentage, 50);
    assert.equal(body.readiness.find((item) => item.feature === 'games').state, 'ready');
    assert.equal(body.readiness.find((item) => item.feature === 'openings').state, 'ready');
    assert.deepEqual(body.actions.map((action) => action.code), [
      'VIEW_ONBOARDING',
      'PAUSE_PREPARATION',
      'CANCEL_PREPARATION',
      'SKIP_ONBOARDING',
    ]);
    assert.equal(body.reveals.length >= 1, true);
    assert.equal(
      body.reveals.some(
        (reveal) => reveal.importedGameId && reveal.destination.includes(String(reveal.importedGameId)),
      ),
      true,
    );

    await prisma.appUser.update({
      where: { id: user.id },
      data: {
        onboardingDisposition: 'SKIPPED',
        onboardingDispositionReason: 'USER_SKIPPED',
        onboardingDispositionAt: now,
      },
    });
    const skippedResponse = await app.inject({ method: 'GET', url: '/api/me/onboarding' });
    assert.equal(skippedResponse.statusCode, 200, skippedResponse.body);
    const skippedBody = onboardingReadinessResponseSchema.parse(skippedResponse.json());
    assert.equal(skippedBody.presentationState, 'SKIPPED');
    assert.equal(skippedBody.preparation.status, 'RUNNING');
    assert.deepEqual(skippedBody.actions.map((action) => action.code), [
      'VIEW_HOME',
      'VIEW_ONBOARDING',
      'PAUSE_PREPARATION',
      'CANCEL_PREPARATION',
    ]);
    assert.equal(skippedBody.actions.some((action) => action.code === 'START_ONBOARDING'), false);

    await prisma.dataPreparationRun.update({
      where: { id: preparation.id },
      data: { coreReadyAt: new Date('2026-08-20T07:31:00.000Z') },
    });
    const completedUser = await prisma.appUser.findUniqueOrThrow({ where: { id: user.id } });
    assert.equal(completedUser.onboardingDisposition, 'COMPLETED');
    assert.equal(completedUser.onboardingDispositionReason, 'CORE_READY');

    const coreReadyResponse = await app.inject({ method: 'GET', url: '/api/me/onboarding' });
    assert.equal(coreReadyResponse.statusCode, 200, coreReadyResponse.body);
    const coreReadyBody = onboardingReadinessResponseSchema.parse(coreReadyResponse.json());
    assert.equal(coreReadyBody.disposition.value, 'COMPLETED');
    assert.equal(coreReadyBody.presentationState, 'CORE_READY');
  } finally {
    await app.close();
  }

  console.log('Onboarding readiness HTTP tests passed.');
} finally {
  if (preparation) {
    await prisma.dataPreparationRun.deleteMany({ where: { id: preparation.id } });
  }
  if (accountIds.length > 0) {
    await prisma.externalAccount.deleteMany({ where: { id: { in: accountIds } } });
  }
  if (otherUser) await prisma.appUser.delete({ where: { id: otherUser.id } });
  if (user) {
    if (createdDevUser) {
      await prisma.appUser.delete({ where: { id: user.id } });
    } else if (originalDisposition) {
      await prisma.appUser.update({
        where: { id: user.id },
        data: originalDisposition,
      });
    }
  }
  await prisma.$disconnect();
}
