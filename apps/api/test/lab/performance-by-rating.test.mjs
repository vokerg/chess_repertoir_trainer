import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { buildApp } from '../../dist/app.js';
import prismaModule from '../../dist/prisma.js';
import { resolvePerformanceByRatingRange } from '../../dist/modules/lab/performance-by-rating/performance-by-rating.service.js';

const prisma = prismaModule.default;
const suffix = randomUUID();
const accountIds = [];

assert.deepEqual(
  resolvePerformanceByRatingRange({}, new Date('2026-07-14T16:00:00.000Z')),
  {
    from: '2026-04-14',
    to: '2026-07-14',
    fromDate: new Date('2026-04-14T00:00:00.000Z'),
    toExclusive: new Date('2026-07-15T00:00:00.000Z'),
  },
);

function opponentRatings(userColor, userRating, opponentRating) {
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

  const lichessAccount = await prisma.externalAccount.create({
    data: { userId: devUser.id, provider: 'LICHESS', username: `performance-lichess-${suffix}` },
  });
  const chessComAccount = await prisma.externalAccount.create({
    data: { userId: devUser.id, provider: 'CHESS_COM', username: `performance-chess-com-${suffix}` },
  });
  accountIds.push(lichessAccount.id, chessComAccount.id);

  const games = [
    {
      accountId: lichessAccount.id,
      provider: 'LICHESS',
      speedCategory: 'blitz',
      userColor: 'WHITE',
      resultForUser: 'WIN',
      opponentRating: 1299,
      tagCodes: [103, 174],
      latestWhiteAccuracy: 91,
      endedAt: '2026-07-01T12:00:00.000Z',
    },
    {
      accountId: lichessAccount.id,
      provider: 'LICHESS',
      speedCategory: 'blitz',
      userColor: 'BLACK',
      resultForUser: 'LOSS',
      opponentRating: 1300,
      tagCodes: [120, 140, 172, 173],
      latestBlackAccuracy: 70,
      endedAt: '2026-07-02T12:00:00.000Z',
    },
    {
      accountId: lichessAccount.id,
      provider: 'LICHESS',
      speedCategory: 'rapid',
      userColor: 'BLACK',
      resultForUser: 'WIN',
      opponentRating: 1190,
      tagCodes: [136, 141, 170, 171],
      latestBlackAccuracy: 80,
      endedAt: '2026-07-03T12:00:00.000Z',
    },
    {
      accountId: chessComAccount.id,
      provider: 'CHESS_COM',
      speedCategory: 'blitz',
      userColor: 'WHITE',
      resultForUser: 'DRAW',
      opponentRating: 1299,
      tagCodes: [102, 126],
      latestWhiteAccuracy: 75,
      endedAt: '2026-07-04T12:00:00.000Z',
    },
    {
      accountId: chessComAccount.id,
      provider: 'CHESS_COM',
      speedCategory: 'rapid',
      userColor: 'WHITE',
      resultForUser: 'WIN',
      opponentRating: 1500,
      tagCodes: [],
      endedAt: '2026-07-14T23:59:59.000Z',
    },
    {
      accountId: chessComAccount.id,
      provider: 'CHESS_COM',
      speedCategory: 'rapid',
      userColor: 'WHITE',
      resultForUser: 'LOSS',
      opponentRating: 1500,
      tagCodes: [],
      endedAt: '2026-07-15T00:00:00.000Z',
    },
    {
      accountId: lichessAccount.id,
      provider: 'LICHESS',
      speedCategory: 'blitz',
      userColor: 'WHITE',
      resultForUser: 'WIN',
      opponentRating: null,
      tagCodes: [],
      endedAt: '2026-07-05T12:00:00.000Z',
    },
    {
      accountId: lichessAccount.id,
      provider: 'LICHESS',
      speedCategory: 'rapid',
      userColor: 'WHITE',
      resultForUser: 'WIN',
      opponentRating: 599,
      tagCodes: [],
      endedAt: '2026-07-06T12:00:00.000Z',
    },
  ];

  for (const [index, game] of games.entries()) {
    const hasAnalysis = game.latestWhiteAccuracy !== undefined || game.latestBlackAccuracy !== undefined;
    await prisma.importedGame.create({
      data: {
        userId: devUser.id,
        accountId: game.accountId,
        provider: game.provider,
        providerGameId: `performance-by-rating-${index}-${suffix}`,
        rated: true,
        variant: 'standard',
        speedCategory: game.speedCategory,
        userColor: game.userColor,
        resultForUser: game.resultForUser,
        endedAt: new Date(game.endedAt),
        tagCodes: game.tagCodes,
        latestAnalysisStatus: hasAnalysis ? 'COMPLETED' : null,
        latestAnalysisCompletedAt: hasAnalysis ? new Date(game.endedAt) : null,
        latestWhiteAccuracy: game.latestWhiteAccuracy ?? null,
        latestBlackAccuracy: game.latestBlackAccuracy ?? null,
        ...(game.opponentRating === null
          ? opponentRatings(game.userColor, 1400, null)
          : opponentRatings(game.userColor, 1400, game.opponentRating)),
      },
    });
  }

  const app = await buildApp({ logger: false, authConfig: { mode: 'dev-single-user', userId: devUser.id } });
  try {
    await app.ready();
    const response = await app.inject({
      method: 'GET',
      url: '/api/lab/performance-by-rating?from=2026-07-01&to=2026-07-14&minRating=600',
    });

    assert.equal(response.statusCode, 200);
    const body = response.json();
    assert.deepEqual(body.range, { from: '2026-07-01', to: '2026-07-14' });
    assert.equal(body.items.length, 5);
    assert.deepEqual(
      body.items.map((item) => item.ratingFrom),
      [1500, 1300, 1200, 1200, 1100],
      'rating bands are ordered descending before report type',
    );

    const byKey = new Map(body.items.map((item) => [`${item.type}:${item.ratingFrom}`, item]));
    assert.equal(byKey.has('LICHESS_RAPID:500'), false, 'minimum rating is applied before aggregation');
    const lichessBlitz1200 = byKey.get('LICHESS_BLITZ:1200');
    assert.deepEqual(lichessBlitz1200.wdl, { wins: 1, draws: 0, losses: 0 });
    assert.deepEqual(lichessBlitz1200.whiteWdl, { wins: 1, draws: 0, losses: 0 });
    assert.equal(lichessBlitz1200.openingSuccess, 1, 'nested opening-success tags count once');
    assert.equal(lichessBlitz1200.averageAccuracy, 91);

    const lichessBlitz1300 = byKey.get('LICHESS_BLITZ:1300');
    assert.deepEqual(lichessBlitz1300.blackWdl, { wins: 0, draws: 0, losses: 1 });
    assert.equal(lichessBlitz1300.wasWinningAndLost, 1, 'nested winning-position tags count once');
    assert.equal(lichessBlitz1300.flaggedInWinningPosition, 1);
    assert.equal(lichessBlitz1300.slowBleedLosses, 1);
    assert.equal(lichessBlitz1300.averageAccuracy, 70, 'accuracy uses the user side');

    const lichessRapid = byKey.get('LICHESS_RAPID:1100');
    assert.equal(lichessRapid.wasLosingAndWon, 1, 'nested losing-position tags count once');
    assert.equal(lichessRapid.opponentFlaggedInWinningPosition, 1);
    assert.equal(lichessRapid.slowBleedWins, 1);

    const chessComBlitz = byKey.get('CHESS_COM_BLITZ:1200');
    assert.equal(chessComBlitz.openingTrouble, 1, 'nested opening-trouble tags count once');
    assert.deepEqual(chessComBlitz.wdl, { wins: 0, draws: 1, losses: 0 });

    const chessComRapid = byKey.get('CHESS_COM_RAPID:1500');
    assert.equal(chessComRapid.games, 1, 'date-only to includes the full selected day and excludes the next day');
    assert.equal(chessComRapid.analysedGames, 0);
    assert.equal(chessComRapid.averageAccuracy, null);

    const invalidRange = await app.inject({
      method: 'GET',
      url: '/api/lab/performance-by-rating?from=2026-07-15&to=2026-07-14',
    });
    assert.equal(invalidRange.statusCode, 400);
  } finally {
    await app.close();
  }

  console.log('Performance by rating tests passed.');
} finally {
  for (const accountId of accountIds.reverse()) {
    await prisma.externalAccount.delete({ where: { id: accountId } });
  }
  await prisma.$disconnect();
}
