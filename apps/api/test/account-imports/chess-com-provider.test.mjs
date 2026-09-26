import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import {
  ChessComRateLimitError,
  buildChessComMonthlyArchiveUrl,
  chessComGameMatchesImportScope,
  createChessComPubApiClient,
  normalizeChessComGame,
  parseChessComArchiveMonth,
  parseRetryAfterMs,
  planChessComImportWindows,
} from '../../dist/modules/account-imports/providers/chess-com/chess-com.provider.js';

plannerUsesExactIntersectingMonths();
normalizationAndScopeUseHalfOpenEpochBoundaries();
normalizationRemovesOnlyStandaloneClockComments();
normalizationPreservesPgnWithoutClockComments();
archiveMonthParsingIsStrict();
await cacheValidatorsReuseOnlyCachedBodies();
await retryBackoffIsBounded();
await cacheMetadataIsBounded();
await terminalArchiveStatusesAreNotRetried();
await rateLimitProducesDurableRetryBoundary();
await cancellationInterruptsRetryDelay();

function plannerUsesExactIntersectingMonths() {
  const from = new Date('2026-01-15T10:30:00.000Z');
  const to = new Date('2026-04-01T00:00:00.000Z');

  const initial = planChessComImportWindows({
    username: 'Example User',
    mode: 'BOUNDED_INITIAL',
    requestedFrom: from,
    requestedTo: to,
  });
  assert.deepEqual(initial.map((window) => window.key), ['2026-03', '2026-02', '2026-01']);
  assert.equal(initial[2].from.toISOString(), from.toISOString());
  assert.equal(initial[0].to.toISOString(), to.toISOString());
  assert.equal(
    initial[0].url,
    'https://api.chess.com/pub/player/example%20user/games/2026/03',
  );

  const forward = planChessComImportWindows({
    username: 'Example User',
    mode: 'INCREMENTAL_FORWARD',
    requestedFrom: from,
    requestedTo: to,
  });
  assert.deepEqual(forward.map((window) => window.key), ['2026-01', '2026-02', '2026-03']);

  const backfill = planChessComImportWindows({
    username: 'Example User',
    mode: 'HISTORICAL_BACKFILL',
    requestedFrom: from,
    requestedTo: to,
  });
  assert.deepEqual(backfill.map((window) => window.key), ['2026-03', '2026-02', '2026-01']);
}

function normalizationAndScopeUseHalfOpenEpochBoundaries() {
  const account = { id: 7, userId: 3, provider: 'CHESS_COM', username: 'Alice' };
  const scope = { variant: 'STANDARD', speeds: ['BLITZ', 'RAPID'], rated: 'BOTH' };
  const from = new Date('2026-02-01T00:00:00.000Z');
  const to = new Date('2026-03-01T00:00:00.000Z');

  const inside = normalizeChessComGame(gameAt('2026-02-28T23:59:59.000Z'), account);
  assert.equal(inside.userColor, 'WHITE');
  assert.equal(inside.resultForUser, 'WIN');
  assert.equal(inside.timeControlInitial, 300);
  assert.equal(inside.timeControlIncrement, 5);
  assert.equal(chessComGameMatchesImportScope(inside, scope, from, to), true);

  const atExclusiveEnd = normalizeChessComGame(gameAt(to), account);
  assert.equal(chessComGameMatchesImportScope(atExclusiveEnd, scope, from, to), false);

  const bullet = normalizeChessComGame({ ...gameAt('2026-02-20T00:00:00Z'), time_class: 'bullet' }, account);
  assert.equal(chessComGameMatchesImportScope(bullet, scope, from, to), false);

  const unratedOnly = { ...scope, rated: 'UNRATED' };
  assert.equal(chessComGameMatchesImportScope(inside, unratedOnly, from, to), false);

  const nonStandard = normalizeChessComGame({ ...gameAt('2026-02-20T00:00:00Z'), rules: 'chess960' }, account);
  assert.equal(chessComGameMatchesImportScope(nonStandard, scope, from, to), false);
}

