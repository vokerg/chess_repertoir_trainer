import assert from 'node:assert/strict';
import { LICHESS_GAMES_RATING_GROUPS } from '@chess-trainer/contracts/opening-explorer';
import { TRAP_PILOT_DATASET } from '../../dist/modules/trap-pilot/trap-pilot.data.js';
import { hashTrapPilotEvidence } from '../../dist/modules/trap-pilot/trap-pilot.evidence.js';
import { captureTrapPopulationEvidence } from '../../dist/modules/trap-pilot/trap-pilot.population-evidence.js';

const record = TRAP_PILOT_DATASET.records[1];

{
  let request = null;
  const snapshot = await captureTrapPopulationEvidence({
    record,
    speedPreset: 'BLITZ',
    accessToken: 'fixture-token',
    clock: () => new Date('2026-07-27T12:00:00.000Z'),
    client: {
      async fetchPosition(input) {
        request = input;
        return {
          opening: { eco: 'C50', name: 'Italian Game' },
          games: { total: 100, whiteWins: 40, draws: 20, blackWins: 40 },
          moves: [
            {
              uci: 'f3e5',
              san: 'Nxe5',
              averageRating: 1500,
              games: { total: 25, whiteWins: 8, draws: 4, blackWins: 13 },
              opening: null,
              representativeGame: null,
            },
            {
              uci: 'c2c3',
              san: 'c3',
              averageRating: 1550,
              games: { total: 10, whiteWins: 5, draws: 2, blackWins: 3 },
              opening: null,
              representativeGame: null,
            },
          ],
          topGames: [],
        };
      },
    },
  });

  assert.ok(request);
  assert.equal(request.fen, record.trigger.normalizedFen);
  assert.deepEqual(request.speeds, ['blitz']);
  assert.deepEqual(request.ratings, [...LICHESS_GAMES_RATING_GROUPS]);
  assert.equal(request.movesLimit, 12);
  assert.equal(request.topGamesLimit, 0);
  assert.equal(request.accessToken, 'fixture-token');

  assert.equal(snapshot.profile.speedPreset, 'BLITZ');
  assert.equal(snapshot.profile.ratingTarget, 'ALL');
  assert.deepEqual(snapshot.profile.effectiveSpeeds, ['blitz']);
  assert.deepEqual(snapshot.profile.effectiveRatingGroups, [...LICHESS_GAMES_RATING_GROUPS]);
  assert.equal(snapshot.capturedAt, '2026-07-27T12:00:00.000Z');
  assert.equal(snapshot.games.total, 100);
  assert.equal(snapshot.moves[0].uci, 'f3e5');

  const { payloadHash, ...payload } = snapshot;
  assert.equal(payloadHash, hashTrapPilotEvidence(payload));
}

await assert.rejects(
  () => captureTrapPopulationEvidence({
    record,
    speedPreset: 'BLITZ',
    accessToken: ' ',
    client: { fetchPosition: async () => { throw new Error('must not run'); } },
  }),
  /access token is required/i,
);
