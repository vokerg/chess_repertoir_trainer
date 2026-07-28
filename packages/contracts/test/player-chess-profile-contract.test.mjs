import assert from 'node:assert/strict';
import {
  playerChessProfileQuerySchema,
  playerChessProfileResponseSchema,
} from '../dist/player-chess-profile/index.js';

assert.deepEqual(playerChessProfileQuerySchema.parse({
  accountIds: '3,1,3',
  from: '2026-04-01',
  to: '2026-07-01',
  speedPreset: 'BLITZ',
  colors: 'WHITE',
  rated: 'false',
  minOpponentRating: '1200',
  supportingGamesLimit: '3',
}), {
  accountIds: [3, 1, 3],
  from: '2026-04-01',
  to: '2026-07-01',
  speedPreset: 'BLITZ',
  colors: ['WHITE'],
  rated: false,
  minOpponentRating: 1200,
  supportingGamesLimit: 3,
});

assert.deepEqual(playerChessProfileQuerySchema.parse({}), {
  speedPreset: 'BLITZ_AND_SLOWER',
  colors: ['WHITE', 'BLACK'],
  rated: true,
  supportingGamesLimit: 5,
});
assert.equal(
  playerChessProfileQuerySchema.safeParse({ from: '2026-07-02', to: '2026-07-01' }).success,
  false,
);
assert.equal(
  playerChessProfileQuerySchema.safeParse({ minUserRating: '1600', maxUserRating: '1200' }).success,
  false,
);

const peerLevel = {
  evidencePeriod: 'RECENT_THREE_MONTHS',
  eligibleGames: 20,
  selectedGroups: [1400],
  distribution: [
    { group: 0, games: 0 },
    { group: 1000, games: 0 },
    { group: 1200, games: 5 },
    { group: 1400, games: 15 },
    { group: 1600, games: 0 },
    { group: 1800, games: 0 },
    { group: 2000, games: 0 },
    { group: 2200, games: 0 },
    { group: 2500, games: 0 },
  ],
  contributions: [{
    accountId: 1,
    provider: 'LICHESS',
    username: 'player',
    speed: 'blitz',
    games: 20,
  }],
  normalizationProfile: { id: 'universal-online-strength', version: '2026-07-lichess-bands-v1' },
  resolverPolicyVersion: 'dominant-contiguous-window-v1',
};

const response = {
  generatedAt: '2026-07-27T12:00:00.000Z',
  filters: {
    accountIds: [1],
    range: { from: '2026-04-27', to: '2026-07-27' },
    speedPreset: 'BLITZ',
    speeds: ['blitz'],
    colors: ['WHITE'],
    rated: true,
  },
  peerLevel,
  classificationVersion: '2026-07-rules-v2',
  coverage: {
    totalGames: 20,
    indexedGames: 18,
    analysedGames: 15,
    analysisPercent: 75,
    namedOpeningGames: 20,
    profiledOpeningGames: 20,
    omittedOpeningGames: 0,
    classifiedOpeningGames: 20,
    lowConfidenceOpeningGames: 0,
    unknownDimensionOpeningGames: 0,
    openingGroupLimit: 100,
    openingGroupsTruncated: false,
  },
  baseline: {
    games: 20,
    analysedGames: 15,
    accuracyGames: 14,
    wdl: { wins: 10, draws: 4, losses: 6 },
    scorePercent: 60,
    openingPositiveRate: 40,
    openingTroubleRate: 20,
    earlyMistakeRate: 13.3,
    averageAccuracy: 78.2,
  },
  preference: {
    items: [{
      dimension: 'CHARACTER',
      value: 'SHARP',
      games: 12,
      exposurePercent: 60,
      confidenceGames: { high: 12, medium: 0, low: 0 },
      supportingOpenings: [{ eco: 'B20', name: 'Sicilian Defense', userColor: 'WHITE', games: 12 }],
    }],
  },
  performance: {
    items: [{
      dimension: 'CHARACTER',
      value: 'SHARP',
      games: 12,
      analysedGames: 10,
      accuracyGames: 9,
      wdl: { wins: 7, draws: 2, losses: 3 },
      scorePercent: 66.7,
      baselineScorePercent: 60,
      scoreDelta: 6.7,
      openingPositiveRate: 50,
      openingTroubleRate: 10,
      earlyMistakeRate: 10,
      averageAccuracy: 81.2,
      resultEvidenceStrength: 'LOW',
      analysisEvidenceStrength: 'LOW',
      supportingOpenings: [{ eco: 'B20', name: 'Sicilian Defense', userColor: 'WHITE', games: 12 }],
    }],
  },
  openingGroups: [{
    eco: 'B20',
    name: 'Sicilian Defense',
    userColor: 'WHITE',
    games: 12,
    analysedGames: 10,
    accuracyGames: 9,
    wdl: { wins: 7, draws: 2, losses: 3 },
    scorePercent: 66.7,
    openingPositiveRate: 50,
    openingTroubleRate: 10,
    earlyMistakeRate: 10,
    averageAccuracy: 81.2,
    classification: {
      version: '2026-07-rules-v2',
      source: 'GENERATED_BOOK',
      side: 'WHITE',
      soundness: 'SOUND',
      character: ['SHARP', 'TACTICAL'],
      theoreticalStatus: 'MAINLINE',
      theoryBurden: 'HIGH',
      roles: ['INITIATOR'],
      confidence: 'HIGH',
      matchedRuleIds: ['family-sicilian'],
    },
  }],
  conclusions: [{
    code: 'PERFORMS_BETTER',
    dimension: 'CHARACTER',
    value: 'SHARP',
    metric: 'SCORE_PERCENT',
    sampleSize: 12,
    metricValue: 66.7,
    baselineValue: 60,
    delta: 6.7,
    evidenceStrength: 'LOW',
    summary: 'In the selected games, SHARP positions scored 6.7 percentage points above the selected-game baseline.',
  }],
  supportingGames: [{
    id: 42,
    provider: 'LICHESS',
    providerUrl: 'https://lichess.org/example',
    endedAt: '2026-07-20T12:00:00.000Z',
    speedCategory: 'blitz',
    userColor: 'WHITE',
    resultForUser: 'WIN',
    openingEco: 'B20',
    openingName: 'Sicilian Defense',
    userRating: 1450,
    opponentRating: 1420,
    analysisStatus: 'COMPLETED',
    accuracy: 84.1,
  }],
};

assert.deepEqual(playerChessProfileResponseSchema.parse(response), response);
assert.equal(
  playerChessProfileResponseSchema.safeParse({ ...response, generatedAt: 'not-a-date' }).success,
  false,
);

console.log('Player chess profile contract tests passed.');
