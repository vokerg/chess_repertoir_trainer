import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { playerChessProfileResponseSchema } from '@chess-trainer/contracts/player-chess-profile';
import { buildApp } from '../../dist/app.js';
import prismaModule from '../../dist/prisma.js';

const prisma = prismaModule.default;
const suffix = randomUUID();
let accountId = null;

function ratings(userColor, userRating, opponentRating) {
  return userColor === 'WHITE'
    ? { whiteRating: userRating, blackRating: opponentRating }
    : { whiteRating: opponentRating, blackRating: userRating };
}

try {
  const existingDevUser = await prisma.appUser.findUnique({
    where: { authProvider_authSubject: { authProvider: 'dev', authSubject: 'dev-single-user' } },
  });
  const devUser = existingDevUser ?? await prisma.appUser.create({
    data: { displayName: 'Local user', authProvider: 'dev', authSubject: 'dev-single-user' },
  });
  const account = await prisma.externalAccount.create({
    data: { userId: devUser.id, provider: 'LICHESS', username: `profile-${suffix}` },
  });
  accountId = account.id;

  const games = [
    {
      speedCategory: 'blitz',
      userColor: 'WHITE',
      resultForUser: 'WIN',
      openingEco: 'B20',
      openingName: 'Sicilian Defense',
      tagCodes: [103],
      accuracy: 88,
      endedAt: '2026-07-10T12:00:00.000Z',
    },
    {
      speedCategory: 'blitz',
      userColor: 'WHITE',
      resultForUser: 'LOSS',
      openingEco: 'C50',
      openingName: 'Italian Game',
      tagCodes: [102, 104],
      accuracy: 62,
      endedAt: '2026-07-11T12:00:00.000Z',
    },
    {
      speedCategory: 'blitz',
      userColor: 'BLACK',
      resultForUser: 'WIN',
      openingEco: 'D00',
      openingName: "Queen's Pawn Game",
      tagCodes: [174],
      accuracy: 81,
      endedAt: '2026-07-12T12:00:00.000Z',
    },
    {
      speedCategory: 'rapid',
      userColor: 'WHITE',
      resultForUser: 'WIN',
      openingEco: 'C50',
      openingName: 'Italian Game',
      tagCodes: [103],
      accuracy: 86,
      endedAt: '2026-07-13T12:00:00.000Z',
    },
  ];

  for (const [index, game] of games.entries()) {
    await prisma.importedGame.create({
      data: {
        userId: devUser.id,
        accountId: account.id,
        provider: 'LICHESS',
        providerGameId: `player-profile-${index}-${suffix}`,
        rated: true,
        variant: 'standard',
        speedCategory: game.speedCategory,
        userColor: game.userColor,
        resultForUser: game.resultForUser,
        openingEco: game.openingEco,
        openingName: game.openingName,
        endedAt: new Date(game.endedAt),
        plyIndexedAt: new Date(game.endedAt),
        latestAnalysisStatus: 'COMPLETED',
        latestAnalysisCompletedAt: new Date(game.endedAt),
        tagCodes: game.tagCodes,
        ...(game.userColor === 'WHITE'
          ? { latestWhiteAccuracy: game.accuracy }
          : { latestBlackAccuracy: game.accuracy }),
        ...ratings(game.userColor, 1450, 1475),
      },
    });
  }

  const app = await buildApp({ logger: false, authConfig: { mode: 'dev-single-user', userId: devUser.id } });
  try {
    await app.ready();
    const response = await app.inject({
      method: 'GET',
      url: `/api/player-chess-profile?accountIds=${account.id}&from=2026-07-01&to=2026-07-31&speedPreset=BLITZ&colors=WHITE&supportingGamesLimit=1`,
    });
    assert.equal(response.statusCode, 200, response.body);
    const body = playerChessProfileResponseSchema.parse(response.json());
    assert.deepEqual(body.filters.accountIds, [account.id]);
    assert.deepEqual(body.filters.speeds, ['blitz']);
    assert.deepEqual(body.filters.colors, ['WHITE']);
    assert.equal(body.coverage.totalGames, 2);
    assert.equal(body.coverage.indexedGames, 2);
    assert.equal(body.coverage.analysedGames, 2);
    assert.equal(body.baseline.scorePercent, 50);
    assert.equal(body.baseline.openingPositiveRate, 50);
    assert.equal(body.baseline.openingTroubleRate, 50);
    assert.equal(body.baseline.earlyMistakeRate, 50);
    assert.equal(body.openingGroups.length, 2);
    assert.equal(body.supportingGames.length, 1);
    assert.equal(body.openingGroups.every((item) => item.userColor === 'WHITE'), true);

    const invalid = await app.inject({
      method: 'GET',
      url: '/api/player-chess-profile?from=2026-07-31&to=2026-07-01',
    });
    assert.equal(invalid.statusCode, 400);
  } finally {
    await app.close();
  }

  console.log('Player chess profile integration tests passed.');
} finally {
  if (accountId !== null) {
    await prisma.externalAccount.delete({ where: { id: accountId } });
  }
  await prisma.$disconnect();
}
