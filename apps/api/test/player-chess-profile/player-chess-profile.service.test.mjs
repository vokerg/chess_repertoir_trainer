import assert from 'node:assert/strict';
import {
  createPlayerChessProfileService,
  playerChessProfileAnalysisEvidenceStrength,
  playerChessProfileEvidenceStrength,
  resolvePlayerChessProfileRange,
} from '../../dist/modules/player-chess-profile/player-chess-profile.service.js';

assert.deepEqual(
  resolvePlayerChessProfileRange({}, new Date('2026-07-27T16:00:00.000Z')),
  {
    from: '2026-04-27',
    to: '2026-07-27',
    fromDate: new Date('2026-04-27T00:00:00.000Z'),
    toExclusive: new Date('2026-07-28T00:00:00.000Z'),
  },
);
assert.equal(playerChessProfileEvidenceStrength(4), 'INSUFFICIENT');
assert.equal(playerChessProfileEvidenceStrength(5), 'LOW');
assert.equal(playerChessProfileEvidenceStrength(15), 'MEDIUM');
assert.equal(playerChessProfileEvidenceStrength(40), 'HIGH');
assert.equal(playerChessProfileAnalysisEvidenceStrength(20, 9), 'INSUFFICIENT');
assert.equal(playerChessProfileAnalysisEvidenceStrength(20, 10), 'LOW');

const peerLevel = {
  evidencePeriod: 'RECENT_THREE_MONTHS',
  eligibleGames: 30,
  selectedGroups: [1400],
  distribution: [
    { group: 0, games: 0 },
    { group: 1000, games: 0 },
    { group: 1200, games: 5 },
    { group: 1400, games: 25 },
    { group: 1600, games: 0 },
    { group: 1800, games: 0 },
    { group: 2000, games: 0 },
    { group: 2200, games: 0 },
    { group: 2500, games: 0 },
  ],
  contributions: [],
  normalizationProfile: { id: 'universal-online-strength', version: '2026-07-lichess-bands-v1' },
  resolverPolicyVersion: 'dominant-contiguous-window-v1',
};

const repositoryResult = {
  aggregate: {
    totalGames: 30,
    indexedGames: 29,
    analysedGames: 24,
    namedOpeningGames: 30,
    wins: 15,
    draws: 5,
    losses: 10,
    openingPositiveGames: 10,
    openingTroubleGames: 6,
    earlyMistakeGames: 4,
    accuracyGames: 20,
    averageAccuracy: 78,
  },
  openingGroups: [
    {
      openingEco: 'B20',
      openingName: 'Sharp line',
      userColor: 'WHITE',
      games: 20,
      analysedGames: 16,
      wins: 12,
      draws: 4,
      losses: 4,
      openingPositiveGames: 8,
      openingTroubleGames: 2,
      earlyMistakeGames: 2,
      accuracyGames: 15,
      averageAccuracy: 82,
    },
    {
      openingEco: 'D00',
      openingName: 'Solid line',
      userColor: 'BLACK',
      games: 10,
      analysedGames: 8,
      wins: 3,
      draws: 1,
      losses: 6,
      openingPositiveGames: 2,
      openingTroubleGames: 4,
      earlyMistakeGames: 2,
      accuracyGames: 5,
      averageAccuracy: 66,
    },
  ],
  openingGroupsTruncated: false,
  supportingGames: [{
    id: 7,
    provider: 'LICHESS',
    providerUrl: null,
    endedAt: new Date('2026-07-20T12:00:00.000Z'),
    speedCategory: 'blitz',
    userColor: 'WHITE',
    resultForUser: 'WIN',
    openingEco: 'B20',
    openingName: 'Sharp line',
    userRating: 1450,
    opponentRating: 1460,
    analysisStatus: 'COMPLETED',
    accuracy: 84.04,
  }],
};

