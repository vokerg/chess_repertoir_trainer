import assert from 'node:assert/strict';
import {
  createLichessOpeningExplorerClient,
  lichessGamesRatingGroups,
  lichessGamesSpeeds,
  LichessMastersUpstreamError,
} from '../../dist/modules/masters-explorer/lichess-masters.client.js';

const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const accessToken = 'test-opening-explorer-token';
const upstreamPayload = {
  opening: null,
  white: 5,
  draws: 4,
  black: 3,
  moves: [{
    uci: 'e2e4',
    san: 'e4',
    averageRating: 1510,
    white: 4,
    draws: 2,
    black: 1,
    game: {
      id: 'representative',
      winner: 'white',
      speed: 'blitz',
      white: { name: 'White Player', rating: 1500 },
      black: { name: 'Black Player', rating: 1520 },
      year: 2025,
      month: '2025-05',
    },
    opening: { eco: 'B00', name: "King's Pawn Game" },
  }],
  topGames: [{
    uci: 'e2e4',
    id: 'top-game',
    winner: null,
    speed: 'rapid',
    white: { name: 'Top White', rating: 2400 },
    black: { name: 'Top Black', rating: 2390 },
    year: 2026,
    month: null,
  }],
  recentGames: [],
};

const lichessRequest = {
  fen,
  sinceMonth: '2000-01',
  untilMonth: '2026-12',
  ratings: lichessGamesRatingGroups,
  speeds: lichessGamesSpeeds,
  movesLimit: 12,
  topGamesLimit: 4,
  accessToken,
};

{
  let requestedUrl;
  const client = createLichessOpeningExplorerClient({
    fetchImpl: async (input, init) => {
      requestedUrl = new URL(input);
      assert.equal(init.headers.Accept, 'application/json');
      assert.equal(init.headers.Authorization, `Bearer ${accessToken}`);
      assert.ok(init.signal);
      return new Response(JSON.stringify(upstreamPayload), { status: 200 });
    },
  });

  const result = await client.fetchLichessGamesPosition(lichessRequest);
  assert.equal(requestedUrl.origin, 'https://explorer.lichess.org');
  assert.equal(requestedUrl.pathname, '/lichess');
  assert.equal(requestedUrl.searchParams.get('fen'), fen);
  assert.equal(requestedUrl.searchParams.get('since'), '2000-01');
  assert.equal(requestedUrl.searchParams.get('until'), '2026-12');
  assert.equal(requestedUrl.searchParams.get('ratings'), lichessGamesRatingGroups.join(','));
  assert.equal(requestedUrl.searchParams.get('speeds'), lichessGamesSpeeds.join(','));
  assert.equal(requestedUrl.searchParams.get('moves'), '12');
  assert.equal(requestedUrl.searchParams.get('topGames'), '4');
  assert.deepEqual(result.games, { total: 12, whiteWins: 5, draws: 4, blackWins: 3 });
  assert.equal(result.moves[0].averageRating, 1510);
  assert.equal(result.topGames[0].month, null);
}

{
  let currentTime = 1_000;
  let fetchCalls = 0;
  const client = createLichessOpeningExplorerClient({
    nowMs: () => currentTime,
    fetchImpl: async () => {
      fetchCalls += 1;
      return new Response('{}', { status: 429 });
    },
  });

  await assert.rejects(
    client.fetchMastersPosition({
      fen,
      sinceYear: 2000,
      untilYear: 2026,
      movesLimit: 12,
      topGamesLimit: 15,
      accessToken,
    }),
    (error) => error instanceof LichessMastersUpstreamError && error.statusCode === 429,
  );
  await assert.rejects(
    client.fetchLichessGamesPosition(lichessRequest),
    (error) => error instanceof LichessMastersUpstreamError && error.statusCode === 429,
  );
  assert.equal(fetchCalls, 1, 'a Masters 429 blocks Lichess-games requests in the shared window');
  currentTime += 60_000;
  await assert.rejects(
    client.fetchLichessGamesPosition(lichessRequest),
    (error) => error.statusCode === 429,
  );
  assert.equal(fetchCalls, 2);
}

{
  let active = 0;
  let maxActive = 0;
  let releaseFirst;
  const firstGate = new Promise((resolve) => { releaseFirst = resolve; });
  let call = 0;
  const client = createLichessOpeningExplorerClient({
    fetchImpl: async () => {
      call += 1;
      active += 1;
      maxActive = Math.max(maxActive, active);
      if (call === 1) await firstGate;
      active -= 1;
      return new Response(JSON.stringify(upstreamPayload), { status: 200 });
    },
  });

  const masters = client.fetchMastersPosition({
    fen,
    sinceYear: 2000,
    untilYear: 2026,
    movesLimit: 12,
    topGamesLimit: 15,
    accessToken,
  });
  const lichess = client.fetchLichessGamesPosition(lichessRequest);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(maxActive, 1);
  releaseFirst();
  await Promise.all([masters, lichess]);
  assert.equal(maxActive, 1, 'Masters and Lichess-games requests share one serialized queue');
}

console.log('Lichess opening explorer shared client tests passed.');
