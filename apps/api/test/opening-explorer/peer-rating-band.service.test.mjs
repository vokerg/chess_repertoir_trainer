import assert from 'node:assert/strict';
import {
  buildPeerResolution,
  createPeerRatingBandResolver,
  PEER_RATING_DOMINANT_COVERAGE,
  PEER_RATING_MAX_BANDS,
  PEER_RATING_RESOLVER_POLICY_VERSION,
  selectDominantGroups,
} from '../../dist/modules/opening-explorer/peer-rating-band.service.js';

assert.equal(PEER_RATING_DOMINANT_COVERAGE, 0.7);
assert.equal(PEER_RATING_MAX_BANDS, 3);
assert.equal(PEER_RATING_RESOLVER_POLICY_VERSION, 'dominant-contiguous-window-v1');

assert.deepEqual(
  selectDominantGroups([0, 10, 60, 20, 10, 0, 0, 0, 0]),
  [1200, 1400],
  'the shortest adjacent interval covering at least 70% wins',
);
assert.deepEqual(
  selectDominantGroups([0, 50, 0, 0, 0, 45, 0, 0, 0]),
  [1000],
  'widely separated equal populations do not stretch one peer band across empty groups',
);
assert.deepEqual(
  selectDominantGroups([0, 0, 0, 0, 0, 0, 0, 0, 0]),
  [1400],
  'an empty distribution uses the documented generic fallback',
);

{
  const resolution = buildPeerResolution([
    { accountId: 1, provider: 'LICHESS', username: 'lichess-user', speed: 'blitz', rating: 1650, games: 6 },
    { accountId: 2, provider: 'CHESS_COM', username: 'chesscom-user', speed: 'blitz', rating: 1300, games: 4 },
    { accountId: 2, provider: 'CHESS_COM', username: 'chesscom-user', speed: 'rapid', rating: 1800, games: 2 },
  ], 'RECENT_THREE_MONTHS');

  assert.equal(resolution.evidencePeriod, 'RECENT_THREE_MONTHS');
  assert.equal(resolution.eligibleGames, 12);
  assert.deepEqual(resolution.selectedGroups, [1600]);
  assert.equal(resolution.distribution.find((item) => item.group === 1600)?.games, 10);
  assert.equal(resolution.distribution.find((item) => item.group === 2000)?.games, 2);
  assert.deepEqual(resolution.contributions.map((item) => item.games), [6, 4, 2]);
  assert.equal(resolution.normalizationProfile.version, '2026-07-lichess-bands-v1');
}

{
  const calls = [];
  const resolver = createPeerRatingBandResolver({
    repository: {
      async list(input) {
        calls.push(input);
        if (input.from) return [];
        return [{
          accountId: 7,
          provider: 'CHESS_COM',
          username: 'history-user',
          speed: 'rapid',
          rating: 1510,
          games: 8,
        }];
      },
    },
    clock: () => new Date('2026-07-26T12:00:00.000Z'),
  });

  const resolution = await resolver.resolve(42, 'BLITZ_AND_SLOWER');
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0].speeds, ['blitz', 'rapid']);
  assert.equal(calls[0].from.toISOString(), '2026-04-26T12:00:00.000Z');
  assert.equal(calls[1].from, undefined);
  assert.equal(resolution.evidencePeriod, 'ALL_HISTORY');
  assert.deepEqual(resolution.selectedGroups, [1800]);
}

{
  const resolver = createPeerRatingBandResolver({
    repository: { async list() { return []; } },
    clock: () => new Date('2026-07-26T12:00:00.000Z'),
  });

  const resolution = await resolver.resolve(42, 'BULLET');
  assert.equal(resolution.evidencePeriod, 'GENERIC_FALLBACK');
  assert.equal(resolution.eligibleGames, 0);
  assert.deepEqual(resolution.selectedGroups, [1400]);
  assert.deepEqual(resolution.contributions, []);
}

console.log('Peer rating band resolver tests passed.');