function normalizationRemovesOnlyStandaloneClockComments() {
  const account = { id: 7, userId: 3, provider: 'CHESS_COM', username: 'Alice' };
  const game = gameAt('2026-02-20T00:00:00Z');
  const headers = `${game.pgn}\n[Event "Clock example {[%clk 0:01:00]}"]\n`;
  const movetext = '\n1. e4{[%clk 0:05:00]}e5 { [%clk 0:04:59.5] } '
    + '2. Nf3 $1 {Develop a knight} (2. Bc4 {Other choice}) Nc6 '
    + '{[%eval 0.2]} 3. Bb5 { [%clk 0:04:58] } a6 1-0';
  const expectedMovetext = '\n1. e4 e5   '
    + '2. Nf3 $1 {Develop a knight} (2. Bc4 {Other choice}) Nc6 '
    + '{[%eval 0.2]} 3. Bb5   a6 1-0';
  const normalized = normalizeChessComGame({ ...game, pgn: headers + movetext }, account);
  assert.equal(normalized.pgn, headers + expectedMovetext);
  const { pgn: _pgn, ...otherFields } = normalized;
  const { pgn: _baselinePgn, ...baselineFields } = normalizeChessComGame(game, account);
  assert.deepEqual(otherFields, baselineFields, 'only stored PGN changes');
  const chess = new Chess();
  chess.loadPgn(normalized.pgn);
  assert.deepEqual(chess.history(), ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6']);
}

function normalizationPreservesPgnWithoutClockComments() {
  const account = { id: 7, userId: 3, provider: 'CHESS_COM', username: 'Alice' };
  const game = gameAt('2026-02-20T00:00:00Z');
  for (const pgn of [undefined, null, '', game.pgn,
    `${game.pgn}\n\n1. e4 {A note [%clk 0:05:00]} e5 {[%clk 0:04:59] keep this note} `
      + '2. Nf3 $1 {[%eval 0.2]} (2. Bc4) Nc6 ; Keep {[%clk 0:04:58]}\n1-0',
  ]) {
    assert.equal(normalizeChessComGame({ ...game, pgn }, account).pgn, pgn ?? null);
  }
}

function archiveMonthParsingIsStrict() {
  assert.deepEqual(
    parseChessComArchiveMonth('https://api.chess.com/pub/player/a/games/2026/02'),
    { key: '2026-02', year: 2026, month: 2 },
  );
  assert.equal(parseChessComArchiveMonth('https://api.chess.com/pub/player/a/games/2026/13'), null);
  assert.equal(parseChessComArchiveMonth('https://example.com/not-an-archive'), null);
  assert.equal(parseRetryAfterMs('5', 0), 5_000);
  assert.equal(parseRetryAfterMs('not-a-date', 0), null);
}

async function cacheValidatorsReuseOnlyCachedBodies() {
  const requests = [];
  let call = 0;
  const client = createChessComPubApiClient({
    userAgent: 'test-agent (contact: test@example.com)',
    fetchImpl: async (_url, init) => {
      requests.push(new Headers(init?.headers));
      call += 1;
      if (call === 1) {
        return new Response(JSON.stringify({ archives: ['a'] }), {
          status: 200,
          headers: { etag: '"v1"', 'last-modified': 'Wed, 12 Aug 2026 00:00:00 GMT' },
        });
      }
      return new Response(null, { status: 304 });
    },
  });

  const first = await client.fetchArchives('alice');
  const second = await client.fetchArchives('alice');
  assert.deepEqual(first, { archives: ['a'] });
  assert.deepEqual(second, first);
  assert.equal(requests[0].get('user-agent'), 'test-agent (contact: test@example.com)');
  assert.equal(requests[0].get('if-none-match'), null);
  assert.equal(requests[1].get('if-none-match'), '"v1"');
  assert.equal(requests[1].get('if-modified-since'), 'Wed, 12 Aug 2026 00:00:00 GMT');
}

async function retryBackoffIsBounded() {
  const sleeps = [];
  let calls = 0;
  const client = createChessComPubApiClient({
    retries: 1,
    retryBaseDelayMs: 250,
    maxRetryDelayMs: 300,
    sleep: async (ms) => sleeps.push(ms),
    fetchImpl: async () => {
      calls += 1;
      if (calls === 1) return new Response(null, {
        status: 503,
        statusText: 'Unavailable',
        headers: { 'retry-after': '5' },
      });
      return new Response(JSON.stringify({ archives: [] }), { status: 200 });
    },
  });

  assert.deepEqual(await client.fetchArchives('alice'), { archives: [] });
  assert.equal(calls, 2);
  assert.deepEqual(sleeps, [300], 'provider Retry-After is capped for in-process retries');
}

async function cacheMetadataIsBounded() {
  const cache = new Map();
  const client = createChessComPubApiClient({
    cache,
    cacheMaxEntries: 2,
    fetchImpl: async (url) => new Response(JSON.stringify({ marker: url }), {
      status: 200,
      headers: { etag: `"${url}"` },
    }),
  });

  await client.fetchMonthlyArchive('alice', 2026, 1);
  await client.fetchMonthlyArchive('alice', 2026, 2);
  await client.fetchMonthlyArchive('alice', 2026, 3);
  assert.equal(cache.size, 2);
  assert.equal(
    cache.has('https://api.chess.com/pub/player/alice/games/2026/01'),
    false,
    'old validator metadata is evicted rather than growing without bound',
  );
}

async function terminalArchiveStatusesAreNotRetried() {
  for (const status of [404, 410]) {
    let calls = 0;
    const client = createChessComPubApiClient({
      retries: 2,
      sleep: async () => { throw new Error('terminal status must not back off'); },
      fetchImpl: async () => {
        calls += 1;
        return new Response(null, { status });
      },
    });
    await assert.rejects(() => client.fetchMonthlyArchive('alice', 2026, 2), (error) => {
      assert.equal(error.status, status);
      return true;
    });
    assert.equal(calls, 1);
  }
}

async function rateLimitProducesDurableRetryBoundary() {
  const now = new Date('2026-08-12T04:00:00.000Z').getTime();
  const client = createChessComPubApiClient({
    now: () => now,
    rateLimitDelayMs: 60_000,
    fetchImpl: async () => new Response(null, {
      status: 429,
      statusText: 'Too Many Requests',
      headers: { 'retry-after': '10' },
    }),
  });

  await assert.rejects(
    () => client.fetchArchives('alice'),
    (error) => {
      assert.ok(error instanceof ChessComRateLimitError);
      assert.equal(error.retryAt.toISOString(), '2026-08-12T04:01:00.000Z');
      return true;
    },
  );
}

async function cancellationInterruptsRetryDelay() {
  const controller = new AbortController();
  let sleepSignal;
  const client = createChessComPubApiClient({
    retries: 2,
    sleep: async (_ms, signal) => {
      sleepSignal = signal;
      controller.abort(new Error('cancelled'));
      throw controller.signal.reason;
    },
    fetchImpl: async () => new Response(null, { status: 503 }),
  });

  await assert.rejects(() => client.fetchArchives('alice', controller.signal), /cancelled/);
  assert.equal(sleepSignal, controller.signal);
}

function gameAt(value) {
  const timestamp = value instanceof Date ? value : new Date(value);
  return {
    url: `https://www.chess.com/game/live/${timestamp.getTime()}`,
    pgn: '[White "Alice"]\n[Black "Bob"]\n[Result "1-0"]\n[TimeControl "300+5"]',
    end_time: Math.floor(timestamp.getTime() / 1000),
    rated: true,
    time_class: 'blitz',
    time_control: '300+5',
    rules: 'chess',
    white: { username: 'Alice', rating: 1500, result: 'win' },
    black: { username: 'Bob', rating: 1490, result: 'checkmated' },
  };
}
