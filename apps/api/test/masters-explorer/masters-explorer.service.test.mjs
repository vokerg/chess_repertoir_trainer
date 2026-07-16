import assert from 'node:assert/strict';
import {
  createMastersExplorerService,
  InvalidMastersExplorerFenError,
  MastersExplorerUnavailableError,
} from '../../dist/modules/masters-explorer/masters-explorer.service.js';

const now = new Date('2026-07-15T12:00:00.000Z');
const userId = 42;
const accessToken = 'requesting-user-access-token';
const testAccessTokenProvider = {
  async getForUser(requestingUserId) {
    assert.equal(requestingUserId, userId);
    return accessToken;
  },
};
const canonicalStartFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const normalizedStartFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -';
const emptySnapshot = {
  opening: null,
  games: { total: 0, whiteWins: 0, draws: 0, blackWins: 0 },
  moves: [],
  topGames: [],
};
const populatedSnapshot = {
  opening: { eco: 'B00', name: "King's Pawn Game" },
  games: { total: 10, whiteWins: 4, draws: 3, blackWins: 3 },
  moves: [{
    uci: 'e2e4',
    san: 'e4',
    averageRating: 2500,
    games: { total: 6, whiteWins: 3, draws: 2, blackWins: 1 },
    opening: { eco: 'B00', name: "King's Pawn Game" },
    representativeGame: null,
  }],
  topGames: [],
};

function storedCache(overrides = {}) {
  return {
    id: 1,
    positionId: 1,
    normalizedFen: normalizedStartFen,
    source: 'LICHESS_MASTERS',
    profileVersion: 1,
    sinceYear: 2000,
    untilYear: 2026,
    movesLimit: 12,
    topGamesLimit: 15,
    payload: populatedSnapshot,
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
      async find() {
        calls.find += 1;
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

{
  const memory = memoryRepository();
  let upstreamCalls = 0;
  const service = createMastersExplorerService({
    repository: memory.repository,
    client: {
      async fetchPosition(input) {
        upstreamCalls += 1;
        assert.equal(input.fen, canonicalStartFen);
        assert.deepEqual(input, {
          fen: canonicalStartFen,
          sinceYear: 2000,
          untilYear: 2026,
          movesLimit: 12,
          topGamesLimit: 15,
          accessToken,
        });
        return emptySnapshot;
      },
    },
    accessTokenProvider: testAccessTokenProvider,
    clock: () => new Date(now),
  });

  const first = await service.getPosition('startpos', userId);
  assert.equal(first.cache.status, 'REFRESHED');
  assert.equal(first.normalizedFen, normalizedStartFen);
  assert.deepEqual(first.games, emptySnapshot.games);
  assert.equal(upstreamCalls, 1);
  assert.equal(memory.calls.upsert, 1);

  const second = await service.getPosition('startpos', userId);
  assert.equal(second.cache.status, 'HIT');
  assert.equal(upstreamCalls, 1, 'fresh system cache avoids another Lichess request');
}

{
  const memory = memoryRepository(storedCache());
  let accessTokenCalls = 0;
  const service = createMastersExplorerService({
    repository: memory.repository,
    client: {
      async fetchPosition() {
        throw new Error('a fresh cache must not call Lichess');
      },
    },
    accessTokenProvider: {
      async getForUser() {
        accessTokenCalls += 1;
        throw new Error('a fresh cache must not load user credentials');
      },
    },
    clock: () => new Date(now),
  });

  const response = await service.getPosition('startpos', userId);
  assert.equal(response.cache.status, 'HIT');
  assert.equal(accessTokenCalls, 0, 'shared cache hits do not require a Lichess connection');
}

{
  const memory = memoryRepository(storedCache({
    expiresAt: new Date('2026-07-14T12:00:00.000Z'),
  }));
  let upstreamCalls = 0;
  const service = createMastersExplorerService({
    repository: memory.repository,
    client: {
      async fetchPosition() {
        upstreamCalls += 1;
        return emptySnapshot;
      },
    },
    accessTokenProvider: testAccessTokenProvider,
    clock: () => new Date(now),
  });

  const response = await service.getPosition('startpos', userId);
  assert.equal(response.cache.status, 'REFRESHED');
  assert.equal(upstreamCalls, 1);
  assert.equal(memory.calls.upsert, 1);
}

{
  const memory = memoryRepository(storedCache({ untilYear: 2025 }));
  let upstreamCalls = 0;
  const service = createMastersExplorerService({
    repository: memory.repository,
    client: {
      async fetchPosition() {
        upstreamCalls += 1;
        return populatedSnapshot;
      },
    },
    accessTokenProvider: testAccessTokenProvider,
    clock: () => new Date(now),
  });

  const response = await service.getPosition('startpos', userId);
  assert.equal(response.cache.status, 'REFRESHED');
  assert.equal(response.dataset.untilYear, 2026);
  assert.equal(upstreamCalls, 1);
}

{
  const stale = storedCache({ expiresAt: new Date('2026-06-01T12:00:00.000Z') });
  const memory = memoryRepository(stale);
  const service = createMastersExplorerService({
    repository: memory.repository,
    client: {
      async fetchPosition() {
        throw new Error('missing credentials must fail before calling Lichess');
      },
    },
    accessTokenProvider: {
      async getForUser() {
        throw new Error('requesting user has no active Lichess connection');
      },
    },
    clock: () => new Date(now),
  });

  const response = await service.getPosition('startpos', userId);
  assert.equal(response.cache.status, 'STALE');
  assert.equal(response.cache.fetchedAt, stale.fetchedAt.toISOString());
  assert.deepEqual(response.games, populatedSnapshot.games);
}

{
  const memory = memoryRepository();
  const service = createMastersExplorerService({
    repository: memory.repository,
    client: {
      async fetchPosition() {
        throw new Error('upstream unavailable');
      },
    },
    accessTokenProvider: testAccessTokenProvider,
    clock: () => new Date(now),
  });

  await assert.rejects(
    service.getPosition('startpos', userId),
    (error) => error instanceof MastersExplorerUnavailableError,
  );
}

{
  const memory = memoryRepository();
  const service = createMastersExplorerService({
    repository: memory.repository,
    client: { async fetchPosition() { return populatedSnapshot; } },
    accessTokenProvider: testAccessTokenProvider,
    clock: () => new Date(now),
  });

  await assert.rejects(
    service.getPosition('not-a-fen', userId),
    (error) => error instanceof InvalidMastersExplorerFenError,
  );
  assert.equal(memory.calls.find, 0, 'invalid FEN fails before cache access');
}

{
  const memory = memoryRepository();
  let resolveFetch;
  let upstreamCalls = 0;
  const pendingFetch = new Promise((resolve) => { resolveFetch = resolve; });
  const service = createMastersExplorerService({
    repository: memory.repository,
    client: {
      async fetchPosition() {
        upstreamCalls += 1;
        return pendingFetch;
      },
    },
    accessTokenProvider: testAccessTokenProvider,
    clock: () => new Date(now),
  });

  const first = service.getPosition('startpos', userId);
  const second = service.getPosition('startpos', userId);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(upstreamCalls, 1, 'concurrent misses share one upstream request');
  resolveFetch(populatedSnapshot);
  const [firstResponse, secondResponse] = await Promise.all([first, second]);
  assert.equal(firstResponse.cache.status, 'REFRESHED');
  assert.deepEqual(secondResponse, firstResponse);
}

console.log('Masters explorer service tests passed.');
