import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  LichessNdjsonRecordError,
  buildLichessGamesRequestUrl,
  getLichessResultForUser,
  mapAccountImportSpeedsToLichessPerfTypes,
  matchesLichessImportScope,
  normalizeLichessGame,
  planLichessImportWindows,
  readLichessNdjson,
} from '../../dist/modules/account-imports/providers/lichess/lichess-account-import.js';
import {
  DEFAULT_ACCOUNT_IMPORT_DATABASE_WRITE_BATCH_SIZE,
  DEFAULT_LICHESS_IMPORT_WINDOW_DAYS,
  loadLichessAccountImportConfig,
} from '../../dist/modules/account-imports/providers/lichess/lichess-account-import.config.js';

const DAY_MS = 24 * 60 * 60_000;

requestPlanningAndScopeMapping();
await streamsFixtureNdjson();
await streamsChunkedNdjson();
await rejectsMalformedNdjson();
await malformedNdjsonCancelsProviderStream();
normalizesProviderGameOnce();
configIsBounded();

function requestPlanningAndScopeMapping() {
  const requestedFrom = new Date('2026-05-01T00:00:00.000Z');
  const requestedTo = new Date('2026-06-01T00:00:00.000Z');
  const initial = planLichessImportWindows({
    requestedFrom,
    requestedTo,
    mode: 'BOUNDED_INITIAL',
    windowDays: 14,
  });
  assert.deepEqual(
    initial.map((window) => [window.from.toISOString(), window.to.toISOString()]),
    [
      ['2026-05-18T00:00:00.000Z', '2026-06-01T00:00:00.000Z'],
      ['2026-05-04T00:00:00.000Z', '2026-05-18T00:00:00.000Z'],
      ['2026-05-01T00:00:00.000Z', '2026-05-04T00:00:00.000Z'],
    ],
    'initial/backfill windows are deterministic newest-first half-open ranges',
  );
  const forward = planLichessImportWindows({
    requestedFrom,
    requestedTo,
    mode: 'INCREMENTAL_FORWARD',
    windowDays: 14,
  });
  assert.deepEqual(
    forward.map((window) => [window.from.toISOString(), window.to.toISOString()]),
    [
      ['2026-05-01T00:00:00.000Z', '2026-05-15T00:00:00.000Z'],
      ['2026-05-15T00:00:00.000Z', '2026-05-29T00:00:00.000Z'],
      ['2026-05-29T00:00:00.000Z', '2026-06-01T00:00:00.000Z'],
    ],
    'forward windows are deterministic oldest-first ranges',
  );
  const fullHistory = planLichessImportWindows({
    requestedFrom,
    requestedTo,
    mode: 'FULL_HISTORY',
    windowDays: 14,
  });
  assert.deepEqual(
    fullHistory.map((window) => [window.from.toISOString(), window.to.toISOString()]),
    [
      ['2026-05-18T00:00:00.000Z', '2026-06-01T00:00:00.000Z'],
      ['2026-05-04T00:00:00.000Z', '2026-05-18T00:00:00.000Z'],
      ['2026-05-01T00:00:00.000Z', '2026-05-04T00:00:00.000Z'],
    ],
    'full-history windows use the bounded historical newest-first planner',
  );

  assert.deepEqual(
    mapAccountImportSpeedsToLichessPerfTypes(['BULLET', 'BLITZ', 'RAPID']),
    ['bullet', 'blitz', 'rapid'],
  );
  const window = { from: requestedFrom, to: new Date(requestedFrom.getTime() + 14 * DAY_MS) };
  const both = buildLichessGamesRequestUrl({
    username: 'Fixture User',
    window,
    scope: { variant: 'STANDARD', speeds: ['BLITZ', 'RAPID'], rated: 'BOTH' },
    mode: 'BOUNDED_INITIAL',
    baseUrl: 'https://example.invalid/api/games/user',
  });
  assert.equal(both.pathname, '/api/games/user/Fixture%20User');
  assert.equal(both.searchParams.get('since'), String(window.from.getTime()));
  assert.equal(both.searchParams.get('until'), String(window.to.getTime() - 1));
  assert.equal(both.searchParams.get('perfType'), 'blitz,rapid');
  assert.equal(both.searchParams.get('finished'), 'true');
  assert.equal(both.searchParams.get('sort'), 'dateDesc');
  assert.equal(both.searchParams.get('pgnInJson'), 'true');
  assert.equal(both.searchParams.get('opening'), 'true');
  assert.equal(both.searchParams.has('rated'), false, 'BOTH intentionally omits the rated filter');

  const rated = buildLichessGamesRequestUrl({
    username: 'FixtureUser',
    window,
    scope: { variant: 'STANDARD', speeds: ['BULLET'], rated: 'RATED' },
    mode: 'INCREMENTAL_FORWARD',
    baseUrl: 'https://example.invalid/api/games/user',
  });
  assert.equal(rated.searchParams.get('perfType'), 'bullet');
  assert.equal(rated.searchParams.get('rated'), 'true');
  assert.equal(rated.searchParams.get('sort'), 'dateAsc');
}

async function streamsFixtureNdjson() {
  const fixture = await readFile(
    new URL('../fixtures/lichess/account-import-window.ndjson', import.meta.url),
    'utf8',
  );
  const games = [];
  for await (const game of readLichessNdjson(new Response(fixture))) games.push(game);
  assert.deepEqual(games.map((game) => game.id), ['fixtureBlitz1', 'fixtureRapid1']);
  const first = normalizeLichessGame(games[0], 'fixtureuser');
  const second = normalizeLichessGame(games[1], 'fixtureuser');
  assert.equal(first.userColor, 'WHITE');
  assert.equal(first.resultForUser, 'WIN');
  assert.equal(first.openingEco, 'C20');
  assert.equal(second.userColor, 'BLACK');
  assert.equal(second.resultForUser, 'DRAW');
}

