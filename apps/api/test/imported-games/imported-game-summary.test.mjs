import { positionFixtureData } from '../positions/fixtures.mjs';
import { encodeUciMove } from 'chess-domain';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import prismaModule from '../../dist/prisma.js';
import { ImportedGameQueryService } from '../../dist/modules/imported-games/imported-game-query.service.js';
import { ImportedGamesService } from '../../dist/modules/imported-games/imported-games.service.js';
import { createChessMcpServer } from '../../dist/modules/mcp/mcp.server.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

const prisma = prismaModule.default;
const suffix = randomUUID();
let userId;
let otherUserId;

async function summarize(query = {}) {
  return (await ImportedGameQueryService.summarize(userId, query)).summary;
}

try {
  const user = await prisma.appUser.create({
    data: {
      displayName: 'Summary aggregation test',
      authProvider: 'test',
      authSubject: `summary-${suffix}`,
      email: `summary-${suffix}@example.test`,
    },
  });
  userId = user.id;
  const otherUser = await prisma.appUser.create({
    data: {
      displayName: 'Other MCP user',
      authProvider: 'test',
      authSubject: `mcp-other-${suffix}`,
    },
  });
  otherUserId = otherUser.id;
  const [lichess, chessCom] = await Promise.all([
    prisma.externalAccount.create({ data: { userId, provider: 'LICHESS', username: `lichess-${suffix}` } }),
    prisma.externalAccount.create({ data: { userId, provider: 'CHESS_COM', username: `chess-com-${suffix}` } }),
  ]);

  const base = {
    userId,
    pgn: '',
    rated: true,
    variant: 'standard',
    status: 'finished',
  };
  const games = await Promise.all([
    prisma.importedGame.create({ data: {
      ...base, accountId: lichess.id, provider: 'LICHESS', providerGameId: `g1-${suffix}`,
      pgn: '[Event "MCP contract test"]\n\n1. e4',
      endedAt: new Date('2026-01-01T12:00:00Z'), resultForUser: 'WIN', userColor: 'WHITE',
      whiteRating: 1600, blackRating: 1500, speedCategory: 'rapid', openingEco: 'B20', openingName: 'Sicilian',
      latestAnalysisStatus: 'COMPLETED', latestWhiteAccuracy: 91,
    } }),
    prisma.importedGame.create({ data: {
      ...base, accountId: lichess.id, provider: 'LICHESS', providerGameId: `g2-${suffix}`,
      endedAt: new Date('2026-01-02T12:00:00Z'), resultForUser: 'DRAW', userColor: 'BLACK',
      whiteRating: 1700, blackRating: 1800, speedCategory: 'blitz', openingEco: 'B20', openingName: 'Sicilian',
      latestAnalysisStatus: 'COMPLETED', latestBlackAccuracy: 84,
    } }),
    prisma.importedGame.create({ data: {
      ...base, accountId: chessCom.id, provider: 'CHESS_COM', providerGameId: `g3-${suffix}`,
      endedAt: new Date('2026-01-03T12:00:00Z'), resultForUser: 'LOSS', userColor: 'WHITE',
      whiteRating: null, blackRating: 1900, speedCategory: 'rapid', openingEco: 'C50', openingName: 'Italian',
      latestAnalysisStatus: 'FAILED', latestWhiteAccuracy: 52,
    } }),
    prisma.importedGame.create({ data: {
      ...base, accountId: chessCom.id, provider: 'CHESS_COM', providerGameId: `g4-${suffix}`,
      endedAt: new Date('2026-01-04T12:00:00Z'), resultForUser: 'WIN', userColor: 'BLACK',
      whiteRating: 2000, blackRating: 2100, speedCategory: 'blitz', openingEco: 'A00', openingName: 'Uncommon',
      latestAnalysisStatus: null,
    } }),
    prisma.importedGame.create({ data: {
      ...base, accountId: lichess.id, provider: 'LICHESS', providerGameId: `g5-${suffix}`,
      endedAt: new Date('2026-01-05T12:00:00Z'), resultForUser: null, userColor: null,
      whiteRating: 2200, blackRating: 2200, speedCategory: null, openingEco: null, openingName: null,
      latestAnalysisStatus: null,
    } }),
    prisma.importedGame.create({ data: {
      ...base, accountId: chessCom.id, provider: 'CHESS_COM', providerGameId: `g6-${suffix}`,
      endedAt: new Date('2026-01-06T12:00:00Z'), resultForUser: 'LOSS', userColor: 'BLACK',
      whiteRating: null, blackRating: null, speedCategory: 'rapid', openingEco: 'B20', openingName: 'Modern Sicilian',
      latestAnalysisStatus: 'COMPLETED', latestBlackAccuracy: 63,
    } }),
  ]);

  const position = await prisma.position.create({
    data: {
      ...positionFixtureData(`summary-${suffix}`)
    },
  });
  await prisma.importedGamePly.create({
    data: { importedGameId: games[0].id, positionId: position.id, plyNumber: 1,  moveCode: encodeUciMove('e2e4'), classificationCode: 6 },
  });

  assert.deepEqual(await summarize(), {
    total: 6,
    wins: 2,
    draws: 1,
    losses: 2,
    scorePct: 41.7,
    byProvider: [
      { provider: 'CHESS_COM', count: 3 },
      { provider: 'LICHESS', count: 3 },
    ],
    bySpeedCategory: [
      { speedCategory: 'rapid', count: 3 },
      { speedCategory: 'blitz', count: 2 },
    ],
    byUserColor: [
      { userColor: 'BLACK', count: 3 },
      { userColor: 'WHITE', count: 2 },
    ],
    byOpeningEco: [
      { openingEco: 'B20', openingName: 'Sicilian', count: 2 },
      { openingEco: 'A00', openingName: 'Uncommon', count: 1 },
      { openingEco: 'B20', openingName: 'Modern Sicilian', count: 1 },
      { openingEco: 'C50', openingName: 'Italian', count: 1 },
    ],
    averageUserRating: 1833.3,
    averageOpponentRating: 1775,
  });

  assert.equal((await summarize({ accountIds: [lichess.id] })).total, 3);
  assert.equal((await summarize({ from: new Date('2026-01-03T00:00:00Z'), to: new Date('2026-01-04T23:59:59Z') })).total, 2);
  assert.equal((await summarize({ resultForUser: ['WIN'] })).total, 2);
  assert.equal((await summarize({ userColor: ['BLACK'] })).total, 3);
  assert.equal((await summarize({ speedCategory: ['blitz'] })).total, 2);
  assert.equal((await summarize({ openingEco: ['B20'] })).total, 3);
  assert.equal((await summarize({ analysisStatus: ['NOT_ANALYZED'] })).total, 2);
  assert.equal((await summarize({ minAccuracy: 80 })).total, 2);
  assert.equal((await summarize({ classification: ['BLUNDER'] })).total, 1);

  const facets = await ImportedGamesService.facets(userId);
  assert.deepEqual(Object.fromEntries(facets.analysisStatuses.map((item) => [item.value, item.count])), {
    NOT_ANALYZED: 2,
    RUNNING: 0,
    COMPLETED: 3,
    FAILED: 1,
  });

  const server = createChessMcpServer({ error: () => {} }, userId);
  const client = new Client({ name: 'summary-aggregation-regression', version: '1.0.0' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  const mcpSummary = await client.callTool({
    name: 'summarize_imported_games',
    arguments: { providers: ['LICHESS'] },
  });
  assert.equal(mcpSummary.isError, undefined);
  assert.deepEqual(mcpSummary.content, []);
  assert.equal(mcpSummary.structuredContent.summary.total, 3);
  assert.deepEqual(mcpSummary.structuredContent.appliedCriteria.providers, ['LICHESS']);
  const mcpSearch = await client.callTool({
    name: 'search_imported_games',
    arguments: { providers: ['LICHESS'], limit: 1 },
  });
  assert.equal(mcpSearch.isError, undefined);
  const mcpGame = mcpSearch.structuredContent.items[0];
  assert.equal(mcpGame.provider, 'LICHESS');
  assert.equal(mcpGame.analysis.status, 'NOT_ANALYZED');
  assert.equal('providerGameId' in mcpGame, false);
  assert.equal('analysisRuns' in mcpGame, false);
  assert.equal('tags' in mcpGame, false);

  // Cursor pagination and legacy result alias must remain consistent with the API filters.
  const firstPage = await client.callTool({
    name: 'search_imported_games',
    arguments: { providers: ['LICHESS'], sort: 'endedAtAsc', limit: 1 },
  });
  assert.equal(firstPage.isError, undefined);
  assert.equal(firstPage.structuredContent.items[0].id, games[0].id);
  assert.equal(firstPage.structuredContent.pageInfo.hasMore, true);
  const nextCursor = firstPage.structuredContent.pageInfo.nextCursor;
  assert.ok(nextCursor);
  const nextPage = await client.callTool({
    name: 'search_imported_games',
    arguments: { providers: ['LICHESS'], sort: 'endedAtAsc', limit: 1, cursor: nextCursor },
  });
  assert.equal(nextPage.structuredContent.items[0].id, games[1].id);
  const wins = await client.callTool({
    name: 'search_imported_games',
    arguments: { providers: ['LICHESS'], result: ['WIN'] },
  });
  assert.deepEqual(wins.structuredContent.items.map((game) => game.id), [games[0].id]);

  // The MCP detail projection retains compact plies, but never includes raw PGN or analysis lines.
  const detail = await client.callTool({ name: 'get_imported_game', arguments: { gameId: games[0].id } });
  assert.equal(detail.isError, undefined);
  assert.equal(detail.structuredContent.game.pgnAvailable, true);
  assert.equal(detail.structuredContent.game.plies.length, 1);
  assert.equal(detail.structuredContent.game.plies[0].moveUci, 'e2e4');
  assert.equal('pgn' in detail.structuredContent.game, false);
  assert.equal('lines' in detail.structuredContent.game.plies[0], false);
  const compactDetail = await client.callTool({
    name: 'get_imported_game',
    arguments: { gameId: games[0].id, includePlies: false },
  });
  assert.equal('plies' in compactDetail.structuredContent.game, false);
  const pgn = await client.callTool({ name: 'get_imported_game_pgn', arguments: { gameId: games[0].id } });
  assert.equal(pgn.structuredContent.pgn, '[Event "MCP contract test"]\n\n1. e4');
  const facets = await client.callTool({ name: 'get_imported_game_facets', arguments: {} });
  assert.equal(facets.structuredContent.accounts.length, 2);
  assert.equal(facets.structuredContent.analysisStatuses.find(({ value }) => value === 'COMPLETED').count, 3);
  const missingAnalysis = await client.callTool({
    name: 'get_imported_game_analysis',
    arguments: { gameId: games[0].id },
  });
  assert.equal(missingAnalysis.isError, true);
  assert.equal(missingAnalysis.structuredContent.code, 'NOT_FOUND');

  // Even a valid, explicitly bound *different* AppUser cannot inspect the first user's games.
  const otherServer = createChessMcpServer({ error: () => {} }, otherUserId);
  const otherClient = new Client({ name: 'mcp-user-ownership-regression', version: '1.0.0' });
  const [otherClientTransport, otherServerTransport] = InMemoryTransport.createLinkedPair();
  await otherServer.connect(otherServerTransport);
  await otherClient.connect(otherClientTransport);
  for (const name of ['get_imported_game', 'get_imported_game_pgn', 'get_imported_game_analysis']) {
    const response = await otherClient.callTool({ name, arguments: { gameId: games[0].id } });
    assert.equal(response.isError, true, `${name} must reject another user's game`);
    assert.equal(response.structuredContent.code, 'NOT_FOUND');
  }
  const otherSearch = await otherClient.callTool({ name: 'search_imported_games', arguments: {} });
  assert.deepEqual(otherSearch.structuredContent.items, []);
  const otherSummary = await otherClient.callTool({ name: 'summarize_imported_games', arguments: {} });
  assert.equal(otherSummary.structuredContent.summary.total, 0);
  const otherFacets = await otherClient.callTool({ name: 'get_imported_game_facets', arguments: {} });
  assert.deepEqual(otherFacets.structuredContent.accounts, []);
  const otherOpening = await otherClient.callTool({ name: 'get_opening_analysis', arguments: { fen: 'startpos' } });
  assert.equal(otherOpening.isError, undefined);
  assert.equal(otherOpening.structuredContent.games.total, 0);
  await otherClient.close();
  await otherServer.close();

  await client.close();
  await server.close();

  console.log('Imported game summary aggregation tests passed.');
} finally {
  if (otherUserId) await prisma.appUser.delete({ where: { id: otherUserId } });
  if (userId) await prisma.appUser.delete({ where: { id: userId } });
  await prisma.$disconnect();
}
