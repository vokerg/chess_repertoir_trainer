import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { playerChessProfileResponseSchema } from '@chess-trainer/contracts/player-chess-profile';
import { buildApp } from '../../dist/app.js';
import prismaModule from '../../dist/prisma.js';

const prisma = prismaModule.default;
const suffix = randomUUID();
const accountIds = [];

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
  const primaryAccount = await prisma.externalAccount.create({
    data: { userId: devUser.id, provider: 'LICHESS', username: `profile-primary-${suffix}` },
  });
  const secondaryAccount = await prisma.externalAccount.create({
    data: { userId: devUser.id, provider: 'CHESS_COM', username: `profile-secondary-${suffix}` },
  });
  accountIds.push(primaryAccount.id, secondaryAccount.id);

  const games = [
    {
      accountId: primaryAccount.id,
      provider: 'LICHESS',
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
      accountId: primaryAccount.id,
      provider: 'LICHESS',
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
      accountId: primaryAccount.id,
      provider: 'LICHESS',
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
      accountId: primaryAccount.id,
      provider: 'LICHESS',
      speedCategory: 'rapid',
      userColor: 'WHITE',
      resultForUser: 'WIN',
      openingEco: 'C50',
      openingName: 'Italian Game',
      tagCodes: [103],
      accuracy: 86,
      endedAt: '2026-07-13T12:00:00.000Z',
    },
    {
      accountId: secondaryAccount.id,
      provider: 'CHESS_COM',
      speedCategory: 'blitz',
      userColor: 'WHITE',
      resultForUser: 'WIN',
      openingEco: 'C50',
      openingName: 'Italian Game',
      tagCodes: [103],
      accuracy: 90,
      endedAt: '2026-07-14T12:00:00.000Z',
    },
  ];

  for (const [index, game] of games.entries()) {
    await prisma.importedGame.create({
      data: {
        userId: devUser.id,
        accountId: game.accountId,
        provider: game.provider,
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
      url: `/api/player-chess-profile?accountIds=${primaryAccount.id}&from=2026-07-01&to=2026-07-31&speedPreset=BLITZ&colors=WHITE&supportingGamesLimit=1`,
    });
    assert.equal(response.statusCode, 200, response.body);
    const body = playerChessProfileResponseSchema.parse(response.json());
    assert.deepEqual(body.filters.accountIds, [primaryAccount.id]);
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

    const multiAccountResponse = await app.inject({
      method: 'GET',
      url: `/api/player-chess-profile?accountIds=${secondaryAccount.id},${primaryAccount.id}&from=2026-07-01&to=2026-07-31&speedPreset=BLITZ&colors=WHITE`,
    });
    assert.equal(multiAccountResponse.statusCode, 200, multiAccountResponse.body);
    const multiAccountBody = playerChessProfileResponseSchema.parse(multiAccountResponse.json());
    assert.deepEqual(multiAccountBody.filters.accountIds, [primaryAccount.id, secondaryAccount.id]);
    assert.equal(multiAccountBody.coverage.totalGames, 3);
    assert.deepEqual(multiAccountBody.baseline.wdl, { wins: 2, draws: 0, losses: 1 });
    assert.equal(multiAccountBody.baseline.scorePercent, 66.7);

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
  for (const accountId of accountIds.reverse()) {
    await prisma.externalAccount.delete({ where: { id: accountId } });
  }
  await prisma.$disconnect();
}
