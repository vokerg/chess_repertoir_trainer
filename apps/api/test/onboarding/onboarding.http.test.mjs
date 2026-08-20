import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { onboardingReadinessResponseSchema } from '@chess-trainer/contracts/onboarding';
import { buildApp } from '../../dist/app.js';
import prismaModule from '../../dist/prisma.js';

const prisma = prismaModule.default;
const suffix = randomUUID();
let user = null;
let otherUser = null;

try {
  user = await prisma.appUser.create({ data: { displayName: 'Onboarding test', authProvider: 'test', authSubject: `onboarding-${suffix}` } });
  otherUser = await prisma.appUser.create({ data: { displayName: 'Other onboarding test', authProvider: 'test', authSubject: `onboarding-other-${suffix}` } });
  assert.equal(user.onboardingDisposition, 'PENDING');

  const account = await prisma.externalAccount.create({ data: { userId: user.id, provider: 'lichess', username: `onboarding-${suffix}` } });
  const otherAccount = await prisma.externalAccount.create({ data: { userId: otherUser.id, provider: 'lichess', username: `other-${suffix}` } });
  const now = new Date('2026-08-20T07:30:00.000Z');
  const requestedFrom = new Date('2026-05-20T00:00:00.000Z');
  const requestedTo = new Date('2026-08-21T00:00:00.000Z');
  const importRun = await prisma.importRun.create({
    data: {
      userId: user.id, accountId: account.id, provider: 'lichess', mode: 'BOUNDED_INITIAL', source: 'ONBOARDING', status: 'RUNNING',
      scopeVersion: 1, scopeHash: `scope-${suffix}`.slice(0, 64), scopeJson: { rated: 'ANY', speedCategories: [], variants: [] },
      requestedFrom, requestedTo, windowsTotal: 4, windowsCompleted: 2,
    },
  });
  const preparation = await prisma.dataPreparationRun.create({
    data: {
      userId: user.id, purpose: 'ONBOARDING', status: 'RUNNING', recipeVersion: 1, recipeJson: {},
      firstImportedAt: now,
      targets: { create: [{
        accountId: account.id, accountProvider: 'lichess', accountUsername: account.username, ordinal: 0,
        scopeVersion: 1, scopeHash: `scope-${suffix}`.slice(0, 64), scopeJson: { rated: 'ANY', speedCategories: [], variants: [] },
        requestedFrom, requestedTo, currentImportRunId: importRun.id, firstImportedAt: now,
      }] },
    },
    include: { targets: true },
  });
  await prisma.importedGame.create({
    data: {
      userId: user.id, accountId: account.id, provider: 'lichess', providerGameId: `game-${suffix}`,
      pgn: '1. e4 e5', rated: true, variant: 'standard', speedCategory: 'rapid', endedAt: now,
      openingName: 'King Pawn Game', openingEco: 'C20', plyIndexedAt: now,
    },
  });
  await prisma.importedGame.create({
    data: {
      userId: otherUser.id, accountId: otherAccount.id, provider: 'lichess', providerGameId: `other-game-${suffix}`,
      pgn: '1. d4 d5', endedAt: now, plyIndexedAt: now,
    },
  });
  await prisma.dataPreparationBatch.create({
    data: {
      preparationRunId: preparation.id, targetId: preparation.targets[0].id, stage: 'INDEX', lane: 'FIRST_INDEX', ordinal: 0,
      status: 'RUNNING', plannedLimit: 50, totalTasks: 2, completedTasks: 1,
    },
  });

  const app = await buildApp({ logger: false, authConfig: { mode: 'dev-single-user', userId: user.id } });
  try {
    await app.ready();
    const response = await app.inject({ method: 'GET', url: '/api/me/onboarding' });
    assert.equal(response.statusCode, 200, response.body);
    const body = onboardingReadinessResponseSchema.parse(response.json());
    assert.equal(body.disposition.value, 'PENDING');
    assert.equal(body.presentationState, 'PREPARING');
    assert.equal(body.preparation.providerWindows.percentage, 50);
    assert.equal(body.preparation.games.committed, 1);
    assert.equal(body.preparation.games.indexed, 1);
    assert.equal(body.preparation.latestBatches[0].selected, 2);
    assert.equal(body.preparation.latestBatches[0].remaining, 1);
    assert.equal(body.preparation.latestBatches[0].percentage, 50);
    assert.equal(body.readiness.find((item) => item.feature === 'games').state, 'ready');
    assert.equal(body.readiness.find((item) => item.feature === 'openings').state, 'ready');
    assert.equal(body.reveals.length >= 1, true);
    assert.equal(body.reveals.some((reveal) => reveal.importedGameId && reveal.destination.includes(String(reveal.importedGameId))), true);

    await prisma.appUser.update({
      where: { id: user.id },
      data: {
        onboardingDisposition: 'SKIPPED',
        onboardingDispositionReason: 'USER_SKIPPED',
        onboardingDispositionAt: now,
      },
    });
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
  if (user) await prisma.appUser.delete({ where: { id: user.id } });
  if (otherUser) await prisma.appUser.delete({ where: { id: otherUser.id } });
  await prisma.$disconnect();
}