async function streamsChunkedNdjson() {
  const first = JSON.stringify(providerGame('chunk-1', { speed: 'blitz', perf: 'blitz' }));
  const second = JSON.stringify(providerGame('chunk-2', { speed: 'rapid', perf: 'rapid' }));
  const payload = `${first}\n${second}\n`;
  const bytes = new TextEncoder().encode(payload);
  const response = new Response(new ReadableStream({
    start(controller) {
      controller.enqueue(bytes.slice(0, 17));
      controller.enqueue(bytes.slice(17, 101));
      controller.enqueue(bytes.slice(101));
      controller.close();
    },
  }));
  const games = [];
  for await (const game of readLichessNdjson(response)) games.push(game);
  assert.deepEqual(games.map((game) => game.id), ['chunk-1', 'chunk-2']);
}

async function rejectsMalformedNdjson() {
  const malformed = new Response(`${JSON.stringify(providerGame('good'))}\n{"id":`);
  const ids = [];
  await assert.rejects(async () => {
    for await (const game of readLichessNdjson(malformed)) ids.push(game.id);
  }, LichessNdjsonRecordError);
  assert.deepEqual(ids, ['good'], 'valid records before a malformed tail remain observable to bounded callers');

  const missingRequired = new Response(`${JSON.stringify({ id: 'bad', players: {} })}\n`);
  await assert.rejects(async () => {
    for await (const _game of readLichessNdjson(missingRequired)) {
      assert.fail('malformed provider record must not be yielded');
    }
  }, LichessNdjsonRecordError);
}

async function malformedNdjsonCancelsProviderStream() {
  let cancelled = false;
  const payload = new TextEncoder().encode('{"id":}\n');
  const response = new Response(new ReadableStream({
    start(controller) {
      controller.enqueue(payload);
    },
    cancel() {
      cancelled = true;
    },
  }));
  await assert.rejects(async () => {
    for await (const _game of readLichessNdjson(response)) {
      assert.fail('malformed provider record must not be yielded');
    }
  }, LichessNdjsonRecordError);
  assert.equal(cancelled, true, 'failed parsing cancels the still-open provider response stream');
}

function normalizesProviderGameOnce() {
  const game = providerGame('normalized', {
    rated: false,
    speed: 'rapid',
    perf: 'rapid',
    status: 'outoftime',
    winner: undefined,
    pgn: '[Site "https://lichess.org/normalized"]\n[White "FixtureUser"]\n[Black "Opponent"]\n[WhiteElo "1800"]\n[BlackElo "1900"]\n[Result "1/2-1/2"]\n[TimeControl "600+5"]\n[ECO "C50"]\n[Opening "Italian Game"]',
    players: {
      white: { user: { name: 'FixtureUser' }, rating: 1800 },
      black: { user: { name: 'Opponent' }, rating: 1900 },
    },
  });
  const normalized = normalizeLichessGame(game, 'fixtureuser');
  assert.equal(normalized.providerGameId, 'normalized');
  assert.equal(normalized.providerUrl, 'https://lichess.org/normalized');
  assert.equal(normalized.userColor, 'WHITE');
  assert.equal(normalized.opponentUsername, 'Opponent');
  assert.equal(normalized.resultForUser, 'DRAW');
  assert.equal(normalized.timeControlInitial, 600);
  assert.equal(normalized.timeControlIncrement, 5);
  assert.equal(normalized.openingEco, 'C50');
  assert.equal(normalized.openingName, 'Italian Game');
  assert.equal(getLichessResultForUser(game, 'WHITE'), 'DRAW');

  assert.equal(
    matchesLichessImportScope(game, { variant: 'STANDARD', speeds: ['RAPID'], rated: 'UNRATED' }),
    true,
  );
  assert.equal(
    matchesLichessImportScope(
      providerGame('variant', { variant: 'chess960', speed: 'rapid', perf: 'rapid' }),
      { variant: 'STANDARD', speeds: ['RAPID'], rated: 'BOTH' },
    ),
    false,
  );
}

function configIsBounded() {
  assert.deepEqual(loadLichessAccountImportConfig({}), {
    windowDays: DEFAULT_LICHESS_IMPORT_WINDOW_DAYS,
    databaseWriteBatchSize: DEFAULT_ACCOUNT_IMPORT_DATABASE_WRITE_BATCH_SIZE,
  });
  assert.deepEqual(loadLichessAccountImportConfig({
    LICHESS_IMPORT_WINDOW_DAYS: '7',
    IMPORT_DATABASE_WRITE_BATCH_SIZE: '50',
  }), { windowDays: 7, databaseWriteBatchSize: 50 });
  assert.throws(
    () => loadLichessAccountImportConfig({ IMPORT_DATABASE_WRITE_BATCH_SIZE: '101' }),
    /must not exceed 100/,
  );
}

function providerGame(id, overrides = {}) {
  return {
    id,
    rated: true,
    variant: 'standard',
    speed: 'blitz',
    perf: 'blitz',
    createdAt: Date.parse('2026-07-31T11:55:00.000Z'),
    lastMoveAt: Date.parse('2026-07-31T12:00:00.000Z'),
    status: 'mate',
    winner: 'white',
    players: {
      white: { user: { name: 'FixtureUser' }, rating: 1800 },
      black: { user: { name: 'Opponent' }, rating: 1900 },
    },
    ...overrides,
  };
}

console.log('Bounded Lichess provider tests passed.');
