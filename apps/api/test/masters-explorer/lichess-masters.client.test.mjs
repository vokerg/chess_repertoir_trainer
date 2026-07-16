import assert from 'node:assert/strict';
import {
  createLichessMastersClient,
  LichessMastersUpstreamError,
} from '../../dist/modules/masters-explorer/lichess-masters.client.js';

const request = {
  fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  sinceYear: 2000,
  untilYear: 2026,
  movesLimit: 12,
  topGamesLimit: 15,
  accessToken: 'test-masters-access-token',
};

const upstreamPayload = {
  opening: null,
  white: 5,
  draws: 4,
  black: 3,
  moves: [{
    uci: 'e2e4',
    san: 'e4',
    averageRating: 2510,
    white: 4,
    draws: 2,
    black: 1,
    game: {
      id: 'representative',
      winner: 'white',
      white: { name: 'White Player', rating: 2700 },
      black: { name: 'Black Player' },
      year: 2025,
      month: '2025-05',
    },
    opening: { eco: 'B00', name: "King's Pawn Game" },
  }],
  topGames: [{
    uci: 'e2e4',
    id: 'top-game',
    winner: null,
    white: { name: 'Top White', rating: 2800 },
    black: { name: 'Top Black', rating: 2790 },
    year: 2026,
  }],
};

{
  let requestedUrl;
  const client = createLichessMastersClient({
    fetchImpl: async (input, init) => {
      requestedUrl = new URL(input);
      assert.equal(init.headers.Accept, 'application/json');
      assert.equal(init.headers.Authorization, `Bearer ${request.accessToken}`);
      assert.ok(init.signal);
      return new Response(JSON.stringify(upstreamPayload), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    },
  });

  const result = await client.fetchPosition(request);
  assert.equal(requestedUrl.origin, 'https://explorer.lichess.org');
  assert.equal(requestedUrl.pathname, '/masters');
  assert.equal(requestedUrl.searchParams.get('fen'), request.fen);
  assert.equal(requestedUrl.searchParams.get('since'), '2000');
  assert.equal(requestedUrl.searchParams.get('until'), '2026');
  assert.equal(requestedUrl.searchParams.get('moves'), '12');
  assert.equal(requestedUrl.searchParams.get('topGames'), '15');
  assert.deepEqual(result.games, { total: 12, whiteWins: 5, draws: 4, blackWins: 3 });
  assert.equal(result.moves[0].representativeGame.moveUci, null);
  assert.equal(result.moves[0].representativeGame.winner, 'WHITE');
  assert.equal(result.moves[0].representativeGame.black.rating, null);
  assert.equal(result.topGames[0].moveUci, 'e2e4');
  assert.equal(result.topGames[0].winner, null);
  assert.equal(result.topGames[0].month, null);
}

{
  const client = createLichessMastersClient({
    fetchImpl: async () => new Response(JSON.stringify({ white: 1 }), { status: 200 }),
  });
  await assert.rejects(
    client.fetchPosition(request),
    (error) => error instanceof LichessMastersUpstreamError,
  );
}

{
  let currentTime = 1_000;
  let fetchCalls = 0;
  const client = createLichessMastersClient({
    nowMs: () => currentTime,
    fetchImpl: async () => {
      fetchCalls += 1;
      return new Response('{}', { status: 429 });
    },
  });

  await assert.rejects(client.fetchPosition(request), (error) => error.statusCode === 429);
  await assert.rejects(client.fetchPosition(request), (error) => error.statusCode === 429);
  assert.equal(fetchCalls, 1, 'the client fails fast during the 429 backoff window');
  currentTime += 60_000;
  await assert.rejects(client.fetchPosition(request), (error) => error.statusCode === 429);
  assert.equal(fetchCalls, 2);
}

{
  let active = 0;
  let maxActive = 0;
  let releaseFirst;
  const firstGate = new Promise((resolve) => { releaseFirst = resolve; });
  let call = 0;
  const client = createLichessMastersClient({
    fetchImpl: async () => {
      call += 1;
      active += 1;
      maxActive = Math.max(maxActive, active);
      if (call === 1) await firstGate;
      active -= 1;
      return new Response(JSON.stringify(upstreamPayload), { status: 200 });
    },
  });

  const first = client.fetchPosition(request);
  const second = client.fetchPosition({ ...request, fen: request.fen.replace(' w ', ' b ') });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(maxActive, 1);
  releaseFirst();
  await Promise.all([first, second]);
  assert.equal(maxActive, 1, 'outbound Lichess requests are serialized');
}

{
  let fetchCalls = 0;
  const client = createLichessMastersClient({
    fetchImpl: async () => {
      fetchCalls += 1;
      return new Response(JSON.stringify(upstreamPayload), { status: 200 });
    },
  });

  await assert.rejects(
    client.fetchPosition({ ...request, accessToken: '' }),
    (error) => error instanceof LichessMastersUpstreamError
      && error.message.includes('access token'),
  );
  assert.equal(fetchCalls, 0, 'missing user credentials fail before an upstream request');
}

console.log('Lichess Masters client tests passed.');
