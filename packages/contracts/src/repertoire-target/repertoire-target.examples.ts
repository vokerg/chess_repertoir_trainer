import type { RepertoireTarget } from './repertoire-target.schemas';

const base = {
  contractVersion: '2026-07-v1',
  targetId: '00000000-0000-4000-8000-000000000006',
  provider: 'LICHESS',
  accountIds: [1],
  createdAt: '2026-07-28T09:00:00.000Z',
  updatedAt: '2026-07-28T09:00:00.000Z',
} as const;

export const newCourseRepertoireTargetExample: RepertoireTarget = {
  ...base,
  side: 'WHITE',
  startingPoint: { kind: 'INITIAL_POSITION' },
  speedPreset: 'BLITZ_AND_SLOWER',
  population: { kind: 'EXPLICIT_LICHESS_GROUP', ratingGroup: 1600 },
  objective: {
    persona: 'BALANCED',
    preferredCharacters: ['BALANCED', 'DYNAMIC'],
    minimumSoundness: 'PLAYABLE',
    allowDeliberatelyDubious: false,
    maximumTheoryBurden: 'MEDIUM',
    complexityTolerance: 'MEDIUM',
  },
  coverage: {
    opponentResponseCoveragePercent: 80,
    alwaysCoverPersonalResponseCount: 4,
    minimumPopulationGames: 20,
  },
  derivation: { source: 'PERSONA_PRESET', presetVersion: '2026-07-v1' },
  overriddenFields: ['population'],
};

export const existingCourseRepertoireTargetExample: RepertoireTarget = {
  ...base,
  targetId: '00000000-0000-4000-8000-000000000007',
  side: 'BLACK',
  startingPoint: { kind: 'COURSE_POSITION', courseId: 21, lineId: 84 },
  speedPreset: 'BLITZ',
  population: { kind: 'ALL_PLAYERS' },
  objective: {
    persona: 'SOLID',
    preferredCharacters: ['SOLID', 'POSITIONAL'],
    minimumSoundness: 'SOUND',
    allowDeliberatelyDubious: false,
    maximumTheoryBurden: 'LOW',
    complexityTolerance: 'LOW',
  },
  coverage: {
    opponentResponseCoveragePercent: 90,
    alwaysCoverPersonalResponseCount: 4,
    minimumPopulationGames: 30,
  },
  derivation: { source: 'MANUAL' },
  overriddenFields: [],
};

export const alternatePersonaRepertoireTargetExample: RepertoireTarget = {
  ...base,
  targetId: '00000000-0000-4000-8000-000000000008',
  side: 'WHITE',
  startingPoint: { kind: 'FEN', fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2' },
  speedPreset: 'BULLET',
  population: { kind: 'EXPLICIT_LICHESS_GROUP', ratingGroup: 1800 },
  objective: {
    persona: 'SURPRISE',
    preferredCharacters: ['SURPRISE', 'TACTICAL'],
    minimumSoundness: 'DUBIOUS',
    allowDeliberatelyDubious: true,
    maximumTheoryBurden: 'LOW',
    complexityTolerance: 'HIGH',
  },
  coverage: {
    opponentResponseCoveragePercent: 70,
    alwaysCoverPersonalResponseCount: null,
    minimumPopulationGames: 10,
  },
  derivation: {
    source: 'PLAYER_PROFILE',
    profileContractVersion: '2026-07-v1',
    derivedAt: '2026-07-28T08:30:00.000Z',
  },
  overriddenFields: ['speedPreset', 'population', 'objective', 'coverage'],
};
