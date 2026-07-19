import assert from 'node:assert/strict';
import prismaModule from '../../dist/prisma.js';
import {
  findStoredGameReview,
  upsertStoredGameReview,
} from '../../dist/modules/ai/game-review/game-review.repository.prisma.js';

const prisma = prismaModule.default;
const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const userIds = [];

try {
  const userA = await prisma.appUser.create({
    data: { authProvider: 'test', authSubject: `ai-review-a-${suffix}` },
  });
  const userB = await prisma.appUser.create({
    data: { authProvider: 'test', authSubject: `ai-review-b-${suffix}` },
  });
  userIds.push(userA.id, userB.id);

  const account = await prisma.externalAccount.create({
    data: {
      userId: userA.id,
      provider: 'LICHESS',
      username: `ai-review-account-${suffix}`,
    },
  });
  const game = await prisma.importedGame.create({
    data: {
      userId: userA.id,
      accountId: account.id,
      provider: 'LICHESS',
      providerGameId: `ai-review-game-${suffix}`,
    },
  });
  const run = await prisma.gameAnalysisRun.create({
    data: {
      importedGameId: game.id,
      status: 'COMPLETED',
      completedAt: new Date('2026-07-19T14:00:00.000Z'),
    },
  });

  const first = review('First saved review', '2026-07-19T14:01:00.000Z');
  await upsertStoredGameReview({
    userId: userA.id,
    importedGameId: game.id,
    analysisRunId: run.id,
    inputHash: 'a'.repeat(64),
    schemaVersion: 1,
    promptVersion: 1,
    provider: 'openai-compatible',
    model: 'deepseek-v4-flash',
    content: first,
    generatedAt: new Date(first.generatedAt),
  });

  assert.deepEqual((await findStoredGameReview(userA.id, game.id))?.content, first);
  assert.equal(await findStoredGameReview(userB.id, game.id), null, 'another user cannot read the review');

  const second = review('Replacement review', '2026-07-19T14:02:00.000Z');
  await upsertStoredGameReview({
    userId: userA.id,
    importedGameId: game.id,
    analysisRunId: run.id,
    inputHash: 'b'.repeat(64),
    schemaVersion: 1,
    promptVersion: 1,
    provider: 'openai-compatible',
    model: 'deepseek-v4-flash',
    content: second,
    generatedAt: new Date(second.generatedAt),
  });

  assert.deepEqual((await findStoredGameReview(userA.id, game.id))?.content, second);
  assert.equal(
    await prisma.importedGameAiReview.count({ where: { importedGameId: game.id } }),
    1,
    'regeneration replaces the current artifact instead of adding hidden history',
  );

  console.log('AI game review persistence tests passed.');
} finally {
  if (userIds.length) await prisma.appUser.deleteMany({ where: { id: { in: userIds } } });
  await prisma.$disconnect();
}

function review(headline, generatedAt) {
  return {
    kind: 'GAME_REVIEW',
    schemaVersion: 1,
    generatedAt,
    review: {
      headline,
      overview: 'Overview',
      openingAssessment: 'Opening assessment',
      turningPoints: [],
      strengths: [],
      improvements: [],
      practicePriorities: [],
      themes: [],
    },
    warnings: [],
  };
}
