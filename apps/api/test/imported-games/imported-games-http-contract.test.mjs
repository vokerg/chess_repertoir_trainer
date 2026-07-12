import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { buildApp } from '../../dist/app.js';
import prismaModule from '../../dist/prisma.js';
import { positionKeyForNormalizedFen } from '../../dist/modules/positions/position-key.js';

const prisma = prismaModule.default;
const suffix = randomUUID();
let accountId;
let userId;

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
  userId = devUser.id;
  await prisma.gameTagDefinition.upsert({
    where: { code: 42 },
    update: { name: 'ANALYSED' },
    create: { code: 42, name: 'ANALYSED' },
  });

  const account = await prisma.externalAccount.create({
    data: { userId, provider: 'LICHESS', username: `http-contract-${suffix}` },
  });
  accountId = account.id;

  const game = await prisma.importedGame.create({
    data: {
      userId,
      accountId,
      provider: 'LICHESS',
      providerGameId: `rich-${suffix}`,
      providerUrl: `https://lichess.org/${suffix}`,
      pgn: '[Event "Contract test"]\n\n1. e4 e5',
      rated: true,
      variant: 'standard',
      speedCategory: 'rapid',
      timeControlRaw: '600+5',
      timeControlInitial: 600,
      timeControlIncrement: 5,
      startedAt: new Date('2026-03-04T05:00:00.000Z'),
      endedAt: new Date('2026-03-04T05:20:00.000Z'),
      whiteUsername: 'CurrentUser',
      blackUsername: 'Opponent',
      whiteRating: 1810,
      blackRating: 1790,
      userColor: 'WHITE',
      opponentUsername: 'Opponent',
      result: '1-0',
      resultForUser: 'WIN',
      status: 'finished',
      openingEco: 'C20',
      openingName: "King's Pawn Game",
      tagCodes: [42],
      latestAnalysisStatus: 'COMPLETED',
      latestWhiteAccuracy: 92.5,
    },
  });
  await prisma.importedGame.create({
    data: {
      userId,
      accountId,
      provider: 'LICHESS',
      providerGameId: `older-${suffix}`,
      endedAt: new Date('2026-03-03T05:20:00.000Z'),
      whiteUsername: 'Opponent2',
      blackUsername: 'CurrentUser',
      whiteRating: null,
      blackRating: null,
      userColor: 'BLACK',
      resultForUser: 'DRAW',
    },
  });

  const firstNormalizedFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -';
  const firstPosition = await prisma.position.upsert({
    where: { positionKey: positionKey(firstNormalizedFen) },
    update: {},
    create: {
      positionKey: positionKey(firstNormalizedFen),
      normalizedFen: firstNormalizedFen,
    },
  });
  await prisma.positionAnalysis.upsert({
    where: { positionId: firstPosition.id },
    update: { bestMoveUci: 'e2e4', bestScoreCpWhite: 24, lines: [
      { multipv: 1, depth: 18, moveUci: 'e2e4', scoreCpWhite: 24, pvUci: ['e2e4', 'e7e5'] },
      { multipv: 2, depth: 18, moveUci: 'd2d4', scoreCpWhite: 18, pvUci: ['d2d4', 'd7d5'] },
    ] },
    create: { positionId: firstPosition.id, bestMoveUci: 'e2e4', bestScoreCpWhite: 24, lines: [
      { multipv: 1, depth: 18, moveUci: 'e2e4', scoreCpWhite: 24, pvUci: ['e2e4', 'e7e5'] },
      { multipv: 2, depth: 18, moveUci: 'd2d4', scoreCpWhite: 18, pvUci: ['d2d4', 'd7d5'] },
    ] },
  });
  const legacyNormalizedFen = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -';
  const legacyPosition = await prisma.position.upsert({
    where: { positionKey: positionKey(legacyNormalizedFen) },
    update: {},
    create: {
      positionKey: positionKey(legacyNormalizedFen),
      normalizedFen: legacyNormalizedFen,
    },
  });
  await prisma.positionAnalysis.upsert({
    where: { positionId: legacyPosition.id },
    update: { bestMoveUci: 'g1f3', bestScoreCpWhite: 20, lines: [
      { multipv: 1, moveUci: 'g1f3', depth: 'historical-invalid', scoreCpWhite: 'historical-invalid' },
      { pvUci: ['not-a-move'] }, null,
    ] },
    create: { positionId: legacyPosition.id, bestMoveUci: 'g1f3', bestScoreCpWhite: 20, lines: [
      { multipv: 1, moveUci: 'g1f3', depth: 'historical-invalid', scoreCpWhite: 'historical-invalid' },
      { pvUci: ['not-a-move'] }, null,
    ] },
  });
  await prisma.importedGamePly.createMany({
    data: [
      { importedGameId: game.id, positionId: firstPosition.id, plyNumber: 1, moveUci: 'e2e4', scoreLossCp: 0, classificationCode: 1 },
      { importedGameId: game.id, positionId: legacyPosition.id, plyNumber: 2, moveUci: 'e7e5', scoreLossCp: 12, classificationCode: 2 },
    ],
  });
  await prisma.gameAnalysisRun.create({
    data: {
      importedGameId: game.id,
      status: 'COMPLETED',
      positionsTotal: 2,
      positionsDone: 2,
      whiteAccuracy: 92.5,
      blackAccuracy: 88,
      summary: { totalMoves: 2, criticalPlyNumbers: [] },
      completedAt: new Date('2026-03-04T05:21:00.000Z'),
    },
  });

  const app = await buildApp({ logger: false, authConfig: { mode: 'dev-single-user', userId } });
  try {
    await app.ready();
    const detailResponse = await app.inject({ method: 'GET', url: `/api/imported-games/${game.id}` });
    assert.equal(detailResponse.statusCode, 200);
    const detail = detailResponse.json();
    assert.equal(detail.plies.length, 2);
    assert.deepEqual(detail.plies[0].positionAnalysis, {
      id: detail.plies[0].positionAnalysis.id,
      bestMoveUci: 'e2e4',
      bestScoreCpWhite: 24,
      bestMateWhite: null,
    });
    assert.equal('lines' in detail.plies[0].positionAnalysis, false);
    assert.equal('lines' in detail.plies[1].positionAnalysis, false);
    assert.deepEqual(detail.tags, [{ code: 42, name: 'ANALYSED' }]);
    assert.deepEqual(detail.opening, { eco: 'C20', name: "King's Pawn Game" });

    const analysisResponse = await app.inject({ method: 'GET', url: `/api/imported-games/${game.id}/analysis` });
    assert.equal(analysisResponse.statusCode, 200);
    const analysisRun = analysisResponse.json().run;
    assert.equal(analysisRun.moves.length, 2);
    assert.equal('criticalMoves' in analysisRun, false);
    assert.deepEqual(
      analysisRun.moves.map((move) => move.classificationCode),
      [1, 2],
    );

    const topGamesResponse = await app.inject({ method: 'GET', url: '/api/opening-analysis/top-games?fen=startpos&limit=5' });
    assert.equal(topGamesResponse.statusCode, 200);
    const topGame = topGamesResponse.json().topGames[0];
    assert.deepEqual(Object.keys(topGame).sort(), [
      'black', 'endedAt', 'id', 'moveNumber', 'nextMoveSan', 'nextMoveUci',
      'opening', 'provider', 'resultForUser', 'speedCategory', 'white',
    ]);
    assert.equal(topGame.nextMoveUci, 'e2e4');
    assert.equal('tagCodes' in topGame, false);

    const firstPage = await app.inject({ method: 'GET', url: `/api/imported-games?accountIds=${accountId}&limit=1` });
    assert.equal(firstPage.statusCode, 200);
    const firstPageBody = firstPage.json();
    const firstItem = firstPageBody.items[0];
    assert.equal(firstItem.userColor, 'WHITE');
    assert.equal(firstItem.tagCount, 1);
    assert.deepEqual(firstItem.analysis, {
      status: 'COMPLETED',
      whiteAccuracy: 92.5,
      blackAccuracy: null,
      userAccuracy: 92.5,
    });
    for (const removedField of ['accountId', 'providerGameId', 'startedAt', 'variant', 'opponentUsername', 'result', 'status', 'tags', 'tagCodes', 'analysisRuns']) {
      assert.equal(removedField in firstItem, false, `search item must omit ${removedField}`);
    }
    assert.deepEqual(Object.keys(firstItem.plyIndex), ['status']);
    assert.equal('summary' in firstItem.analysis, false);
    assert.equal('runId' in firstItem.analysis, false);
    assert.equal(firstPageBody.pageInfo.hasMore, true);
    const secondPage = await app.inject({
      method: 'GET',
      url: `/api/imported-games?accountIds=${accountId}&limit=1&cursor=${encodeURIComponent(firstPageBody.pageInfo.nextCursor)}`,
    });
    assert.equal(secondPage.statusCode, 200);
    assert.equal(secondPage.json().items[0].userColor, 'BLACK');
    assert.equal(secondPage.json().items[0].white.rating, null);
    assert.equal(secondPage.json().items[0].black.rating, null);

    const accountPage = await app.inject({ method: 'GET', url: `/api/me/accounts/${accountId}/games?limit=1` });
    assert.equal(accountPage.statusCode, 200);
    assert.deepEqual(accountPage.json().items[0], firstItem);

    await prisma.positionAnalysis.update({ where: { positionId: legacyPosition.id }, data: { lines: { unusable: true } } });
    const unusable = await app.inject({ method: 'GET', url: `/api/imported-games/${game.id}` });
    assert.equal(unusable.statusCode, 200);
    assert.equal('lines' in unusable.json().plies[1].positionAnalysis, false);
  } finally {
    await app.close();
  }

  console.log('Imported games HTTP contract tests passed.');
} finally {
  if (accountId) await prisma.externalAccount.delete({ where: { id: accountId } });
  await prisma.$disconnect();
}
