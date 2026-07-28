import assert from 'node:assert/strict';
import {
  createLichessGamesExplorerService,
  LichessGamesExplorerUnavailableError,
  resolveLichessGamesPopulation,
} from '../../dist/modules/opening-explorer/opening-explorer.service.js';

const now = new Date('2026-07-15T12:00:00.000Z');
const userId = 42;
const accessToken = 'requesting-user-access-token';
const canonicalStartFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const normalizedStartFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -';
const defaultProfileKey = '||1400,1600|blitz,classical,correspondence,rapid';
const defaultProfileVersion = stableProfileVersion(defaultProfileKey);
const snapshot = {
  opening: null,
  games: { total: 10, whiteWins: 4, draws: 3, blackWins: 3 },
  moves: [],
  topGames: [],
};

function peerResolution(selectedGroups = [1400], evidencePeriod = 'RECENT_THREE_MONTHS') {
  return {
    evidencePeriod,
    eligibleGames: evidencePeriod === 'GENERIC_FALLBACK' ? 0 : 12,
    selectedGroups,
    distribution: [0, 1000, 1200, 1400, 1600, 1800, 2000, 2200, 2500].map((group) => ({
      group,
      games: selectedGroups.includes(group) ? 12 : 0,
    })),
    contributions: evidencePeriod === 'GENERIC_FALLBACK' ? [] : [{
      accountId: 1,
      provider: 'LICHESS',
      username: 'player',
      speed: 'blitz',
      games: 12,
    }],
    normalizationProfile: {
      id: 'universal-online-strength',
      version: '2026-07-lichess-bands-v1',
    },
    resolverPolicyVersion: 'dominant-contiguous-window-v1',
  };
}

function fakePeerResolver(selectedGroups = [1400], evidencePeriod = 'RECENT_THREE_MONTHS') {
  const calls = [];
  return {
    calls,
    resolver: {
      async resolve(requestingUserId, speedPreset) {
        calls.push({ requestingUserId, speedPreset });
        return peerResolution(selectedGroups, evidencePeriod);
      },
    },
  };
}

function storedCache(overrides = {}) {
  return {
    id: 1,
    positionId: 1,
    normalizedFen: normalizedStartFen,
    source: 'LICHESS_GAMES',
    profileVersion: defaultProfileVersion,
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
  const peers = fakePeerResolver();
  let upstreamCalls = 0;
  const service = createLichessGamesExplorerService({
    repository: memory.repository,
    peerResolver: peers.resolver,
    client: {
      async fetchPosition(input) {
        upstreamCalls += 1;
        assert.deepEqual(input, {
          fen: canonicalStartFen,
          sinceMonth: undefined,
          untilMonth: undefined,
          ratings: [1400, 1600],
          speeds: ['blitz', 'classical', 'correspondence', 'rapid'],
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
  assert.equal(first.dataset.profileVersion, defaultProfileVersion);
  assert.equal(first.dataset.sinceYear, 0);
  assert.equal(first.dataset.topGamesLimit, 0);
  assert.deepEqual(first.population.requested, {
    speedPreset: 'BLITZ_AND_SLOWER',
    ratingTarget: 'MY_PEERS_PLUS_ONE',
    ratingGroup: null,
  });
  assert.deepEqual(first.population.effective, {
    speeds: ['blitz', 'classical', 'correspondence', 'rapid'],
    ratingGroups: [1400, 1600],
  });
  assert.equal(first.population.peerResolution.evidencePeriod, 'RECENT_THREE_MONTHS');
  assert.equal(memory.calls.upsert, 1);
  assert.deepEqual(peers.calls, [{ requestingUserId: userId, speedPreset: 'BLITZ_AND_SLOWER' }]);

  const second = await service.getPosition('startpos', userId);
  assert.equal(second.cache.status, 'HIT');
  assert.equal(upstreamCalls, 1, 'fresh population cache avoids another Lichess request');
  assert.equal(peers.calls.length, 2, 'peer evidence is resolved per authenticated request');
}

{
  const memory = memoryRepository(storedCache());
  const peers = fakePeerResolver();
  let accessTokenCalls = 0;
  const service = createLichessGamesExplorerService({
    repository: memory.repository,
    peerResolver: peers.resolver,
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
  assert.equal(response.population.peerResolution.normalizationProfile.version, '2026-07-lichess-bands-v1');
}

{
  const stale = storedCache({ expiresAt: new Date('2026-06-01T12:00:00.000Z') });
  const memory = memoryRepository(stale);
  const peers = fakePeerResolver();
  const service = createLichessGamesExplorerService({
    repository: memory.repository,
    peerResolver: peers.resolver,
    client: { async fetchPosition() { throw new Error('upstream unavailable'); } },
    accessTokenProvider,
    clock: () => new Date(now),
  });

  const response = await service.getPosition('startpos', userId);
  assert.equal(response.cache.status, 'STALE');
  assert.equal(response.dataset.source, 'LICHESS_GAMES');
  assert.deepEqual(response.population.effective.ratingGroups, [1400, 1600]);
}

{
  const memory = memoryRepository();
  const peers = fakePeerResolver();
  const service = createLichessGamesExplorerService({
    repository: memory.repository,
    peerResolver: peers.resolver,
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
  const peers = fakePeerResolver();
  let resolveFetch;
  let upstreamCalls = 0;
  const pendingFetch = new Promise((resolve) => { resolveFetch = resolve; });
  const service = createLichessGamesExplorerService({
    repository: memory.repository,
    peerResolver: peers.resolver,
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

{
  let peerCalls = 0;
  const population = await resolveLichessGamesPopulation({
    fen: 'startpos',
    speedPreset: 'BULLET',
    ratingTarget: 'GROUP',
    ratingGroup: 1800,
  }, userId, {
    async resolve() {
      peerCalls += 1;
      return peerResolution();
    },
  });

  assert.equal(peerCalls, 0, 'explicit groups do not need personal peer evidence');
  assert.deepEqual(population, {
    requested: { speedPreset: 'BULLET', ratingTarget: 'GROUP', ratingGroup: 1800 },
    effective: { speeds: ['bullet'], ratingGroups: [1800] },
    peerResolution: null,
  });
}

{
  const population = await resolveLichessGamesPopulation({
    fen: 'startpos',
    speedPreset: 'ALL',
    ratingTarget: 'MY_PEERS_PLUS_ONE',
  }, userId, fakePeerResolver([2500]).resolver);

  assert.deepEqual(population.effective.ratingGroups, [2500], 'top peer band has no higher group');
  assert.deepEqual(population.effective.speeds, ['blitz', 'bullet', 'classical', 'correspondence', 'rapid']);
}

function stableProfileVersion(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 1) + 1;
}

console.log('Lichess games explorer service tests passed.');