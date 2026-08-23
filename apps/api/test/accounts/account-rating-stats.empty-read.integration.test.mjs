import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import prismaModule from '../../dist/prisma.js';
import { AccountRatingStatsService } from '../../dist/services/accountRatingStatsService.js';

const prisma = prismaModule.default;
const suffix = randomUUID();
let userId;

try {
  const user = await prisma.appUser.create({
    data: {
      displayName: 'ONB-015 empty rating projection',
      authProvider: 'test',
      authSubject: `onb-015-empty-rating-${suffix}`,
    },
  });
  userId = user.id;
  const account = await prisma.externalAccount.create({
    data: {
      userId: user.id,
      provider: 'LICHESS',
      username: `onb-015-empty-rating-${suffix}`,
    },
  });

  assert.equal(
    await AccountRatingStatsService.getForAccount(user.id, account.id),
    null,
    'a fresh account with no rating-relevant games has no derived rating projection',
  );
  assert.equal(
    await prisma.accountRatingStats.count({ where: { accountId: account.id } }),
    0,
    'reading an empty account must not manufacture derived state',
  );

  const game = await prisma.importedGame.create({
    data: {
      userId: user.id,
      accountId: account.id,
      provider: 'LICHESS',
      providerGameId: `onb-015-empty-rating-game-${suffix}`,
      endedAt: new Date('2026-08-20T09:00:00.000Z'),
      speedCategory: 'blitz',
      variant: 'standard',
      userColor: 'WHITE',
      whiteRating: 1800,
      blackRating: 1750,
    },
  });

  const rebuilt = await AccountRatingStatsService.getForAccount(user.id, account.id);
  assert.equal(rebuilt?.gamesCount, 1, 'rating-relevant evidence still triggers read-through rebuild');
  assert.equal(
    await prisma.accountRatingStats.count({ where: { accountId: account.id } }),
    1,
  );

  await prisma.$transaction([
    prisma.importedGame.delete({ where: { id: game.id } }),
    prisma.accountRatingStats.delete({ where: { accountId: account.id } }),
  ]);

  assert.equal(
    await AccountRatingStatsService.getForAccount(user.id, account.id),
    null,
    'after purge-like removal of games and projection, a read leaves the projection absent',
  );
  assert.equal(
    await prisma.accountRatingStats.count({ where: { accountId: account.id } }),
    0,
  );

  console.log('Account rating empty-read integration tests passed.');
} finally {
  if (userId !== undefined) {
    await prisma.appUser.deleteMany({ where: { id: userId } });
  }
  await prisma.$disconnect();
}