let capturedRepositoryInput = null;
const service = createPlayerChessProfileService({
  repository: {
    async load(input) {
      capturedRepositoryInput = input;
      return repositoryResult;
    },
  },
  peerResolver: { async resolve() { return peerLevel; } },
  classifyOpening(row) {
    const sharp = row.openingName === 'Sharp line';
    return {
      version: 'test-rules-v1',
      source: 'STORED_NAME_ECO',
      side: row.userColor,
      soundness: sharp ? 'PLAYABLE' : 'SOUND',
      character: [sharp ? 'SHARP' : 'SOLID'],
      theoreticalStatus: sharp ? 'SIDELINE' : 'MAINLINE',
      theoryBurden: sharp ? 'HIGH' : 'LOW',
      roles: [sharp ? 'INITIATOR' : 'RESPONDER'],
      confidence: 'HIGH',
      matchedRuleIds: [sharp ? 'sharp-rule' : 'solid-rule'],
    };
  },
  clock: () => new Date('2026-07-27T12:00:00.000Z'),
});

const response = await service.get(1, {
  accountIds: [4, 2, 4],
  speedPreset: 'BLITZ',
  colors: ['WHITE', 'BLACK'],
  rated: true,
  supportingGamesLimit: 5,
});

assert.deepEqual(response.filters.accountIds, [2, 4]);
assert.deepEqual(response.filters.speeds, ['blitz']);
assert.equal(capturedRepositoryInput.query.to.toISOString(), '2026-07-27T23:59:59.999Z');
assert.deepEqual(capturedRepositoryInput.query.speedCategory, ['blitz']);
assert.deepEqual(response.baseline.wdl, { wins: 15, draws: 5, losses: 10 });
assert.equal(response.baseline.scorePercent, 58.3);
assert.equal(response.coverage.analysisPercent, 80);
assert.equal(response.coverage.classifiedOpeningGames, 30);

const sharpPreference = response.preference.items.find(
  (item) => item.dimension === 'CHARACTER' && item.value === 'SHARP',
);
assert.equal(sharpPreference.games, 20);
assert.equal(sharpPreference.exposurePercent, 66.7);

const sharpPerformance = response.performance.items.find(
  (item) => item.dimension === 'CHARACTER' && item.value === 'SHARP',
);
assert.equal(sharpPerformance.scorePercent, 70);
assert.equal(sharpPerformance.scoreDelta, 11.7);
assert.equal(sharpPerformance.analysisEvidenceStrength, 'MEDIUM');

const solidPerformance = response.performance.items.find(
  (item) => item.dimension === 'CHARACTER' && item.value === 'SOLID',
);
assert.equal(solidPerformance.scorePercent, 35);
assert.equal(solidPerformance.scoreDelta, -23.3);
assert.equal(solidPerformance.analysisEvidenceStrength, 'LOW');

assert.equal(response.conclusions.some((item) => item.code === 'PREFERENCE'), true);
assert.equal(response.conclusions.some((item) => item.code === 'PERFORMS_BETTER'), true);
assert.equal(response.conclusions.some((item) => item.code === 'PERFORMS_WORSE'), true);
assert.equal(response.conclusions.some((item) => item.code === 'OPENING_TROUBLE'), true);
assert.equal(response.supportingGames[0].accuracy, 84);

const emptyService = createPlayerChessProfileService({
  repository: {
    async load() {
      return {
        aggregate: {
          totalGames: 0,
          indexedGames: 0,
          analysedGames: 0,
          namedOpeningGames: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          openingPositiveGames: 0,
          openingTroubleGames: 0,
          earlyMistakeGames: 0,
          accuracyGames: 0,
          averageAccuracy: null,
        },
        openingGroups: [],
        openingGroupsTruncated: false,
        supportingGames: [],
      };
    },
  },
  peerResolver: { async resolve() { return peerLevel; } },
  clock: () => new Date('2026-07-27T12:00:00.000Z'),
});
const empty = await emptyService.get(1, {
  speedPreset: 'BLITZ_AND_SLOWER',
  colors: ['WHITE', 'BLACK'],
  rated: true,
  supportingGamesLimit: 5,
});
assert.equal(empty.baseline.scorePercent, null);
assert.deepEqual(empty.preference.items, []);
assert.equal(empty.conclusions[0].code, 'INSUFFICIENT_DATA');

console.log('Player chess profile service tests passed.');
