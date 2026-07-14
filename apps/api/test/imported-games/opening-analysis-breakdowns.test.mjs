import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { buildApp } from '../../dist/app.js';
import prismaModule from '../../dist/prisma.js';
import { positionKeyForNormalizedFen } from '../../dist/modules/positions/position-key.js';

const prisma = prismaModule.default;
const suffix = randomUUID();
let accountId;

function positionKey(normalizedFen) {
  return new Uint8Array(positionKeyForNormalizedFen(normalizedFen));
}

try {
  const existingDevUser = await prisma.appUser.findUnique({
    where: { authProvider_authSubject: { authProvider: 'dev', authSubject: 'dev-single-user' } },
  });
  const devUser = existingDevUser ?? await prisma.appUser.create({
    data: { displayName: 'Local user', authProvider: 'dev', authSubject: 'dev-single-user' },
  });

  const account = await prisma.externalAccount.create({
    data: { userId: devUser.id, provider: 'LICHESS', username: `opening-breakdowns-${suffix}` },
  });
  accountId = account.id;

  const normalizedFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -';
  const position = await prisma.position.upsert({
    where: { positionKey: positionKey(normalizedFen) },
    update: {},
    create: { positionKey: positionKey(normalizedFen), normalizedFen },
  });

  const openings = [
    { eco: 'C20', name: "King's Pawn Game" },
    { eco: 'C21', name: "King's Pawn Game" },
    { eco: 'C20', name: "King's Pawn Game: Leonardis Variation" },
    { eco: 'B01', name: 'Scandinavian Defense' },
  ];

  for (const [index, opening] of openings.entries()) {
    const game = await prisma.importedGame.create({
      data: {
        userId: devUser.id,
        accountId,
        provider: 'LICHESS',
        providerGameId: `opening-breakdown-${index}-${suffix}`,
        rated: true,
        variant: 'standard',
        speedCategory: 'blitz',
        userColor: 'WHITE',
        resultForUser: index === 3 ? 'LOSS' : 'WIN',
        openingEco: opening.eco,
        openingName: opening.name,
        endedAt: new Date(`2026-06-0${index + 1}T12:00:00.000Z`),
      },
    });

    await prisma.importedGamePly.create({
      data: {
        importedGameId: game.id,
        positionId: position.id,
        plyNumber: 1,
        moveUci: index === 3 ? 'd2d4' : 'e2e4',
      },
    });
  }

  const app = await buildApp({ logger: false, authConfig: { mode: 'dev-single-user', userId: devUser.id } });
  try {
    await app.ready();
    const breakdownResponse = await app.inject({
      method: 'GET',
      url: '/api/opening-analysis/breakdowns?fen=startpos&rated=true&speedCategory=blitz&openingNameExact=King%27s%20Pawn%20Game&openingName=King%27s%20Pawn%20Game',
    });

    assert.equal(breakdownResponse.statusCode, 200);
    const breakdown = breakdownResponse.json();
    assert.equal(breakdown.normalizedFen, normalizedFen);
    assert.deepEqual(breakdown.openings, [
      { name: "King's Pawn Game", games: 2 },
      { name: "King's Pawn Game: Leonardis Variation", games: 1 },
      { name: 'Scandinavian Defense', games: 1 },
    ]);
    assert.deepEqual(breakdown.appliedFilters.openingBreakdownExcludes, [
      'openingEco',
      'openingName',
      'openingNameExact',
    ]);

    const filteredResponse = await app.inject({
      method: 'GET',
      url: '/api/opening-analysis?fen=startpos&rated=true&speedCategory=blitz&openingNameExact=King%27s%20Pawn%20Game&openingName=King%27s%20Pawn%20Game',
    });
    assert.equal(filteredResponse.statusCode, 200);
    assert.equal(filteredResponse.json().games.total, 2);
  } finally {
    await app.close();
  }

  console.log('Opening analysis breakdown tests passed.');
} finally {
  if (accountId) await prisma.externalAccount.delete({ where: { id: accountId } });
  await prisma.$disconnect();
}
