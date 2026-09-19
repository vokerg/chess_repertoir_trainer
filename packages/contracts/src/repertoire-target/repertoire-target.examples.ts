import type { LichessGamesPeerResolution } from '../opening-explorer';
import {
  resolveRepertoireTargetPopulation,
  type RepertoireTarget,
  type RepertoireTargetCoverage,
  type RepertoireTargetObjective,
} from './repertoire-target.schemas';

export const repertoireTargetPeerResolutionExample: LichessGamesPeerResolution = {
  evidencePeriod: 'RECENT_THREE_MONTHS',
  eligibleGames: 120,
  selectedGroups: [1400, 1600],
  distribution: [
    { group: 1200, games: 10 },
    { group: 1400, games: 60 },
    { group: 1600, games: 50 },
  ],
  contributions: [
    {
      accountId: 1,
      provider: 'LICHESS',
      username: 'example-player',
      speed: 'blitz',
      games: 120,
    },
  ],
  normalizationProfile: {
    id: 'universal-online-strength',
    version: '2026-07-lichess-bands-v1',
  },
  resolverPolicyVersion: 'dominant-contiguous-window-v1',
};

const balancedObjective: RepertoireTargetObjective = {
  persona: 'BALANCED',
  preferredCharacters: ['BALANCED', 'DYNAMIC'],
  minimumSoundness: 'PLAYABLE',
  riskTolerance: 'MEDIUM',
  allowDeliberatelyDubious: false,
  maximumTheoryBurden: 'MEDIUM',
  complexityTolerance: 'MEDIUM',
};

const solidObjective: RepertoireTargetObjective = {
  persona: 'SOLID',
  preferredCharacters: ['SOLID', 'POSITIONAL'],
  minimumSoundness: 'SOUND',
  riskTolerance: 'LOW',
  allowDeliberatelyDubious: false,
  maximumTheoryBurden: 'LOW',
  complexityTolerance: 'LOW',
};

const profileObjective: RepertoireTargetObjective = {
  persona: 'AGGRESSIVE',
  preferredCharacters: ['SHARP', 'TACTICAL', 'DYNAMIC'],
  minimumSoundness: 'PLAYABLE',
  riskTolerance: 'HIGH',
  allowDeliberatelyDubious: false,
  maximumTheoryBurden: 'HIGH',
  complexityTolerance: 'HIGH',
};

const surpriseObjective: RepertoireTargetObjective = {
  persona: 'SURPRISE',
  preferredCharacters: ['SURPRISE', 'TACTICAL'],
  minimumSoundness: 'DUBIOUS',
  riskTolerance: 'HIGH',
  allowDeliberatelyDubious: true,
  maximumTheoryBurden: 'LOW',
  complexityTolerance: 'HIGH',
};

const balancedCoverage: RepertoireTargetCoverage = {
  opponentResponseCoveragePercent: 80,
  alwaysCoverPersonalResponseCount: 4,
  minimumPopulationGames: 20,
};

const profileCoverage: RepertoireTargetCoverage = {
  opponentResponseCoveragePercent: 85,
  alwaysCoverPersonalResponseCount: 4,
  minimumPopulationGames: 20,
};

const surpriseCoverage: RepertoireTargetCoverage = {
  opponentResponseCoveragePercent: 70,
  alwaysCoverPersonalResponseCount: null,
  minimumPopulationGames: 10,
};

const newCoursePopulation = resolveRepertoireTargetPopulation(
  { kind: 'MY_PEERS_PLUS_ONE' },
  repertoireTargetPeerResolutionExample,
);

export const newCourseRepertoireTargetExample: RepertoireTarget = {
  contractVersion: '2026-07-v1',
  targetId: '00000000-0000-4000-8000-000000000006',
  side: 'WHITE',
  startingPoint: { kind: 'INITIAL_POSITION' },
  speedPreset: 'BLITZ_AND_SLOWER',
  population: newCoursePopulation,
  accountIds: [1],
  objective: balancedObjective,
  coverage: balancedCoverage,
  defaults: [
    {
      field: 'speedPreset',
      source: { kind: 'SYSTEM_DEFAULT', policyVersion: '2026-07-v1' },
      value: 'BLITZ_AND_SLOWER',
    },
    {
      field: 'population',
      source: { kind: 'PEER_RESOLUTION' },
      value: newCoursePopulation,
    },
    {
      field: 'objective',
      source: { kind: 'PERSONA_PRESET', presetVersion: '2026-07-v1' },
      value: balancedObjective,
    },
    {
      field: 'coverage',
      source: { kind: 'PERSONA_PRESET', presetVersion: '2026-07-v1' },
      value: balancedCoverage,
    },
  ],
  overriddenFields: [],
  createdAt: '2026-07-28T09:00:00.000Z',
  updatedAt: '2026-07-28T09:00:00.000Z',
};

