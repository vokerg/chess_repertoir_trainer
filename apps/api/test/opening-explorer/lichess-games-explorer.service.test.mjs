import assert from 'node:assert/strict';
import {
  createLichessGamesExplorerService,
  LichessGamesExplorerUnavailableError,
} from '../../dist/modules/opening-explorer/opening-explorer.service.js';
import {
  lichessGamesRatingGroups,
  lichessGamesSpeeds,
} from '../../dist/modules/opening-explorer/lichess-opening-explorer.client.js';

const now = new Date('2026-07-15T12:00:00.000Z');
const userId = 42;
const accessToken = 'requesting-user-access-token';
const canonicalStartFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const normalizedStartFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -';
const snapshot = {
  opening: null,
  games: { total: 10, whiteWins: 4, draws: 3, blackWins: 3 },
  moves: [],
  topGames: [],
};

function storedCache(overrides = {}) {
  return {
    id: 1,
    positionId: 1,
    normalizedFen: normalizedStartFen,
    source: 'LICHESS_GAMES',
    profileVersion: 1,
    sinceYear: 0,
    untilYear: 2026,
    movesLimit: 12,
    topGamesLimit: 0,
    payload: snapshot,
    fetchedAt: new Date('2026-07-01T12:00:00.000Z'),
    expiresAt: new Date('2026-07-31T12:00:00.000Z'),
    ...overrides,
  };
}

function memoryRepository(initial = null) {
  let row = initial;
  const calls = { find: 0, upsert: 0 };
  return {
    calls,
    repository: {
      async find(_fen, source, profileVersion) {
        calls.find += 1;
        if (!row || row.source !== source || row.profileVersion !== profileVersion) return null;
        return row;
      },
      async upsert(input) {
        calls.upsert += 1;
        row = storedCache({
          normalizedFen: input.normalizedFen,
          source: input.source,
          profileVersion: input.profileVersion,
          sinceYear: input.sinceYear,
          untilYear: input.untilYear,
          movesLimit: input.movesLimit,
          topGamesLimit: input.topGamesLimit,
          payload: input.payload,
          fetchedAt: input.fetchedAt,
          expiresAt: input.expiresAt,
        });
        return row;
      },
    },
  };
}

const accessTokenProvider = {
  async getForUser(requestingUserId) {
    assert.equal(requestingUserId, userId);
    return accessToken;
  },
};

{
  const memory = memoryRepository();
  let upstreamCalls = 0;
  const service = createLichessGamesExplorerService({
    repository: memory.repository,
    client: {
      async fetchPosition(input) {
        upstreamCalls += 1;
        assert.deepEqual(input, {
          fen: canonicalStartFen,
          sinceMonth: undefined,
          untilMonth: undefined,
          ratings: [...lichessGamesRatingGroups].sort((left, right) => String(left).localeCompare(String(right))),
          speeds: [...lichessGamesSpeeds].sort(),
          movesLimit: 12,
          topGamesLimit: 0,
          accessToken,
        });
        return snapshot;
      },
    },
    accessTokenProvider,
    clock: () => new Date(now),
  });

  const first = await service.getPosition('startpos', userId);
  assert.equal(first.cache.status, 'REFRESHED');
  assert.equal(first.dataset.source, 'LICHESS_GAMES');
  assert.equal(first.dataset.sinceYear, 0);
  assert.equal(first.dataset.topGamesLimit, 0);
  assert.equal(memory.calls.upsert, 1);

  const second = await service.getPosition('startpos', userId);
  assert.equal(second.cache.status, 'HIT');
  assert.equal(upstreamCalls, 1, 'fresh population cache avoids another Lichess request');
}

{
  const memory = memoryRepository(storedCache());
  let accessTokenCalls = 0;
  const service = createLichessGamesExplorerService({
    repository: memory.repository,
    client: { async fetchPosition() { throw new Error('fresh cache must not refresh'); } },
    accessTokenProvider: {
      async getForUser() {
        accessTokenCalls += 1;
        throw new Error('fresh cache must not load credentials');
      },
    },
    clock: () => new Date(now),
  });

  const response = await service.getPosition('startpos', userId);
  assert.equal(response.cache.status, 'HIT');
  assert.equal(accessTokenCalls, 0);
}

{
  const stale = storedCache({ expiresAt: new Date('2026-06-01T12:00:00.000Z') });
  const memory = memoryRepository(stale);
  const service = createLichessGamesExplorerService({
    repository: memory.repository,
    client: { async fetchPosition() { throw new Error('upstream unavailable'); } },
    accessTokenProvider,
    clock: () => new Date(now),
  });

  const response = await service.getPosition('startpos', userId);
  assert.equal(response.cache.status, 'STALE');
  assert.equal(response.dataset.source, 'LICHESS_GAMES');
}

{
  const memory = memoryRepository();
  const service = createLichessGamesExplorerService({
    repository: memory.repository,
    client: { async fetchPosition() { throw new Error('upstream unavailable'); } },
    accessTokenProvider,
    clock: () => new Date(now),
  });

  await assert.rejects(
    service.getPosition('startpos', userId),
    (error) => error instanceof LichessGamesExplorerUnavailableError,
  );
}

{
  const memory = memoryRepository();
  let resolveFetch;
  let upstreamCalls = 0;
  const pendingFetch = new Promise((resolve) => { resolveFetch = resolve; });
  const service = createLichessGamesExplorerService({
    repository: memory.repository,
    client: {
      async fetchPosition() {
        upstreamCalls += 1;
        return pendingFetch;
      },
    },
    accessTokenProvider,
    clock: () => new Date(now),
  });

  const first = service.getPosition('startpos', userId);
  const second = service.getPosition('startpos', userId);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(upstreamCalls, 1, 'concurrent population misses share one upstream request');
  resolveFetch(snapshot);
  const [firstResponse, secondResponse] = await Promise.all([first, second]);
  assert.equal(firstResponse.cache.status, 'REFRESHED');
  assert.deepEqual(secondResponse, firstResponse);
}

console.log('Lichess games explorer service tests passed.');
