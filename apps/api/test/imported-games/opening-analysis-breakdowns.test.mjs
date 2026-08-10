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
    { eco: 'C20', name: "King's Pawn Game", result: 'WIN' },
    { eco: 'C21', name: "King's Pawn Game", result: 'DRAW' },
    { eco: 'C20', name: "King's Pawn Game: Leonardis Variation", result: 'WIN' },
    { eco: 'B01', name: 'Scandinavian Defense', result: 'LOSS' },
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
        resultForUser: opening.result,
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
      { name: "King's Pawn Game", games: 2, wdl: { wins: 1, draws: 1, losses: 0 } },
      { name: "King's Pawn Game: Leonardis Variation", games: 1, wdl: { wins: 1, draws: 0, losses: 0 } },
      { name: 'Scandinavian Defense', games: 1, wdl: { wins: 0, draws: 0, losses: 1 } },
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
    const filtered = filteredResponse.json();
    assert.equal(filtered.games.total, 2);
    assert.equal(filtered.nextMoves.length, 1);
    assert.equal(filtered.nextMoves[0].moveUci, 'e2e4');
    assert.equal(filtered.nextMoves[0].gameSharePercent, 100);
    assert.equal(filtered.nextMoves[0].scoreDeltaVsPositionPercent, 0);
    assert.equal(filtered.nextMoves[0].lastPlayedAt, '2026-06-02T12:00:00.000Z');
    assert.deepEqual(filtered.nextMoves[0].personalContext, {
      policyVersion: '2026-08-personal-move-v1',
      familiarity: 'RARE',
      resultContext: 'INSUFFICIENT',
      resultSampleQualified: false,
    });

    const resultLessGame = await prisma.importedGame.create({
      data: {
        userId: devUser.id,
        accountId,
        provider: 'LICHESS',
        providerGameId: `opening-breakdown-result-less-${suffix}`,
        rated: true,
        variant: 'standard',
        speedCategory: 'blitz',
        userColor: 'WHITE',
        resultForUser: null,
        openingEco: 'C20',
        openingName: "King's Pawn Game: Result-less Fixture",
        endedAt: new Date('2026-06-05T12:00:00.000Z'),
      },
    });
    await prisma.importedGamePly.create({
      data: {
        importedGameId: resultLessGame.id,
        positionId: position.id,
        plyNumber: 1,
        moveUci: 'e2e4',
      },
    });

    const allResponse = await app.inject({
      method: 'GET',
      url: '/api/opening-analysis?fen=startpos&rated=true&speedCategory=blitz',
    });
    assert.equal(allResponse.statusCode, 200);
    const all = allResponse.json();
    assert.equal(all.games.total, 5, 'Result-less indexed games still count as personal history.');
    assert.equal(all.games.wins + all.games.draws + all.games.losses, 4);
    assert.equal(all.games.scorePct, 62.5, 'Unknown results must not dilute the score percentage.');
    assert.equal(all.nextMoves.length, 2);

    const e4 = all.nextMoves.find((move) => move.moveUci === 'e2e4');
    assert.equal(e4.games.total, 4);
    assert.equal(e4.games.wins + e4.games.draws + e4.games.losses, 3);
    assert.equal(e4.gameSharePercent, 80);
    assert.equal(e4.games.scorePct, 83.3);
    assert.equal(e4.scoreDeltaVsPositionPercent, 20.8);
    assert.equal(e4.lastPlayedAt, '2026-06-05T12:00:00.000Z');
    assert.equal(e4.personalContext.familiarity, 'RARE');
    assert.equal(e4.personalContext.resultContext, 'INSUFFICIENT');
    assert.equal(e4.personalContext.resultSampleQualified, false);

    const d4 = all.nextMoves.find((move) => move.moveUci === 'd2d4');
    assert.equal(d4.games.total, 1);
    assert.equal(d4.gameSharePercent, 20);
    assert.equal(d4.games.scorePct, 0);
    assert.equal(d4.scoreDeltaVsPositionPercent, -62.5);
    assert.equal(d4.lastPlayedAt, '2026-06-04T12:00:00.000Z');
    assert.equal(d4.personalContext.familiarity, 'RARE');
    assert.equal(d4.personalContext.resultContext, 'INSUFFICIENT');
  } finally {
    await app.close();
  }

  console.log('Opening analysis breakdown tests passed.');
} finally {
  if (accountId) await prisma.externalAccount.delete({ where: { id: accountId } });
  await prisma.$disconnect();
}