export const existingCourseRepertoireTargetExample: RepertoireTarget = {
  contractVersion: '2026-07-v1',
  targetId: '00000000-0000-4000-8000-000000000007',
  side: 'BLACK',
  startingPoint: { kind: 'COURSE_POSITION', courseId: 21, lineId: 84 },
  speedPreset: 'BLITZ',
  population: resolveRepertoireTargetPopulation({ kind: 'ALL_PLAYERS' }),
  accountIds: [1],
  objective: solidObjective,
  coverage: {
    opponentResponseCoveragePercent: 90,
    alwaysCoverPersonalResponseCount: 4,
    minimumPopulationGames: 30,
  },
  defaults: [],
  overriddenFields: [],
  createdAt: '2026-07-28T09:05:00.000Z',
  updatedAt: '2026-07-28T09:05:00.000Z',
};

const profilePopulation = resolveRepertoireTargetPopulation(
  { kind: 'MY_PEERS' },
  repertoireTargetPeerResolutionExample,
);

const profileSource = {
  kind: 'PLAYER_PROFILE' as const,
  profileContractVersion: '2026-07-v1',
  profileGeneratedAt: '2026-07-28T08:30:00.000Z',
  classificationVersion: '2026-07-rules-v2',
};

export const profileOverrideRepertoireTargetExample: RepertoireTarget = {
  contractVersion: '2026-07-v1',
  targetId: '00000000-0000-4000-8000-000000000008',
  side: 'WHITE',
  startingPoint: {
    kind: 'FEN',
    fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
  },
  speedPreset: 'BLITZ',
  population: resolveRepertoireTargetPopulation({
    kind: 'EXPLICIT_LICHESS_GROUP',
    ratingGroup: 1800,
  }),
  accountIds: [1],
  objective: solidObjective,
  coverage: profileCoverage,
  defaults: [
    {
      field: 'speedPreset',
      source: profileSource,
      value: 'BLITZ_AND_SLOWER',
    },
    {
      field: 'population',
      source: { kind: 'PEER_RESOLUTION' },
      value: profilePopulation,
    },
    {
      field: 'objective',
      source: profileSource,
      value: profileObjective,
    },
    {
      field: 'coverage',
      source: profileSource,
      value: profileCoverage,
    },
  ],
  overriddenFields: ['speedPreset', 'population', 'objective'],
  createdAt: '2026-07-28T09:10:00.000Z',
  updatedAt: '2026-07-28T09:15:00.000Z',
};

export const alternatePersonaRepertoireTargetExample: RepertoireTarget = {
  contractVersion: '2026-07-v1',
  targetId: '00000000-0000-4000-8000-000000000009',
  side: 'WHITE',
  startingPoint: {
    kind: 'FEN',
    fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
  },
  speedPreset: 'BULLET',
  population: resolveRepertoireTargetPopulation({
    kind: 'EXPLICIT_LICHESS_GROUP',
    ratingGroup: 1800,
  }),
  accountIds: [1],
  objective: surpriseObjective,
  coverage: surpriseCoverage,
  defaults: [
    {
      field: 'speedPreset',
      source: profileSource,
      value: 'BLITZ_AND_SLOWER',
    },
    {
      field: 'population',
      source: { kind: 'PEER_RESOLUTION' },
      value: profilePopulation,
    },
    {
      field: 'objective',
      source: profileSource,
      value: profileObjective,
    },
    {
      field: 'coverage',
      source: profileSource,
      value: profileCoverage,
    },
  ],
  overriddenFields: ['speedPreset', 'population', 'objective', 'coverage'],
  createdAt: '2026-07-28T09:20:00.000Z',
  updatedAt: '2026-07-28T09:25:00.000Z',
};
