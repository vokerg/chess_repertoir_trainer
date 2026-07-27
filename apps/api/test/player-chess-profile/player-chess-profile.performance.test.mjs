import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { randomUUID } from 'node:crypto';
import { playerChessProfileResponseSchema } from '@chess-trainer/contracts/player-chess-profile';
import { buildApp } from '../../dist/app.js';
import prismaModule from '../../dist/prisma.js';

const prisma = prismaModule.default;
const suffix = randomUUID();
let accountId = null;

try {
  const existingDevUser = await prisma.appUser.findUnique({
    where: { authProvider_authSubject: { authProvider: 'dev', authSubject: 'dev-single-user' } },
  });
  const devUser = existingDevUser ?? await prisma.appUser.create({
    data: { displayName: 'Local user', authProvider: 'dev', authSubject: 'dev-single-user' },
  });
  const account = await prisma.externalAccount.create({
    data: { userId: devUser.id, provider: 'LICHESS', username: `profile-performance-${suffix}` },
  });
  accountId = account.id;

  const endedAt = new Date('2026-07-15T12:00:00.000Z');
  const rows = Array.from({ length: 1_200 }, (_, index) => {
    const openingIndex = index % 120;
    const userColor = openingIndex % 2 === 0 ? 'WHITE' : 'BLACK';
    const analysed = index % 2 === 0;
    const resultForUser = index % 3 === 0 ? 'WIN' : index % 3 === 1 ? 'DRAW' : 'LOSS';
    const accuracy = 65 + (index % 30);
    return {
      userId: devUser.id,
      accountId: account.id,
      provider: 'LICHESS',
      providerGameId: `player-profile-performance-${index}-${suffix}`,
      rated: true,
      variant: 'standard',
      speedCategory: 'blitz',
      userColor,
      resultForUser,
      openingEco: 'B20',
      openingName: `Sicilian Defense: Synthetic Variation ${String(openingIndex).padStart(3, '0')}`,
      endedAt,
      plyIndexedAt: endedAt,
      latestAnalysisStatus: analysed ? 'COMPLETED' : null,
      latestAnalysisCompletedAt: analysed ? endedAt : null,
      latestWhiteAccuracy: analysed && userColor === 'WHITE' ? accuracy : null,
      latestBlackAccuracy: analysed && userColor === 'BLACK' ? accuracy : null,
      whiteRating: userColor === 'WHITE' ? 1500 : 1510,
      blackRating: userColor === 'BLACK' ? 1500 : 1510,
      tagCodes: analysed
        ? index % 4 === 0
          ? [103]
          : index % 4 === 1
            ? [102, 104]
            : []
        : [],
    };
  });
  await prisma.importedGame.createMany({ data: rows });

  const app = await buildApp({ logger: false, authConfig: { mode: 'dev-single-user', userId: devUser.id } });
  try {
    await app.ready();
    const startedAt = performance.now();
    const response = await app.inject({
      method: 'GET',
      url: `/api/player-chess-profile?accountIds=${account.id}&from=2026-07-01&to=2026-07-31&speedPreset=BLITZ&supportingGamesLimit=3`,
    });
    const elapsedMs = performance.now() - startedAt;

    assert.equal(response.statusCode, 200, response.body);
    const body = playerChessProfileResponseSchema.parse(response.json());
    assert.equal(body.coverage.totalGames, 1_200);
    assert.equal(body.coverage.namedOpeningGames, 1_200);
    assert.equal(body.coverage.profiledOpeningGames, 1_000);
    assert.equal(body.coverage.omittedOpeningGames, 200);
    assert.equal(body.coverage.openingGroupLimit, 100);
    assert.equal(body.coverage.openingGroupsTruncated, true);
    assert.equal(body.openingGroups.length, 100);
    assert.equal(body.supportingGames.length, 3);
    assert.ok(
      elapsedMs < 20_000,
      `bounded 1,200-game profile calculation took ${Math.round(elapsedMs)}ms`,
    );
    console.log(`Player chess profile 1,200-game performance check passed in ${Math.round(elapsedMs)}ms.`);
  } finally {
    await app.close();
  }
} finally {
  if (accountId !== null) {
    await prisma.externalAccount.delete({ where: { id: accountId } });
  }
  await prisma.$disconnect();
}
